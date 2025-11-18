"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { sendApprovalRequest } from "../../../lib/utils/vetAccessControl";

interface PendingVetBannerProps {
  isPending: boolean;
}

export default function PendingVetBanner({ isPending }: PendingVetBannerProps) {
  const [requesting, setRequesting] = useState(false);

  if (!isPending) return null;

  const handleRequestApproval = async () => {
    setRequesting(true);
    try {
      const result = await sendApprovalRequest();
      if (result.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Request Sent',
          text: 'Your approval request has been sent to the admin. They will review your application shortly.',
          timer: 3000,
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: result.message,
        });
      }
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message || 'Failed to send request',
      });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-800">Account Pending Approval</h3>
          <p className="text-sm text-yellow-700 mt-1">
            Your veterinarian account is currently pending admin approval. You have limited access to the platform. You can only edit your clinic location at this time.
          </p>
          <button
            onClick={handleRequestApproval}
            disabled={requesting}
            className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
          >
            {requesting ? 'Sending...' : 'Request Approval'}
          </button>
        </div>
      </div>
    </div>
  );
}
