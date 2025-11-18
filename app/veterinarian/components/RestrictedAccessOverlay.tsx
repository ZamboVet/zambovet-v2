"use client";

import { LockClosedIcon } from "@heroicons/react/24/outline";

interface RestrictedAccessOverlayProps {
  isRestricted: boolean;
  children: React.ReactNode;
  message?: string;
}

export default function RestrictedAccessOverlay({
  isRestricted,
  children,
  message = "This section is not available for pending accounts",
}: RestrictedAccessOverlayProps) {
  if (!isRestricted) return <>{children}</>;

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg backdrop-blur-sm">
        <div className="bg-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-gray-700 font-medium">
          <LockClosedIcon className="w-5 h-5 text-red-600" />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
}
