import { useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { registerDeviceToken, detectPlatform, updateTokenLastUsed } from '../services/pushNotificationService';

/**
 * Hook to initialize push notifications
 * Registers device token and sets up listeners
 */
export function usePushNotifications() {
  const initializePushNotifications = useCallback(async () => {
    try {
      // Get current user
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user?.id) {
        console.log('No authenticated user for push notifications');
        return;
      }

      const userId = auth.user.id;
      const platform = detectPlatform();

      // Check if running in Capacitor (native app)
      if (typeof (window as any).Capacitor !== 'undefined') {
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');

          // Request permissions
          const permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'prompt') {
            await PushNotifications.requestPermissions();
          }

          // Listen for token registration
          PushNotifications.addListener('registration', (token: any) => {
            console.log('🔔 Push notification token received:', token.value);
            console.log('🔔 Platform:', platform);
            console.log('🔔 User ID:', userId);
            if (token.value) {
              registerDeviceToken(userId, token.value, platform).then(() => {
                console.log('✅ Token registered successfully');
              }).catch(err => {
                console.error('❌ Failed to register token:', err);
              });
            }
          });

          // Listen for push notifications
          PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
            console.log('Push notification received:', notification);
            // Handle notification in foreground
            handleNotificationReceived(notification);
          });

          PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
            console.log('Push notification action performed:', notification);
            // Handle notification tap
            handleNotificationTapped(notification);
          });

          // Register for push notifications
          await PushNotifications.register();
        } catch (err) {
          console.log('Capacitor push notifications not available:', err);
          // Fallback to web push if available
          initializeWebPush(userId);
        }
      } else {
        // Web push notification
        initializeWebPush(userId);
      }
    } catch (err) {
      console.error('Error initializing push notifications:', err);
    }
  }, []);

  useEffect(() => {
    initializePushNotifications();
  }, [initializePushNotifications]);

  return { initializePushNotifications };
}

/**
 * Initialize web push notifications
 */
async function initializeWebPush(userId: string) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Web push not supported');
      return;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service worker registered:', registration);

    // Request notification permission
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return;
      }
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    if (subscription) {
      const token = JSON.stringify(subscription);
      await registerDeviceToken(userId, token, 'web');
      console.log('Web push subscription registered');
    }
  } catch (err) {
    console.log('Web push initialization failed:', err);
  }
}

/**
 * Handle push notification received in foreground
 */
function handleNotificationReceived(notification: any) {
  const { title, body, data } = notification.notification;

  // Show notification in foreground
  if (Notification.permission === 'granted') {
    new Notification(title || 'Notification', {
      body: body || '',
      icon: '/icon-192x192.png',
      data,
    });
  }

  // Update token last used
  if (notification.notification.data?.token) {
    updateTokenLastUsed(notification.notification.data.token);
  }
}

/**
 * Handle push notification tap
 */
function handleNotificationTapped(notification: any) {
  const { data } = notification.notification;

  // Navigate based on notification data
  if (data?.appointmentId) {
    window.location.href = `/veterinarian/consultations/${data.appointmentId}`;
  } else if (data?.postId) {
    window.location.href = `/pet_owner/moments/${data.postId}`;
  }

  // Update token last used
  if (data?.token) {
    updateTokenLastUsed(data.token);
  }
}
