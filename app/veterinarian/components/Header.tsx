"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Props = {
  name: string;
  online: boolean;
  verification: string;
  specialization?: string | null;
  onToggle: () => void;
  primary: string;
};

export default function Header({ name, online, verification, specialization, onToggle, primary }: Props) {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(()=>setShow(true), 20); setMounted(true); return () => clearTimeout(t); }, []);
  const now = useMemo(() => (mounted ? new Date() : null), [mounted]);
  const dateStr = now ? now.toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "";
  const timeStr = now
    ? now.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : "";
  return (
    <div className={`relative rounded-3xl p-6 sm:p-8 text-white transition-all duration-300 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
      style={{
        background: "linear-gradient(135deg, #0B63C7, #4F46E5)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
      <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pointer-events-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Good Morning, {name}</h1>
          <p className="mt-1 text-white/90">Ready to provide excellent care today?</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <span suppressHydrationWarning className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/20">{mounted ? `${dateStr} at ${timeStr}` : ""}</span>
            {specialization && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/20">{specialization}</span>
            )}
            <button onClick={onToggle} className={`inline-flex items-center px-3 py-1 rounded-full ring-1 transition hover:opacity-80 ${online ? "bg-emerald-400/20 ring-emerald-200 text-emerald-50" : "bg-white/10 ring-white/20 text-white/80"}`} style={{ cursor: 'pointer' }} title={`Click to go ${online ? 'offline' : 'online'}`}>{online ? "● Online" : "● Offline"}</button>
            <span className={`inline-flex items-center px-3 py-1 rounded-full ring-1 ${verification === "approved" ? "bg-blue-400/20 ring-blue-200 text-blue-50" : "bg-amber-400/20 ring-amber-200 text-amber-50"}`}>{verification || "pending"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onToggle} className="px-4 py-2 rounded-xl bg-white/90 text-blue-700 hover:bg-white transition active:scale-[.98]" style={{ cursor: 'pointer' }}>{online ? "Go Offline" : "Go Online"}</button>
        </div>
      </div>
    </div>
  );
}
