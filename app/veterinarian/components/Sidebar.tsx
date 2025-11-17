"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { CalendarDaysIcon, Cog6ToothIcon, HomeIcon, UserGroupIcon, StarIcon, BellIcon } from "@heroicons/react/24/outline";

type Props = { open: boolean; onClose: () => void; primary: string };

type NavItem = { label: string; sub: string; href: string; icon: any };
const nav: NavItem[] = [
  { label: "Dashboard Overview", sub: "View performance metrics", href: "/veterinarian", icon: HomeIcon },
  { label: "Appointment Management", sub: "Manage patient appointments", href: "/veterinarian/appointments", icon: CalendarDaysIcon },
  { label: "Patient Records", sub: "Access medical records", href: "/veterinarian/patients", icon: UserGroupIcon },
  { label: "Daily Records", sub: "Diary entries by date", href: "/veterinarian/patients/daily", icon: CalendarDaysIcon },
  { label: "Clinic Location", sub: "Set map coordinates", href: "/veterinarian/clinic/location", icon: CalendarDaysIcon },
  { label: "Notifications", sub: "Latest updates", href: "/veterinarian/notifications", icon: BellIcon },
  { label: "Professional Profile", sub: "Update your credentials", href: "/veterinarian/settings", icon: Cog6ToothIcon },
  { label: "Patient Reviews", sub: "View patient feedback", href: "/veterinarian/reviews", icon: StarIcon },
];

export default function Sidebar({ open, onClose, primary }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const s = localStorage.getItem("vet_sidebar_collapsed");
    if (s) setCollapsed(s === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("vet_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (!uid) return;
        const { data: p } = await supabase.from("profiles").select("full_name,email").eq("id", uid).maybeSingle();
        setFullName((p as any)?.full_name || null);
        setEmail((p as any)?.email || null);
      } catch {}
    })();
  }, []);

  const logout = async () => {
    const res = await Swal.fire({ icon: "question", title: "Sign out?", showCancelButton: true, confirmButtonText: "Sign out" });
    if (!res.isConfirmed) return;
    const { error } = await supabase.auth.signOut({ scope: "global" as any });
    if (error) {
      await Swal.fire({ icon: "error", title: "Failed", text: error.message });
      return;
    }
    try {
      // Clear app-specific keys
      localStorage.removeItem('po_avatar_url');
      localStorage.removeItem('po_sidebar_collapsed');
      localStorage.removeItem('vet_sidebar_collapsed');
      localStorage.removeItem('ownerNotif');
      // Clear Supabase auth keys
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
    <div className={`fixed inset-y-0 left-0 z-40 ${collapsed ? "w-20" : "w-72"} transform transition-transform ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 text-white shadow-2xl`}>
      <div className="absolute inset-0 -z-10">
        <div className="w-full h-full bg-[radial-gradient(120%_90%_at_0%_0%,#1d4ed8_0%,#0b3fb8_35%,#0032A0_70%,#001b6b_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_55%)]" />
      </div>
      <div className="h-16 flex items-center justify-between px-3">
        <span className={`text-lg font-semibold tracking-wide ${collapsed ? "sr-only" : "block"}`}>Vet Panel</span>
        <button onClick={() => setCollapsed(v => !v)} className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/80 text-[#0032A0] hover:bg-white active:scale-[.98] transition text-sm">{collapsed ? "»" : "«"}</button>
      </div>
      <div className={`px-4 pt-2 pb-3 text-[11px] uppercase tracking-wide text-white/70 ${collapsed ? "sr-only" : "block"}`}>Main Navigation</div>
      <nav className="px-3 py-1 space-y-2">
        {nav.map(item => {
          const active = pathname === item.href;
          const Cls = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? `${item.label}\n${item.sub}` : undefined}
              onClick={() => { try { onClose(); } catch {} }}
              className={`group relative flex items-center ${collapsed ? "justify-center" : "gap-3 px-3"} ${collapsed ? "py-2" : "py-2.5"} rounded-2xl transition ${active ? "bg-white/15 ring-1 ring-white/20" : "hover:bg-white/10 ring-1 ring-white/0 hover:ring-white/10"}`}
            >
              {active && !collapsed && <span className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-white" />}
              <div className={`grid place-items-center rounded-xl ${active ? "bg-white text-[#0032A0] shadow" : "bg-white/20 text-white"} ${collapsed ? "w-9 h-9" : "w-10 h-10"}`}>
                <Cls className="w-5 h-5" />
              </div>
              {!collapsed && (
                <div className="min-w-0 leading-tight">
                  <div className={`text-[15px] font-semibold ${active ? "text-white" : "text-white"}`}>{item.label}</div>
                  <div className="text-[12px] text-white/70">{item.sub}</div>
                </div>
              )}
              {collapsed && (
                <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded-lg bg-white/90 text-[#0032A0] px-2 py-1 text-xs shadow opacity-0 group-hover:opacity-100">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-[#0032A0]/70"> • {item.sub}</span>
                </span>
              )}
            </Link>
          );
        })}
        <div className="my-3 mx-2 h-px bg-white/10" />
      </nav>
      {!collapsed && (
        <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-white/15 ring-1 ring-white/20 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white text-[#0032A0] grid place-items-center font-semibold">
            {(fullName || email || "?").slice(0,1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{fullName || "Veterinarian"}</div>
            <div className="text-[11px] text-white/70 truncate">{email || ""}</div>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded-full">Online</span>
        </div>
      )}
      <button onClick={onClose} className="absolute top-4 right-3 lg:hidden text-sm px-2 py-1 rounded-md bg-white/80 text-[#0032A0]">Close</button>
    </div>
  );
}
