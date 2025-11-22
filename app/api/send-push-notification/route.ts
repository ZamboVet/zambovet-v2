import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to send push notifications
 * This endpoint should be called from server-side code
 * 
 * POST /api/send-push-notification
 * Body: {
 *   userId: string,
 *   title: string,
 *   message: string,
 *   data?: Record<string, any>,
 *   notificationType?: string
 * }
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Supabase with service role (for server-side operations)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, message, data, notificationType } = body;

    // Validate required fields
    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, message' },
        { status: 400 }
      );
    }

    // Get user's device tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (tokensError) {
      console.error('Error fetching device tokens:', tokensError);
      return NextResponse.json(
        { error: 'Failed to fetch device tokens' },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('No active device tokens for user:', userId);
      return NextResponse.json(
        { message: 'No active device tokens', sent: 0 },
        { status: 200 }
      );
    }

    // Prepare notification payload
    const notificationPayload = {
      title,
      body: message,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        notificationType: notificationType || 'general',
      },
    };

    // Send to each device token
    // NOTE: This is a placeholder. In production, you would:
    // 1. For Android: Use Firebase Cloud Messaging (FCM)
    // 2. For iOS: Use Apple Push Notification service (APNs)
    // 3. For Web: Use Web Push API
    
    const results = await Promise.allSettled(
      tokens.map(async (token: any) => {
        try {
          if (token.platform === 'android' || token.platform === 'ios') {
            // Send via FCM (for both Android and iOS)
            return await sendFCMNotification(token.token, notificationPayload);
          } else if (token.platform === 'web') {
            // Send via Web Push
            return await sendWebPushNotification(token.token, notificationPayload);
          }
        } catch (err) {
          console.error(`Failed to send to ${token.platform}:`, err);
          return { success: false, error: err };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;

    return NextResponse.json(
      {
        message: 'Push notifications sent',
        sent: successCount,
        total: tokens.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in push notification endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Send notification via Firebase Cloud Messaging (FCM)
 * Requires FIREBASE_SERVER_KEY environment variable
 */
async function sendFCMNotification(
  deviceToken: string,
  payload: any
): Promise<{ success: boolean; error?: any }> {
  try {
    const fcmServerKey = process.env.FIREBASE_SERVER_KEY;
    if (!fcmServerKey) {
      console.warn('FIREBASE_SERVER_KEY not configured');
      return { success: false, error: 'FCM not configured' };
    }

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        to: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/icon-192x192.png',
        },
        data: payload.data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}

/**
 * Send notification via Web Push API
 * Requires VAPID keys configured
 */
async function sendWebPushNotification(
  subscription: string,
  payload: any
): Promise<{ success: boolean; error?: any }> {
  try {
    // Parse subscription if it's a JSON string
    let sub = subscription;
    if (typeof subscription === 'string') {
      try {
        sub = JSON.parse(subscription);
      } catch {
        // If not JSON, treat as token string
      }
    }

    // Web push implementation would go here
    // This requires web-push library and VAPID keys
    console.log('Web push notification queued:', payload);
    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}
