"use client";

import { XMarkIcon, HeartIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef } from "react";

export type ViewPetModalProps = {
  open: boolean;
  pet: {
    id: number;
    name: string;
    species: string;
    breed: string | null;
    gender?: string | null;
    date_of_birth: string | null;
    weight?: number | null;
    profile_picture_url: string | null;
  } | null;
  onClose: () => void;
};

function fmtWeight(w?: number | null) {
  if (w == null) return "—";
  const n = Number(w);
  return Number.isFinite(n) ? `${n} kg` : "—";
}

function ageFrom(dob: string | null) {
  if (!dob) return "—";
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
  if (years === 0 && months === 0) {
    const d = Math.max(days, 0);
    parts.push(`${d} day${d !== 1 ? 's' : ''}`);
  }
  return parts.join(", ") || "0 days";
}

export default function ViewPetModal({ open, pet, onClose }: ViewPetModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const root = modalRef.current;
    if (!root) return;
    const selectors = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getNodes = () => Array.from(root.querySelectorAll<HTMLElement>(selectors)).filter(el => !el.hasAttribute('disabled'));
    const nodes = getNodes();
    nodes[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = getNodes();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
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
  }, [open]);
  if (!open || !pet) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={modalRef} className="relative w-full max-w-2xl mx-4 rounded-3xl overflow-hidden" role="dialog" aria-modal="true">
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 opacity-80" />
        <div className="relative rounded-3xl bg-white">
          <div className="px-6 pt-6 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white grid place-items-center">
                <HeartIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">Pet Details</div>
                <div className="text-xs text-neutral-500">View full profile</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100" aria-label="Close">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center justify-center">
                {pet.profile_picture_url ? (
                  <img src={pet.profile_picture_url} alt={pet.name} className="w-full max-w-xs aspect-square object-cover rounded-2xl border" />
                ) : (
                  <div className="w-full max-w-xs aspect-square rounded-2xl border grid place-items-center text-neutral-400">No photo</div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-1 text-xs">{pet.species}</span>
                  {pet.breed && (
                    <span className="inline-flex items-center rounded-full bg-purple-50 text-purple-700 px-2 py-1 text-xs">{pet.breed}</span>
                  )}
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Name</div>
                  <div className="font-semibold">{pet.name}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-neutral-500">Species</div>
                    <div className="font-medium">{pet.species}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500">Breed</div>
                    <div className="font-medium">{pet.breed || "—"}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-neutral-500">Gender</div>
                    <div className="font-medium capitalize">{pet.gender || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500">Weight</div>
                    <div className="font-medium">{fmtWeight(pet.weight as any)}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Date of Birth</div>
                  <div className="font-medium">{pet.date_of_birth || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Age</div>
                  <div className="font-medium">{ageFrom(pet.date_of_birth)}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">ID</div>
                  <div className="font-medium">#{pet.id}</div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end">
              <button onClick={onClose} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
