"use client";

import { useEffect, useState } from "react";
import { formatRemainingTime } from "../hooks/useSessionTimeout";

interface SessionTimeoutWarningProps {
  isVisible: boolean;
  remainingTime: number;
  onExtend: () => void;
  onLogout: () => void;
}

export default function SessionTimeoutWarning({
  isVisible,
  remainingTime,
  onExtend,
  onLogout,
}: SessionTimeoutWarningProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Session Timeout Warning</h2>
              <p className="text-sm text-white/80">Your session is about to expire</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-5">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 mb-4">
              <span className="text-3xl font-bold text-amber-600">
                {formatRemainingTime(remainingTime)}
              </span>
            </div>
            <p className="text-neutral-700">
              Due to inactivity, you will be automatically logged out in{" "}
              <span className="font-semibold text-amber-600">{formatRemainingTime(remainingTime)}</span>.
            </p>
            <p className="text-sm text-neutral-500 mt-2">
              Click "Stay Logged In" to continue your session.
            </p>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-neutral-100 rounded-full overflow-hidden mb-6">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000 ease-linear"
              style={{ width: `${Math.max(0, (remainingTime / (5 * 60 * 1000)) * 100)}%` }}
            />
          </div>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onLogout}
              className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 font-medium hover:bg-neutral-200 transition active:scale-95"
            >
              Log Out Now
            </button>
            <button
              onClick={onExtend}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-500/25"
            >
              Stay Logged In
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-100">
          <p className="text-xs text-neutral-500 text-center">
            For your security, sessions expire after 30 minutes of inactivity.
          </p>
        </div>
      </div>
    </div>
  );
}
