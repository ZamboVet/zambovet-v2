import { supabase } from '../supabaseClient';

/**
 * Centralized notification service
 * Creates a notification record AND triggers push notification via FCM
 */

export type NotificationType = 'system' | 'appointment' | 'admin' | 'moment' | 'review';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  notificationType?: NotificationType;
  relatedAppointmentId?: number;
  data?: Record<string, any>;
}

/**
 * Send notification to a user (creates DB record + triggers push)
 * This is the ONLY function you should use to notify users
 */
export async function notifyUser(payload: NotificationPayload): Promise<boolean> {
  try {
    const {
      userId,
      title,
      message,
      notificationType = 'system',
      relatedAppointmentId,
      data = {},
    } = payload;

    // 1. Insert into notifications table
    const { error: dbError } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      notification_type: notificationType,
      related_appointment_id: relatedAppointmentId || null,
      is_read: false,
    });

    if (dbError) {
      console.error('Failed to create notification record:', dbError);
      return false;
    }

    // 2. Trigger push notification via existing API endpoint
    try {
      const response = await fetch('/api/send-push-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title,
          message,
          data: {
            ...data,
            notificationType,
            relatedAppointmentId,
          },
          notificationType,
        }),
      });

      if (!response.ok) {
        console.error('Push notification API failed:', await response.text());
        // Don't return false - DB notification was created successfully
      }
    } catch (pushError) {
      console.error('Failed to send push notification:', pushError);
      // Don't return false - DB notification was created successfully
    }

    return true;
  } catch (error) {
    console.error('Error in notifyUser:', error);
    return false;
  }
}

/**
 * Notify multiple users (batch)
 */
export async function notifyUsers(payloads: NotificationPayload[]): Promise<void> {
  await Promise.allSettled(payloads.map(payload => notifyUser(payload)));
}

/**
 * Helper: Get user_id from pet_owner_id
 */
export async function getUserIdFromOwnerId(ownerId: number): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('pet_owner_profiles')
      .select('user_id')
      .eq('id', ownerId)
      .maybeSingle();
    return data?.user_id || null;
  } catch {
    return null;
  }
}

/**
 * Helper: Get user_id from veterinarian_id
 */
export async function getUserIdFromVetId(vetId: number): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('veterinarians')
      .select('user_id')
      .eq('id', vetId)
      .maybeSingle();
    return data?.user_id || null;
  } catch {
    return null;
  }
}

/**
 * Helper: Get all admin user_ids
 */
export async function getAdminUserIds(): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_role', 'admin')
      .eq('is_active', true);
    return (data || []).map((p: any) => p.id);
  } catch {
    return [];
  }
}
