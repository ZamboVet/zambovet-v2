import { supabase } from '../supabaseClient';

export interface VetAccessControl {
  isPending: boolean;
  isApproved: boolean;
  canAccessAppointments: boolean;
  canAccessPatients: boolean;
  canAccessReviews: boolean;
  canAccessSettings: boolean;
  canEditClinicLocation: boolean;
  restrictionMessage: string;
}

/**
 * Check veterinarian access level based on verification status
 */
export async function getVetAccessControl(): Promise<VetAccessControl> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        isPending: false,
        isApproved: false,
        canAccessAppointments: false,
        canAccessPatients: false,
        canAccessReviews: false,
        canAccessSettings: false,
        canEditClinicLocation: false,
        restrictionMessage: 'Not authenticated',
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_role,verification_status')
      .eq('id', user.id)
      .maybeSingle();

    const role = (profile as any)?.user_role || null;
    if (role !== 'veterinarian') {
      return {
        isPending: false,
        isApproved: false,
        canAccessAppointments: false,
        canAccessPatients: false,
        canAccessReviews: false,
        canAccessSettings: false,
        canEditClinicLocation: false,
        restrictionMessage: 'Veterinarian account required',
      };
    }

    const status = (profile as any)?.verification_status || 'pending';
    const isPending = status === 'pending';
    const isApproved = status === 'approved';

    return {
      isPending,
      isApproved,
      canAccessAppointments: isApproved,
      canAccessPatients: isApproved,
      canAccessReviews: isApproved,
      canAccessSettings: isApproved,
      canEditClinicLocation: true, // Always allow editing clinic location
      restrictionMessage: isPending
        ? 'Your account is pending approval. You can only edit your clinic location.'
        : '',
    };
  } catch (err) {
    console.error('Error checking vet access control:', err);
    return {
      isPending: false,
      isApproved: false,
      canAccessAppointments: false,
      canAccessPatients: false,
      canAccessReviews: false,
      canAccessSettings: false,
      canEditClinicLocation: false,
      restrictionMessage: 'Error checking access level',
    };
  }
}

/**
 * Send approval request notification to admin
 */
export async function sendApprovalRequest(): Promise<{ success: boolean; message: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'Not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    // Create notification for admins
    const { error } = await supabase
      .from('notifications')
      .insert({
        notification_type: 'approval_request',
        user_id: user.id,
        title: 'Veterinarian Approval Request',
        message: `${profile?.full_name || 'A veterinarian'} (${profile?.email}) has requested approval for their account.`,
      });

    if (error) throw error;

    return { success: true, message: 'Approval request sent to admin' };
  } catch (err: any) {
    console.error('Error sending approval request:', err);
    return { success: false, message: err?.message || 'Failed to send request' };
  }
}
