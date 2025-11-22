import { supabase } from '../supabaseClient';

/**
 * Push Notification Service
 * Handles device token registration and push notification operations
 */

export interface DeviceToken {
  id: number;
  user_id: string;
  token: string;
  platform: 'android' | 'ios' | 'web';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

/**
 * Register or update device token for push notifications
 */
export async function registerDeviceToken(
  userId: string,
  token: string,
  platform: 'android' | 'ios' | 'web'
): Promise<DeviceToken | null> {
  try {
    const { data, error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token,platform' }
      )
      .select()
      .single();

    if (error) {
      console.error('Failed to register device token:', error);
      return null;
    }

    return data as DeviceToken;
  } catch (err) {
    console.error('Error registering device token:', err);
    return null;
  }
}

/**
 * Get all active device tokens for a user
 */
export async function getUserDeviceTokens(userId: string): Promise<DeviceToken[]> {
  try {
    const { data, error } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to fetch device tokens:', error);
      return [];
    }

    return (data || []) as DeviceToken[];
  } catch (err) {
    console.error('Error fetching device tokens:', err);
    return [];
  }
}

/**
 * Deactivate a device token
 */
export async function deactivateDeviceToken(tokenId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('device_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', tokenId);

    if (error) {
      console.error('Failed to deactivate device token:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error deactivating device token:', err);
    return false;
  }
}

/**
 * Update last used timestamp for a device token
 */
export async function updateTokenLastUsed(token: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('device_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token', token);

    if (error) {
      console.error('Failed to update token last used:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error updating token last used:', err);
    return false;
  }
}

/**
 * Send push notification to a user via backend
 * This should be called from a server-side API endpoint
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<boolean> {
  try {
    // This would typically call a backend API endpoint that handles FCM/APNs
    // For now, we'll just log it - implement based on your backend setup
    console.log('Push notification queued:', { userId, title, message, data });
    
    // Example: Call your backend API
    // const response = await fetch('/api/send-push-notification', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId, title, message, data })
    // });
    // return response.ok;

    return true;
  } catch (err) {
    console.error('Error sending push notification:', err);
    return false;
  }
}

/**
 * Detect platform (android, ios, or web)
 */
export function detectPlatform(): 'android' | 'ios' | 'web' {
  if (typeof window === 'undefined') return 'web';
  
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios';
  
  return 'web';
}
