"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDaysIcon, Cog6ToothIcon, HeartIcon, HomeIcon, HomeModernIcon, UserCircleIcon, ArrowLeftOnRectangleIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { XMarkIcon } from "@heroicons/react/24/outline";

const items = [
  { href: "/pet_owner", label: "Overview", desc: "Dashboard home", icon: HomeIcon },
  { href: "/pet_owner/my-pets", label: "My Pets", desc: "Manage your pets", icon: HeartIcon },
  { href: "/pet_owner/appointments", label: "Appointments", desc: "Schedule & view", icon: CalendarDaysIcon },
  { href: "/pet_owner/clinics", label: "Clinics", desc: "Find clinics", icon: HomeModernIcon },
  { href: "/pet_owner/moments", label: "Moments", desc: "Pet memories", icon: UserCircleIcon },
  { href: "/pet_owner/settings", label: "Settings", desc: "Account settings", icon: Cog6ToothIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [ownerName, setOwnerName] = useState<string>("Pet Owner");
  const [ownerEmail, setOwnerEmail] = useState<string>("owner@example.com");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [petsCount, setPetsCount] = useState<number | null>(null);
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onResize = () => {
      const m = typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false;
      setIsMobile(m);
      if (!m) {
        setDrawerOpen(false);
        try { document.body.style.overflow = ''; } catch {}
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    try { document.body.style.overflow = drawerOpen ? 'hidden' : ''; } catch {}
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    if (drawerOpen) document.addEventListener('keydown', onKey);
    return () => {
      try { document.body.style.overflow = ''; } catch {}
      document.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen, isMobile]);

  useEffect(() => {
    if (isMobile) setDrawerOpen(false);
  }, [pathname, isMobile]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => { if (isMobile) setDrawerOpen(true); };
    window.addEventListener("po_sidebar_open", handler as EventListener);
    return () => window.removeEventListener("po_sidebar_open", handler as EventListener);
  }, [isMobile]);


  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        const { data: owner } = await supabase
          .from("pet_owner_profiles")
          .select("id, full_name, profile_picture_url")
          .eq("user_id", uid)
          .maybeSingle();
        const name = (owner as any)?.full_name || auth.user?.email || "Pet Owner";
        setOwnerName(name);
        setOwnerEmail(auth.user?.email || "owner@example.com");
        setAvatarUrl((owner as any)?.profile_picture_url || null);

        const ownerId = (owner as any)?.id as number | undefined;
        if (ownerId) {
          const { count: pc } = await supabase
            .from("patients")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", ownerId)
            .eq("is_active", true);
          setPetsCount(typeof pc === "number" ? pc : null);

          const { count: uc } = await supabase
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("pet_owner_id", ownerId)
            .in("status", ["pending", "confirmed"])
            .gte("appointment_date", new Date().toISOString().slice(0, 10));
          setUpcomingCount(typeof uc === "number" ? uc : null);
        }
      } catch {}
    })();
  }, []);


  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 ${collapsed ? "w-20" : "w-72 lg:w-[280px]"} lg:sticky lg:top-0 lg:h-screen transform ${drawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} transition-transform duration-200 bg-gradient-to-b from-blue-700 via-indigo-600 to-blue-600 text-white shadow-2xl flex flex-col`}
      role="navigation"
      aria-hidden={isMobile && !drawerOpen}
    >
      <div className={`h-16 flex items-center ${collapsed ? "justify-center" : "justify-between"} px-4`}>
        {collapsed ? (
          <button 
            onClick={()=>setCollapsed(false)} 
            className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-white hover:ring-2 hover:ring-white/40 transition"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <Image src="/vetlogo.png" alt="ZamboVet" width={40} height={40} className="w-10 h-10 object-contain" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-white">
                <Image src="/vetlogo.png" alt="ZamboVet" width={40} height={40} className="w-10 h-10 object-contain" />
              </div>
              <div className="font-bold">Pet Care Portal</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setCollapsed(v=>!v)} className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/70 hover:bg-white transition text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2" aria-label="Toggle sidebar" title="Toggle sidebar">
                <span className="text-lg font-bold">«</span>
              </button>
              {isMobile && (
                <button onClick={()=>setDrawerOpen(false)} className="inline-flex lg:hidden items-center justify-center w-9 h-9 rounded-xl bg-white/80 text-blue-800 hover:bg-white" aria-label="Close menu">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {!collapsed && <div className="px-2 pb-3 text-[11px] font-semibold uppercase tracking-widest text-white/70">Main Navigation</div>}
        <div className="space-y-1">
          {items.map((it) => {
            const active = pathname === it.href;
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                title={collapsed ? it.label : undefined}
                onClick={() => {
                  try {
                    if (window.matchMedia && window.matchMedia('(max-width: 1023px)').matches) {
                      setDrawerOpen(false);
                    }
                  } catch {}
                }}
                className={`group relative flex items-center ${collapsed ? "justify-center" : "gap-3 px-3"} py-2.5 rounded-2xl transition ${active ? "bg-white/15 text-white" : "hover:bg-white/10 text-white"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2`}
              >
                {active && !collapsed && <span className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-1.5 rounded-full bg-blue-200/90" />}
                <div className={`w-9 h-9 rounded-xl grid place-items-center ${active ? "bg-white text-blue-800" : "bg-white/20 text-white"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {!collapsed && (
                  <div className="leading-tight min-w-0">
                    <div className="text-[15px] font-semibold truncate">{it.label}</div>
                    <div className="text-[12px] text-white/70 truncate">{it.desc ?? ""}</div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="p-3 mt-auto relative" ref={userRef}>
        <button onClick={async () => {
          const res = await Swal.fire({
            title: "Logout?",
            text: "You will be signed out of your session.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Logout",
            confirmButtonColor: "#ef4444",
            cancelButtonText: "Cancel",
            customClass: { popup: "font-poppins", confirmButton: "font-semibold", cancelButton: "font-semibold" }
          });
          if (!res.isConfirmed) return;
          try {
            await supabase.auth.signOut({ scope: "global" as any });
            try {
              await fetch('/api/auth/clear-cookie', {
                method: 'POST',
                credentials: 'include',
              });
            } catch {}
            try {
              const removeAuthKeys = () => {
                try {
                  const keys: string[] = [];
                  for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (!k) continue;
                    if (k.startsWith("sb-") || k.startsWith("supabase")) keys.push(k);
                  }
                  keys.forEach(k => localStorage.removeItem(k));
                } catch {}
              };
              localStorage.removeItem("ownerNotif");
              localStorage.removeItem("po_sidebar_collapsed");
              localStorage.removeItem("po_avatar_url");
              localStorage.removeItem("vet_sidebar_collapsed");
              removeAuthKeys();
              try { sessionStorage.clear(); } catch {}
            } catch {}
            await Swal.fire({ icon: "success", title: "Signed out", confirmButtonColor: "#2563eb" });
            window.location.href = "/login";
          } catch (e: any) {
            await Swal.fire({ icon: "error", title: "Logout failed", text: e?.message || "Please try again.", confirmButtonColor: "#2563eb" });
          }
        }} className={`w-full text-left flex items-center gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/20 hover:bg-white/15 transition overflow-hidden ${collapsed ? "justify-center" : ""}`}>
          <div className="flex-shrink-0 relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/70" />
            )}
            <span className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 bg-green-400 rounded-full ring-2 ring-blue-700" />
          </div>
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <div className="text-sm font-semibold truncate">{ownerName}</div>
              <div className="text-xs text-white/70 truncate">Pet Owner</div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
