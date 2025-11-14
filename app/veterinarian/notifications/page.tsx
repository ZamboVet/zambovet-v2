"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { getCurrentVet } from "../../../lib/utils/currentVet";
import { Poppins } from "next/font/google";
import { BellIcon, ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

const poppins = Poppins({ subsets: ["latin"], weight: ["400","500","600","700"] });
const PRIMARY = "#2563eb";

type Profile = { id: string; user_role: string };

type Notif = {
  id: number;
  user_id: string | null;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean | null;
  related_appointment_id: number | null;
  created_at: string;
};

export default function VetNotifications() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { profile: p } = await getCurrentVet();
        setProfile({ id: p.id, user_role: p.user_role });
        await fetchList(p.id);
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Failed to load", text: err?.message || "Please try again." });
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchList = async (uid?: string) => {
    const userId = uid || profile?.id;
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,user_id,title,message,notification_type,is_read,related_appointment_id,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setItems((data || []) as Notif[]);
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Failed to fetch", text: err?.message || "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // Realtime subscription
  useEffect(() => {
    if (!profile?.id) return;
    const ch = supabase.channel("vet-notifs-" + profile.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` }, (payload) => {
        // optimistic refresh; prepend new
        if (payload.eventType === "INSERT") {
          setItems(prev => [payload.new as any as Notif, ...prev]);
        } else {
          fetchList();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id]);

  const markRead = async (id: number) => {
    try {
      setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Failed to update", text: err?.message || "Please try again." });
      fetchList();
    }
  };

  const markAll = async () => {
    if (!profile?.id) return;
    const res = await Swal.fire({ icon: "question", title: "Mark all as read?", showCancelButton: true, confirmButtonText: "Mark all" });
    if (!res.isConfirmed) return;
    try {
      setItems(prev => prev.map(n => ({ ...n, is_read: true })));
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile.id);
      if (error) throw error;
      await Swal.fire({ icon: "success", title: "Updated" });
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Failed to update", text: err?.message || "Please try again." });
      fetchList();
    }
  };

  const timeago = useMemo(() => (iso: string) => {
    const d = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - d);
    const m = Math.floor(diff / 60000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    return `${days}d`;
  }, []);

  return (
    <div className={`${poppins.className} space-y-6`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>Notifications</h1>
          <div className="text-sm text-gray-500">New appointments, cancellations, and reviews</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchList()} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 ring-1 ring-gray-100 hover:bg-white">
            <ArrowPathIcon className={`w-4 h-4 ${loading?"animate-spin":""}`} /> Refresh
          </button>
          <button onClick={markAll} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700">
            <CheckCircleIcon className="w-4 h-4" /> Mark all read
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white/70 backdrop-blur shadow ring-1 ring-gray-100">
        {loading ? (
          <ul className="divide-y animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-56 bg-gray-200 rounded" />
                  <div className="h-3 w-40 bg-gray-100 rounded" />
                </div>
                <div className="h-8 w-16 bg-gray-100 rounded" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-600">No notifications yet.</div>
        ) : (
          <ul className="divide-y">
            {items.map(n => (
              <li key={n.id} className={`p-4 ${n.is_read ? "bg-white" : "bg-blue-50/40"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: PRIMARY }}>{n.title}</div>
                    <div className="text-sm text-gray-600 truncate">{n.message}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{n.notification_type} • {timeago(n.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!n.is_read && (
                      <button onClick={() => markRead(n.id)} className="px-3 py-1 rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-sm">Mark read</button>
                    )}
                    {n.related_appointment_id && (
                      <a href={`/veterinarian/consultations/${n.related_appointment_id}`} className="px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">Open</a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
