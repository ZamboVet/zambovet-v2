"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { ChevronRightIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

type Props = { onMenu: () => void; primary: string };

const titleMap: Record<string, string> = {
  "/veterinarian": "Dashboard",
  "/veterinarian/appointments": "Appointments",
  "/veterinarian/patients": "Patients",
  "/veterinarian/earnings": "Earnings",
  "/veterinarian/settings": "Settings",
};

export default function HeaderBar({ onMenu, primary }: Props) {
  const pathname = usePathname();
  const segs = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [];
  let path = "";
  segs.forEach((s) => {
    path += `/${s}`;
    crumbs.push({ href: path, label: titleMap[path] || s.charAt(0).toUpperCase() + s.slice(1) });
  });

  const logout = async () => {
    const res = await Swal.fire({ icon: "question", title: "Sign out?", showCancelButton: true, confirmButtonText: "Sign out" });
    if (!res.isConfirmed) return;
    const { error } = await supabase.auth.signOut({ scope: "global" as any });
    if (error) {
      await Swal.fire({ icon: "error", title: "Failed", text: error.message });
      return;
    }
    try {
      localStorage.removeItem('po_avatar_url');
      localStorage.removeItem('po_sidebar_collapsed');
      localStorage.removeItem('vet_sidebar_collapsed');
      localStorage.removeItem('ownerNotif');
      try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (k.startsWith('sb-') || k.startsWith('supabase')) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
      } catch {}
      try { sessionStorage.clear(); } catch {}
    } catch {}
    await Swal.fire({ icon: "success", title: "Signed out" });
    window.location.href = "/login";
  };

  return (
    <div className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenu} className="lg:hidden px-3 py-2 rounded-xl border bg-white text-sm">Menu</button>
        <nav className="flex items-center text-sm text-gray-500 gap-1 truncate">
          {crumbs.map((c, i) => (
            <div key={c.href} className="flex items-center gap-1 truncate">
              {i>0 && <ChevronRightIcon className="w-4 h-4" />}
              {i < crumbs.length-1 ? (
                <Link href={c.href} className="hover:underline truncate">{c.label}</Link>
              ) : (
                <span className="font-medium truncate" style={{ color: primary }}>{c.label}</span>
              )}
            </div>
          ))}
        </nav>
      </div>
      <button onClick={logout} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white text-sm">
        <ArrowRightOnRectangleIcon className="w-4 h-4" /> Logout
      </button>
    </div>
  );
}
