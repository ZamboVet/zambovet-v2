"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDaysIcon, Cog6ToothIcon, HeartIcon, HomeIcon, HomeModernIcon, UserCircleIcon, ArrowLeftOnRectangleIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

const items = [
  { href: "/pet_owner", label: "Overview", icon: HomeIcon },
  { href: "/pet_owner/my-pets", label: "My Pets", icon: HeartIcon },
  { href: "/pet_owner/appointments", label: "Appointments", icon: CalendarDaysIcon },
  { href: "/pet_owner/clinics", label: "Clinics", icon: HomeModernIcon },
  { href: "/pet_owner/moments", label: "Moments", icon: UserCircleIcon },
  { href: "/pet_owner/settings", label: "Settings", icon: Cog6ToothIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [initials, setInitials] = useState("PO");
  const [petsCount, setPetsCount] = useState<number | null>(null);
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onResize = () => {
      const m = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false;
      setIsMobile(m);
      if (!m) {
        setDrawerOpen(false);
        setCollapsed(false); // ensure expanded on desktop
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close on Escape and prevent body scroll when drawer is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    if (drawerOpen && isMobile) {
      document.addEventListener('keydown', onKey);
      try { document.body.style.overflow = 'hidden'; } catch {}
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      try { document.body.style.overflow = ''; } catch {}
    };
  }, [drawerOpen, isMobile]);

  // Close drawer when route changes (nav click) or on scroll
  useEffect(() => {
    if (isMobile) setDrawerOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  useEffect(() => {
    const onScroll = () => { if (isMobile && drawerOpen) setDrawerOpen(false); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isMobile, drawerOpen]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => { if (isMobile) setDrawerOpen(true); };
    window.addEventListener("po_sidebar_open", handler as EventListener);
    return () => window.removeEventListener("po_sidebar_open", handler as EventListener);
  }, [isMobile]);

  useEffect(() => {
    const s = localStorage.getItem("po_sidebar_collapsed");
    if (s) setCollapsed(s === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("po_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        // Try pet_owner_profiles first for name
        const { data: owner } = await supabase
          .from("pet_owner_profiles")
          .select("id, full_name, profile_picture_url")
          .eq("user_id", uid)
          .maybeSingle();
        const name = (owner as any)?.full_name || auth.user?.email || "PO";
        const token = String(name)
          .split(/[\s@._-]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((s: string) => s[0]?.toUpperCase())
          .join("") || "PO";
        setInitials(token);

        const ownerId = (owner as any)?.id as number | undefined;
        if (ownerId) {
          // Patients count
          const { count: pc } = await supabase
            .from("patients")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", ownerId)
            .eq("is_active", true);
          setPetsCount(typeof pc === "number" ? pc : null);

          // Upcoming appointments (best effort)
          const { count: uc } = await supabase
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", ownerId)
            .in("status", ["scheduled", "confirmed"]).gte("date", new Date().toISOString());
          setUpcomingCount(typeof uc === "number" ? uc : null);
        }
        // Set avatar into localStorage for quick access by header if needed
        const avatarUrl = (owner as any)?.profile_picture_url as string | null | undefined;
        try { if (avatarUrl) localStorage.setItem("po_avatar_url", avatarUrl); else localStorage.removeItem("po_avatar_url"); } catch {}
      } catch {
        // fail silently, badges remain null
      }
    })();
  }, []);

  // Simple swipe-to-close handlers (mobile)
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setTouchStartX(e.touches[0].clientX);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || touchStartX == null) return;
    const endX = e.changedTouches[0].clientX;
    if (touchStartX - endX > 50) setDrawerOpen(false);
    setTouchStartX(null);
  };

  return (
    <>
    {/* Backdrop for mobile drawer */}
    {isMobile && drawerOpen && (
      <div
        className="fixed inset-0 z-[60] bg-black/40 cursor-pointer"
        onClick={() => setDrawerOpen(false)}
        aria-label="Close menu"
        role="button"
      />
    )}
    <aside
      className={`
        ${isMobile
          ? 'fixed z-[70] top-0 left-0 h-screen w-72 transform transition-transform duration-200'
          : 'fixed z-[70] top-0 left-0 h-screen w-72'}
        ${isMobile ? (drawerOpen ? ' translate-x-0' : ' -translate-x-full') : ''}
        flex flex-col overflow-hidden`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-hidden={isMobile ? (!drawerOpen) : false}
    >
      <div className="absolute inset-0 -z-10">
        <div className="h-full w-full bg-gradient-to-b from-blue-800 to-blue-950" />
      </div>

      <div className="px-5 py-5 relative flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden ring-1 ring-white/15 bg-white/10 text-white grid place-items-center font-semibold text-base">
            {/* Avatar fallback to initials */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {(() => {
              let src: string | null = null;
              try { src = localStorage.getItem("po_avatar_url"); } catch {}
              if (src) {
                return <img src={src} alt="Avatar" className="w-full h-full object-cover" />;
              }
              return <span>{initials}</span>;
            })()}
          </div>
          {!collapsed && (
            <div className="text-white min-w-0">
              <p className="font-semibold text-base leading-tight truncate">Pet Care</p>
              <p className="text-xs text-blue-200/80 truncate">Owner Portal</p>
            </div>
          )}
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDrawerOpen(false); Promise.resolve().then(() => setDrawerOpen(false)); }}
            className="ml-2 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label="Close menu"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="px-3 py-3 flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30">
        {items.map((it, idx) => {
          const active = pathname === it.href;
          const Icon = it.icon;
          const badge = useMemo(() => {
            if (it.href.endsWith("/my-pets")) return petsCount;
            if (it.href.endsWith("/appointments")) return upcomingCount;
            return null;
          }, [it.href, petsCount, upcomingCount]);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? it.label : undefined}
              className={`relative flex items-center ${collapsed ? "justify-center py-2.5" : "gap-3 px-3 py-2.5"} mb-1.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-white text-blue-900 ring-1 ring-white/60"
                  : "text-white/90 hover:bg-white/10"
              }`}
              onClick={() => { if (isMobile) setDrawerOpen(false); }}
            >
              <span className={`grid place-items-center ${collapsed ? "w-9 h-9" : "w-9 h-9"} rounded-md ${
                active ? "bg-blue-800 text-white" : "bg-white/10 text-white"
              }`}>
                <Icon className="h-5 w-5" />
              </span>
              {mounted && !collapsed && (
                <>
                  <span className="truncate flex-1">{it.label}</span>
                  {badge !== null && (
                    <span className={`ml-auto inline-flex items-center justify-center px-2 min-w-[22px] h-5 rounded-full text-[11px] font-semibold ${
                      active ? "bg-blue-800 text-white" : "bg-white/15 text-white"
                    }`}>
                      {badge ?? "—"}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 relative border-t border-white/10">
        <button
          onClick={async () => {
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
                // Clear app-specific keys
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
          }}
          className={`w-full inline-flex items-center ${collapsed ? "justify-center" : "justify-center gap-2"} rounded-lg bg-red-600 hover:bg-red-700 py-3 text-sm font-semibold text-white`}
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>

    {/* Floating open button for mobile */}
    {isMobile && !drawerOpen && (
      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-6 left-4 z-40 inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white shadow-lg ring-1 ring-blue-400/30"
        aria-label="Open menu"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>
    )}
    </>
  );
}
