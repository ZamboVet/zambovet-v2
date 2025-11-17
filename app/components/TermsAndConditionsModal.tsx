"use client";

import { useEffect, useRef } from "react";
import { XMarkIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

export type TermsAndConditionsModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function TermsAndConditionsModal({ open, onClose }: TermsAndConditionsModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={modalRef} className="relative w-full max-w-4xl mx-4 rounded-3xl overflow-hidden max-h-[90vh]" role="dialog" aria-modal="true">
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-blue-400 via-indigo-500 to-blue-600 opacity-80" />
        <div className="relative rounded-3xl bg-white flex flex-col max-h-[90vh]">
          <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white grid place-items-center">
                <DocumentTextIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">Terms & Conditions</div>
                <div className="text-xs text-neutral-500">Please read carefully</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100" aria-label="Close">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-6 overflow-y-auto flex-1">
            <div className="prose prose-sm max-w-none">
              <h2 className="text-xl font-bold mb-4" style={{ color: "#0032A0" }}>Terms and Conditions</h2>
              <p className="text-sm text-neutral-600 mb-4">Last updated: {new Date().toLocaleDateString()}</p>

              <section className="mb-6">
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#0032A0" }}>1. Acceptance of Terms</h3>
                <p className="text-sm text-neutral-700 mb-2">
                  By accessing and using ZamboVet, you accept and agree to be bound by the terms and provision of this agreement.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#0032A0" }}>2. Use License</h3>
                <p className="text-sm text-neutral-700 mb-2">
                  Permission is granted to temporarily use ZamboVet for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc pl-6 text-sm text-neutral-700 mb-2 space-y-1">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for any commercial purpose or for any public display</li>
                  <li>Attempt to reverse engineer any software contained on ZamboVet</li>
                  <li>Remove any copyright or other proprietary notations from the materials</li>
                </ul>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#0032A0" }}>3. User Accounts</h3>
                <p className="text-sm text-neutral-700 mb-2">
                  When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for all activities that occur under your account.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#0032A0" }}>4. Veterinary Services</h3>
                <p className="text-sm text-neutral-700 mb-2">
                  ZamboVet facilitates connections between pet owners and veterinarians. We do not provide veterinary services directly. All veterinary services are provided by licensed veterinarians who are independent contractors.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#0032A0" }}>5. Appointments and Cancellations</h3>
                <p className="text-sm text-neutral-700 mb-2">
                  Appointments are subject to availability and confirmation by the veterinarian. Cancellation policies may vary by clinic. Please review individual clinic policies before booking.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#0032A0" }}>6. Privacy Policy</h3>
                <p className="text-sm text-neutral-700 mb-2">
                  Your use of ZamboVet is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices regarding your personal information.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#0032A0" }}>7. Limitation of Liability</h3>
                <p className="text-sm text-neutral-700 mb-2">
                  In no event shall ZamboVet or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use ZamboVet.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#0032A0" }}>8. Accuracy of Materials</h3>
                <p className="text-sm text-neutral-700 mb-2">
                  The materials appearing on ZamboVet could include technical, typographical, or photographic errors. ZamboVet does not warrant that any of the materials on its website are accurate, complete, or current.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#0032A0" }}>9. Modifications</h3>
                <p className="text-sm text-neutral-700 mb-2">
                  ZamboVet may revise these terms of service at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#0032A0" }}>10. Contact Information</h3>
                <p className="text-sm text-neutral-700 mb-2">
                  If you have any questions about these Terms and Conditions, please contact us at vetzambo@gmail.com.
                </p>
              </section>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-neutral-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: "#0032A0" }}
            >
              I Understand
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

