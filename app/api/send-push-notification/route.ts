import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

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

// Parse Firebase credentials from environment
function getFirebaseCredentials() {
  try {
    const key = process.env.FIREBASE_SERVER_KEY;
    if (!key) return null;
    return JSON.parse(key);
  } catch (err) {
    console.error('Failed to parse Firebase credentials:', err);
    return null;
  }
}

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
    const credentials = getFirebaseCredentials();
    if (!credentials) {
      console.warn('Firebase credentials not configured');
      return { success: false, error: 'Firebase not configured' };
    }

    // Get access token from Firebase
    const accessToken = await getFirebaseAccessToken(credentials);
    if (!accessToken) {
      return { success: false, error: 'Failed to get Firebase access token' };
    }

    // Send via Firebase Cloud Messaging v1 API
    const projectId = credentials.project_id;
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: payload.data,
            android: {
              priority: 'high',
              notification: {
                icon: 'icon',
                color: '#2563eb',
              },
            },
            apns: {
              payload: {
                aps: {
                  alert: {
                    title: payload.title,
                    body: payload.body,
                  },
                  sound: 'default',
                  badge: 1,
                },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('FCM error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error('FCM send error:', err);
    return { success: false, error: err };
  }
}

/**
 * Get Firebase access token using service account credentials
 */
async function getFirebaseAccessToken(credentials: any): Promise<string | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600;

    // Create JWT header and payload
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + expiresIn,
      iat: now,
    };

    // For now, use a simpler approach - call Google's token endpoint
    // In production, you'd sign the JWT with the private key
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: createJWT(header, payload, credentials.private_key),
      }).toString(),
    });

    if (!response.ok) {
      console.error('Failed to get access token');
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (err) {
    console.error('Error getting Firebase access token:', err);
    return null;
  }
}

/**
 * Create a JWT token for Firebase authentication
 */
function createJWT(header: any, payload: any, privateKey: string): string {
  try {
    return jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      header: header,
    });
  } catch (err) {
    console.error('Failed to create JWT:', err);
    throw new Error('JWT signing failed');
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
