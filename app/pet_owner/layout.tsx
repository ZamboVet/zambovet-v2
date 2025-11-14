"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./components/Sidebar";
import Swal from "sweetalert2";
import { supabase } from "../../lib/supabaseClient";
import NotificationsBell from "./components/NotificationsBell";

export default function PetOwnerLayout({ children }: { children: ReactNode }) {
  const [initials, setInitials] = useState<string>("PO");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (!uid) { setAuthed(false); setAuthReady(true); return; }
        setAuthed(true);
        const { data: owner } = await supabase
          .from("pet_owner_profiles")
          .select("full_name,profile_picture_url")
          .eq("user_id", uid)
          .maybeSingle();
        const name = (owner as any)?.full_name || data.user?.email || "PO";
        const token = String(name)
          .split(/[\s@._-]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((s: string) => s[0]?.toUpperCase())
          .join("") || "PO";
        setInitials(token);
        const dbAvatar = (owner as any)?.profile_picture_url as string | null | undefined;
        if (dbAvatar) setAvatarUrl(dbAvatar);
        // fallback to cached localStorage value if present
        try {
          const cached = localStorage.getItem("po_avatar_url");
          if (!dbAvatar && cached) setAvatarUrl(cached);
        } catch {}
      } catch {
        // ignore
      } finally { setAuthReady(true); }
    })();
  }, []);
  // Listen for avatar updates broadcast via localStorage changes
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "po_avatar_url") {
        setAvatarUrl(e.newValue);
      }
    };
    try {
      window.addEventListener("storage", onStorage);
    } catch {}
    return () => {
      try { window.removeEventListener("storage", onStorage); } catch {}
    };
  }, []);
  useEffect(() => {
    if (!authReady) return;
    if (!authed) {
      router.replace("/login");
    }
  }, [authReady, authed, router]);
  if (!authReady) {
    return (
      <div className="min-h-dvh grid place-items-center bg-neutral-50">
        <div className="text-sm text-neutral-500">Loading…</div>
      </div>
    );
  }
  if (!authed) return null;
  return (
    <div className="min-h-dvh bg-neutral-50 text-neutral-900">
      {/* Off-canvas + sticky sidebar rendered independently */}
      <Sidebar />
      {/* Content shifts on md+ to accommodate sidebar width */}
      <div className="flex flex-col min-h-dvh md:ml-72">
        <header className="sticky top-0 z-40 text-white">
          <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600">
            <div className="px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold tracking-tight">Pet Owner</div>
                <div className="flex items-center gap-2">
                  <NotificationsBell />
                  <div className="h-8 w-8 rounded-full bg-white/20 grid place-items-center font-semibold overflow-hidden">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
