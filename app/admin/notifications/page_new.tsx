"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { CheckCircleIcon, XCircleIcon, BellIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { getNotifications, approveVeterinarian, rejectVeterinarian, getVetProfile } from "../../../lib/utils/adminNotifications";
import { supabase } from "../../../lib/supabaseClient";

interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  created_at: string;
}

interface VetProfile {
  id: string;
  full_name: string;
  email: string;
  verification_status: string;
}

const PRIMARY = "#2563eb";

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [vetProfiles, setVetProfiles] = useState<Record<string, VetProfile>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load notifications
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const allData = await getNotifications();
      // Filter for approval requests only
      const approvalNotifications = allData.filter(
        (notif: Notification) => notif.title === 'Veterinarian Approval Request'
      );
      setNotifications(approvalNotifications);

      // Load vet profiles for each notification
      const profiles: Record<string, VetProfile> = {};
      for (const notif of approvalNotifications) {
        const profile = await getVetProfile(notif.user_id);
        if (profile) {
          profiles[notif.user_id] = profile;
        }
      }
      setVetProfiles(profiles);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, []);

  // Subscribe to real-time notifications
  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: any) => {
          console.log('New notification received:', payload);
          // Reload notifications when a new one is inserted
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (userId: string, vetName: string) => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Approve Veterinarian?',
      text: `Approve ${vetName} as a veterinarian?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, Approve',
      confirmButtonColor: '#10b981',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    setActionLoading(userId);
    try {
      const response = await approveVeterinarian(userId);
      if (response.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Approved',
          text: `${vetName} has been approved as a veterinarian`,
          timer: 2000,
        });
        loadNotifications();
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: response.message,
        });
      }
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message || 'Failed to approve',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string, vetName: string) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Reject Veterinarian?',
      text: `Are you sure you want to reject ${vetName}?`,
      input: 'textarea',
      inputPlaceholder: 'Optional: Enter reason for rejection',
      showCancelButton: true,
      confirmButtonText: 'Yes, Reject',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    setActionLoading(userId);
    try {
      const response = await rejectVeterinarian(userId, result.value);
      if (response.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Rejected',
          text: `${vetName} has been rejected`,
          timer: 2000,
        });
        loadNotifications();
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: response.message,
        });
      }
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message || 'Failed to reject',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BellIcon className="w-8 h-8" style={{ color: PRIMARY }} />
            Approval Requests
          </h1>
          <p className="text-gray-600 mt-1">Manage veterinarian approval requests</p>
        </div>
        <button
          onClick={loadNotifications}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <BellIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-lg">No approval requests</p>
          <p className="text-gray-500 text-sm mt-1">All veterinarians have been reviewed</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {notifications.map((notif) => {
            const profile = vetProfiles[notif.user_id];
            return (
              <div
                key={notif.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden border-l-4"
                style={{ borderLeftColor: PRIMARY }}
              >
                <div className="p-6">
                  {/* Title and Date */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{notif.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{formatDate(notif.created_at)}</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                      Pending
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-gray-700 mb-4">{notif.message}</p>

                  {/* Vet Profile Info */}
                  {profile && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">Name:</span>
                        <span className="text-gray-900">{profile.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <EnvelopeIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600 font-medium">Email:</span>
                        <a href={`mailto:${profile.email}`} className="text-blue-600 hover:underline">
                          {profile.email}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">Status:</span>
                        <span className="text-yellow-600 font-medium capitalize">{profile.verification_status}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(notif.user_id, profile?.full_name || 'Veterinarian')}
                      disabled={actionLoading === notif.user_id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      {actionLoading === notif.user_id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(notif.user_id, profile?.full_name || 'Veterinarian')}
                      disabled={actionLoading === notif.user_id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      <XCircleIcon className="w-5 h-5" />
                      {actionLoading === notif.user_id ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
