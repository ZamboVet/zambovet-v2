"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";

export default function AdminTopbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [items, setItems] = useState<Array<{id:number; title:string; message:string; is_read:boolean; created_at:string;}>>([]);
  const unread = useMemo(() => items.filter(i=>!i.is_read).length, [items]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { (async()=>{ try { const { data } = await supabase.auth.getUser(); setAdminId(data.user?.id ?? null); } catch {} })(); }, []);

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id,title,message,is_read,created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      setItems(((data || []) as any[]).map(n => ({ id: n.id, title: n.title, message: n.message, is_read: !!n.is_read, created_at: n.created_at })));
    };
    fetchNotifs();
  }, [adminId]);

  useEffect(() => {
    const ch = supabase
      .channel("admin-header-notifs")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (payload: any) => {
        const row: any = payload.new || payload.record;
        if (!row) return;
        setItems(prev => [{ id: row.id, title: row.title || 'Activity', message: row.message || '', is_read: !!row.is_read, created_at: row.created_at || new Date().toISOString() }, ...prev].slice(0,10));
      })
      .subscribe();
    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    window.addEventListener('click', onClickOutside);
    return () => { try { supabase.removeChannel(ch); } catch {}; window.removeEventListener('click', onClickOutside); };
  }, [adminId]);

  const markAllRead = async () => {
    try { await supabase.from('notifications').update({ is_read: true }).eq('is_read', false); } catch {}
    setItems(prev => prev.map(i=>({ ...i, is_read: true })));
  };
  const doLogout = async () => {
    const res = await Swal.fire({ icon: "question", title: "Sign out?", showCancelButton: true, confirmButtonText: "Sign out" });
    if (!res.isConfirmed) return;
    const { error } = await supabase.auth.signOut({ scope: "global" as any });
    if (error) {
      await Swal.fire({ icon: "error", title: "Failed", text: error.message });
      return;
    }
    setOpen(false);
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
    window.location.href = "/login";
  };
  return (
    <header className="relative z-50 h-16 flex items-center justify-between px-4 sm:px-6 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center gap-3">
        <button onClick={() => window.dispatchEvent(new CustomEvent("toggle-admin-sidebar"))} className="lg:hidden px-3 py-2 rounded-lg border bg-white">Menu</button>
        <nav className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
          <span className="text-gray-400">/</span>
          <span>Dashboard</span>
        </nav>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search bar removed */}
        <div className="relative" ref={dropdownRef}>
          <button suppressHydrationWarning onClick={(e)=>{ e.stopPropagation(); setNotifOpen(v=>!v); }} className="relative w-9 h-9 rounded-full bg-white ring-1 ring-black/5 hover:ring-blue-200 transition">
            {unread>0 && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-600" />}
            <svg className="w-4 h-4 m-auto text-gray-600" viewBox="0 0 24 24" fill="none"><path d="M14 18v1a2 2 0 1 1-4 0v-1m8-6a6 6 0 1 0-12 0c0 2-1 3-2 4h16c-1-1-2-2-2-4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl bg-white shadow-xl ring-1 ring-black/5 py-2 text-sm z-50">
              <div className="px-3 py-2 flex items-center justify-between">
                <div className="font-medium">Notifications</div>
                <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>
              </div>
              <ul className="max-h-80 overflow-auto divide-y">
                {items.length===0 ? (
                  <li className="px-3 py-4 text-gray-500">No notifications</li>
                ) : items.map(n => (
                  <li key={n.id} className="px-3 py-3 hover:bg-gray-50">
                    <div className="flex items-start gap-2">
                      <span className={`mt-1 w-2 h-2 rounded-full ${n.is_read?"bg-gray-300":"bg-blue-500"}`} />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{n.title}</div>
                        <div className="text-xs text-gray-500 truncate">{n.message}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="px-3 py-2">
                <Link href="/admin/activity" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 w-full text-center">View all activity</Link>
              </div>
            </div>
          )}
        </div>
        <div className="relative">
          <button suppressHydrationWarning onClick={()=>setOpen(v=>!v)} className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden grid place-items-center text-xs font-semibold text-gray-700">
            AU
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white shadow-xl ring-1 ring-black/5 py-2 text-sm z-50">
              <button onClick={doLogout} className="block w-full text-left px-3 py-2 hover:bg-gray-50">Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
