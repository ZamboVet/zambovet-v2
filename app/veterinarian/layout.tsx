"use client";

import { Suspense, useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Poppins } from "next/font/google";
import Sidebar from "./components/Sidebar";
import HeaderBar from "./components/HeaderBar";
import PendingVetBanner from "./components/PendingVetBanner";
import { getVetAccessControl } from "../../lib/utils/vetAccessControl";
import { supabase } from "../../lib/supabaseClient";

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

  // Auth + role gating with redirect preservation
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        const current = `${pathname || '/veterinarian'}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
        if (!user) {
          window.location.href = `/login?redirect=${encodeURIComponent(current)}`;
          return;
        }
        const { data: prof } = await supabase
          .from('profiles')
          .select('user_role')
          .eq('id', user.id)
          .maybeSingle();
        if ((prof as any)?.user_role !== 'veterinarian') {
          window.location.href = '/';
          return;
        }
        setAuthorized(true);
      } catch {
        // hard redirect to login on unexpected failures
        const current = `${pathname || '/veterinarian'}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
        window.location.href = `/login?redirect=${encodeURIComponent(current)}`;
      }
    })();
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
    <div
      className={`${poppins.className} min-h-screen relative overflow-x-hidden`}
      style={{
        // Light veterinary palette
        // @ts-ignore
        ['--brand' as any]: PRIMARY,
        ['--brand-50' as any]: '#eff6ff',
        ['--brand-100' as any]: '#dbeafe',
        ['--brand-200' as any]: '#bfdbfe',
        ['--brand-300' as any]: '#a7f3d0',
      }}
    >
      <div className="absolute inset-0 -z-10">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_left,rgba(219,234,254,0.9),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(224,242,254,0.9),transparent_50%)]" />
      </div>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] lg:hidden z-30"
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
        <div className="flex-1 min-w-0 flex flex-col transition-[padding] duration-300 ease-in-out">
          <HeaderBar onMenu={() => setOpen(true)} primary={PRIMARY} />
          <PendingVetBanner isPending={isPending} />
          <main className="px-4 sm:px-6 lg:px-8 pb-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default function VetLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading...</div>}>
      <VetLayoutInner>{children}</VetLayoutInner>
    </Suspense>
  );
}
