"use client";

import { Suspense, useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Poppins } from "next/font/google";
import Sidebar from "./components/Sidebar";
import HeaderBar from "./components/HeaderBar";
import PendingVetBanner from "./components/PendingVetBanner";
import { getVetAccessControl } from "../../lib/utils/vetAccessControl";
import { supabase } from "../../lib/supabaseClient";
import { usePushNotifications } from "../../lib/hooks/usePushNotifications";
import SessionTimeoutProvider from "../../lib/components/SessionTimeoutProvider";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const PRIMARY = "#0B63C7";

function VetLayoutInner({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize push notifications for veterinarian
  usePushNotifications();

  useEffect(() => {
    (async () => {
      try {
        const access = await getVetAccessControl();
        setIsPending(access.isPending);
      } catch (err) {
        console.error('Error checking vet access:', err);
      }
      setMounted(true);
    })();
  }, []);

  // Auth is handled by middleware, but verify role client-side for UX
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) {
          // Middleware will handle redirect, just don't show content
          if (mounted) setAuthorized(false);
          return;
        }
        const { data: prof } = await supabase
          .from('profiles')
          .select('user_role')
          .eq('id', user.id)
          .maybeSingle();
        if ((prof as any)?.user_role !== 'veterinarian') {
          // Wrong role - redirect to home (not login to avoid loop)
          if (mounted) window.location.href = '/';
          return;
        }
        if (mounted) setAuthorized(true);
      } catch (err) {
        // Let middleware handle auth failures
        console.error('Layout auth check failed:', err);
        if (mounted) setAuthorized(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // hydrate collapsed state from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem("vet_sidebar_collapsed");
      if (s) setCollapsed(s === "1");
    } catch {}
  }, []);

  // persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem("vet_sidebar_collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  // lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = prev || '';
    }
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, [open, mounted]);

  if (!mounted || !authorized) return null;

  return (
    <SessionTimeoutProvider redirectTo="/login">
    <div
      className={`${poppins.className} min-h-screen relative overflow-x-hidden`}
      style={{
        // Modern veterinary palette with CSS variables
        // @ts-ignore
        ['--brand' as any]: PRIMARY,
        ['--brand-50' as any]: '#eff6ff',
        ['--brand-100' as any]: '#dbeafe',
        ['--brand-200' as any]: '#bfdbfe',
        ['--brand-300' as any]: '#93c5fd',
        ['--brand-400' as any]: '#60a5fa',
        ['--brand-500' as any]: '#3b82f6',
        ['--brand-600' as any]: '#2563eb',
      }}
    >
      {/* Clean background */}
      <div className="fixed inset-0 -z-10 bg-slate-50" />
      
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm lg:hidden z-30 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}
      
      <div className="flex min-h-screen">
        <Sidebar
          open={open}
          onClose={() => setOpen(false)}
          primary={PRIMARY}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(v => !v)}
        />
        <div className="flex-1 min-w-0 flex flex-col transition-all duration-300 ease-out">
          <HeaderBar onMenu={() => setOpen(true)} primary={PRIMARY} />
          <PendingVetBanner isPending={isPending} />
          <main className="flex-1 px-3 sm:px-4 md:px-6 lg:px-8 pb-6 sm:pb-8">{children}</main>
        </div>
      </div>
    </div>
    </SessionTimeoutProvider>
  );
}

export default function VetLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading...</div>}>
      <VetLayoutInner>{children}</VetLayoutInner>
    </Suspense>
  );
}
