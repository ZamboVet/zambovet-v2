"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

type Activity = { id: number; user_id: string | null; title: string; message: string; notification_type: string; is_read: boolean | null; related_appointment_id: number | null; created_at: string };

export default function AdminActivityPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,user_id,title,message,notification_type,is_read,related_appointment_id,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setItems((data || []) as Activity[]);
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Failed to load activity", text: err?.message || "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Realtime updates when notifications table changes
  useEffect(() => {
    const channel = supabase
      .channel('admin-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload: any) => {
        const row = (payload.new || payload.record) as any;
        if (!row) return;
        setItems(prev => {
          const next = [{
            id: row.id,
            user_id: row.user_id ?? null,
            title: row.title || 'Activity',
            message: row.message || '',
            notification_type: row.notification_type || 'system',
            is_read: row.is_read ?? false,
            related_appointment_id: row.related_appointment_id ?? null,
            created_at: row.created_at || new Date().toISOString(),
          } as Activity, ...prev];
          return next.slice(0, 50);
        });
      })
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch {} };
  }, []);

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Recent Activity</h1>
        <button onClick={fetchData} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          <ArrowPathIcon className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      <div className="rounded-2xl bg-white shadow-md ring-1 ring-black/5 p-5">
        {loading ? (
          <ul className="divide-y text-sm text-gray-700 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="py-3 flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-10" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-600">No activity yet.</div>
        ) : (
          <ul className="divide-y text-sm text-gray-700">
            {items.map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{a.title}</div>
                  <div className="text-xs text-gray-500 truncate">{a.message}</div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{timeago(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
