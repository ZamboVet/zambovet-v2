import { supabase } from '../supabaseClient';

export interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  created_at: string;
  vet_name?: string;
  vet_email?: string;
}

/**
 * Get all notifications
 */
export async function getNotifications(): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      console.log('Error details:', error?.message, error?.stack);
      throw error;
    }
    return (data || []) as Notification[];
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return [];
  }
}

/**
 * Get approval request notifications
 */
export function getApprovalNotifications(notifications: Notification[]): Notification[] {
  return notifications.filter(notification => notification.title === 'Veterinarian Approval Request');
}

/**
 * Approve a veterinarian
 */
export async function approveVeterinarian(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ verification_status: 'approved' })
      .eq('id', userId);

    if (error) {
      console.error('Error approving veterinarian:', error);
      console.log('Error details:', error?.message, error?.stack);
      throw error;
    }

    return { success: true, message: 'Veterinarian approved successfully' };
  } catch (err: any) {
    console.error('Error approving veterinarian:', err);
    console.log('Error details:', err?.message, err?.stack);
    return { success: false, message: err?.message || 'Failed to approve' };
  }
}

/**
 * Reject a veterinarian
 */
export async function rejectVeterinarian(userId: string, reason?: string): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ verification_status: 'rejected' })
      .eq('id', userId);

    if (error) throw error;

    return { success: true, message: 'Veterinarian rejected' };
  } catch (err: any) {
    console.error('Error rejecting veterinarian:', err);
    return { success: false, message: err?.message || 'Failed to reject' };
  }
}

/**
 * Get vet profile details
 */
export async function getVetProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, verification_status')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching vet profile:', err);
    return null;
  }
}
