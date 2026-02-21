"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { 
  ChevronRightIcon, 
  ArrowRightOnRectangleIcon, 
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  HomeIcon
} from "@heroicons/react/24/outline";

type Props = { onMenu: () => void; primary: string };

const titleMap: Record<string, string> = {
  "/veterinarian": "Dashboard",
  "/veterinarian/appointments": "Appointments",
  "/veterinarian/patients": "Patients",
  "/veterinarian/patients/daily": "Daily Patients",
  "/veterinarian/reports": "Reports & Analytics",
  "/veterinarian/reviews": "Reviews",
  "/veterinarian/notifications": "Notifications",
  "/veterinarian/settings": "Settings",
  "/veterinarian/clinic/location": "Clinic Location",
};

const iconMap: Record<string, string> = {
  "/veterinarian": "dashboard",
  "/veterinarian/appointments": "calendar",
  "/veterinarian/patients": "users",
};

export default function HeaderBar({ onMenu, primary }: Props) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  
  useEffect(() => {
    setMounted(true);
    // Fetch notification count
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (auth.user?.id) {
          const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', auth.user.id)
            .eq('is_read', false);
          setNotifCount(count || 0);
        }
      } catch {}
    })();
  }, []);
  
  const segs = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [];
  let path = "";
  segs.forEach((s) => {
    path += `/${s}`;
    crumbs.push({ href: path, label: titleMap[path] || s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ') });
  });

  const currentPage = crumbs[crumbs.length - 1]?.label || "Dashboard";

  const logout = async () => {
    const res = await Swal.fire({ 
      icon: "question", 
      title: "Sign out?",
      text: "You will need to sign in again to access your account.",
      showCancelButton: true, 
      confirmButtonText: "Sign out",
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancel"
    });
    if (!res.isConfirmed) return;
    const { error } = await supabase.auth.signOut({ scope: "global" as any });
    if (error) {
      await Swal.fire({ icon: "error", title: "Failed", text: error.message });
      return;
    }
    try {
      await fetch('/api/auth/clear-cookie', { method: 'POST', credentials: 'include' });
    } catch {}
    try {
      localStorage.removeItem('po_avatar_url');
      localStorage.removeItem('po_sidebar_collapsed');
      localStorage.removeItem('vet_sidebar_collapsed');
      localStorage.removeItem('ownerNotif');
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('sb-') || k.startsWith('supabase'))) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch {}
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left section */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button 
              onClick={onMenu} 
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              aria-label="Open menu"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
            
            {/* Breadcrumbs */}
            <nav className="hidden sm:flex items-center gap-1 text-sm min-w-0">
              <Link href="/veterinarian" className="text-neutral-500 hover:text-neutral-700">
                Home
              </Link>
              {crumbs.slice(1).map((c, i) => (
                <div key={c.href} className="flex items-center gap-1 min-w-0">
                  <ChevronRightIcon className="w-4 h-4 text-neutral-400" />
                  {i < crumbs.length - 2 ? (
                    <Link href={c.href} className="text-neutral-500 hover:text-neutral-700 truncate">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-neutral-900 truncate">{c.label}</span>
                  )}
                </div>
              ))}
            </nav>
            
            <h1 className="sm:hidden font-medium text-neutral-900 truncate">{currentPage}</h1>
          </div>
          
          {/* Right section */}
          <div className="flex items-center gap-2">
            <Link 
              href="/veterinarian/notifications"
              className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            >
              <BellIcon className="w-5 h-5" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-medium">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </Link>
            
            <button 
              onClick={logout} 
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 text-sm"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
