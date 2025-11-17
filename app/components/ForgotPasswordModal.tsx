"use client";

import { useEffect, useRef, useState } from "react";
import { XMarkIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../lib/supabaseClient";
import Swal from "sweetalert2";
import { getSiteUrl } from "../../lib/utils/site";

const SITE_URL = getSiteUrl();

export type ForgotPasswordModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function ForgotPasswordModal({ open, onClose }: ForgotPasswordModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setEmail("");
      setError(null);
      setSent(false);
    }
  }, [open]);

  // Focus trap + ESC
  useEffect(() => {
    if (!open) return;
    const root = modalRef.current;
    if (!root) return;
    const sel = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(sel)).filter(el => !el.hasAttribute('disabled'));
    nodes[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const f = Array.from(root.querySelectorAll<HTMLElement>(sel)).filter(el => !el.hasAttribute('disabled'));
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${SITE_URL}/reset-password`,
      });

      if (resetError) {
        // Don't reveal if email exists or not for security
        if (resetError.message?.includes('rate limit') || resetError.message?.includes('too many')) {
          setError("Too many requests. Please wait a few minutes and try again.");
        } else {
          // Generic message for security
          setError("If an account exists with this email, a password reset link has been sent.");
        }
        throw resetError;
      }

      setSent(true);
      await Swal.fire({
        icon: 'success',
        title: 'Reset link sent',
        text: 'Please check your email for the password reset link. It may take a few minutes to arrive.',
        confirmButtonColor: '#0032A0',
      });
    } catch (err: any) {
      // Error already handled above
      console.error('Password reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={modalRef} className="relative w-full max-w-md mx-4 rounded-3xl overflow-hidden" role="dialog" aria-modal="true">
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-blue-400 via-indigo-500 to-blue-600 opacity-80" />
        <div className="relative rounded-3xl bg-white">
          <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white grid place-items-center">
                <EnvelopeIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">Reset Password</div>
                <div className="text-xs text-neutral-500">Enter your email to receive a reset link</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100" aria-label="Close">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6">
            {sent ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Check your email!</strong> We've sent a password reset link to <strong>{email}</strong>.
                  </p>
                  <p className="text-xs text-green-700 mt-2">
                    Click the link in the email to reset your password. The link will expire in 1 hour.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 rounded-lg font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false);
                      setEmail("");
                    }}
                    className="flex-1 px-4 py-2 rounded-lg font-semibold text-white"
                    style={{ backgroundColor: "#0032A0" }}
                  >
                    Send Another
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#0032A0" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none"
                    style={{ borderColor: "#b3c7e6" }}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 rounded-lg font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 rounded-lg font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#0032A0" }}
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>

                <p className="text-xs text-neutral-500 text-center">
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-blue-700 hover:underline font-medium"
                    style={{ color: "#0032A0" }}
                  >
                    Sign in
                  </button>
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

