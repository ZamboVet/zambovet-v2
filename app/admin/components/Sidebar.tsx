"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../../lib/supabaseClient";

export type AdminNavItem = {
  href: string;
  label: string;
  desc?: string;
  icon: React.ElementType;
};

export default function AdminSidebar({ items, pathname, open, onClose }: { items: AdminNavItem[]; pathname: string; open: boolean; onClose: () => void; }) {
  const [collapsed, setCollapsed] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [adminName, setAdminName] = useState<string>("Admin User");
  const [adminRole, setAdminRole] = useState<string>("System Administrator");
  const userRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    (async()=>{
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (!uid) return;
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name,user_role,email")
          .eq("id", uid)
          .single();
        if (prof) {
          const name = (prof as any).full_name || (prof as any).email || "Admin User";
          setAdminName(name);
          const role = (prof as any).user_role === 'admin' ? 'System Administrator' : (prof as any).user_role === 'veterinarian' ? 'Veterinarian' : 'Pet Owner';
          setAdminRole(role);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    const onResize = () => {
      const mobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false;
      setIsMobile(mobile);
      if (!mobile) {
        try { document.body.style.overflow = ''; } catch {}
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    try { document.body.style.overflow = open ? 'hidden' : ''; } catch {}
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => {
      try { document.body.style.overflow = ''; } catch {}
      document.removeEventListener('keydown', onKey);
    };
  }, [open, isMobile, onClose]);

  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('admin_sidebar_close', handler as EventListener);
    return () => window.removeEventListener('admin_sidebar_close', handler as EventListener);
  }, [onClose]);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 ${collapsed ? "w-20" : "w-72 lg:w-[280px]"} lg:sticky lg:top-0 lg:h-screen transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} transition-transform duration-200 bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-2xl flex flex-col`}
      role="navigation"
      aria-hidden={isMobile && !open}
    >
      <div className="h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-white">
            <Image src="/vetlogo.png" alt="ZamboVet" width={40} height={40} className="w-10 h-10 object-contain" />
          </div>
          {!collapsed && <div className="font-bold">Admin Portal</div>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setCollapsed(v=>!v)} className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/70 hover:bg-white transition text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2" aria-label="Toggle sidebar" title="Toggle sidebar">
            {collapsed ? "»" : "«"}
          </button>
          {isMobile && (
            <button onClick={onClose} className="inline-flex lg:hidden items-center justify-center w-9 h-9 rounded-xl bg-white/80 text-blue-800 hover:bg-white" aria-label="Close menu">
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
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
                      onClose();
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
        <button onClick={(e)=>{ e.stopPropagation(); setUserOpen(v=>!v); }} className={`w-full text-left flex items-center gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/20 hover:bg-white/15 transition overflow-hidden ${collapsed ? "justify-center" : ""}`}>
          <div className="flex-shrink-0 relative">
            <div className="w-9 h-9 rounded-full bg-white/70" />
            <span className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 bg-green-400 rounded-full ring-2 ring-blue-700" />
          </div>
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <div className="text-sm font-semibold truncate">{adminName}</div>
              <div className="text-xs text-white/70 truncate">{adminRole}</div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
