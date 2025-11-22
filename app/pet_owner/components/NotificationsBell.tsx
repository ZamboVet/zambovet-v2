"use client";

import { useEffect, useRef, useState } from "react";
import { BellIcon, CheckIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { usePushNotifications } from "../../../lib/hooks/usePushNotifications";

export type OwnerNotification = {
  id: string;
  ts: string;
  title: string;
  body?: string;
  read?: boolean;
  type?: "success" | "error" | "warning" | "info";
};

const mapNotificationType = (dbType: string): "success" | "error" | "warning" | "info" => {
  if (dbType?.includes("confirmed") || dbType?.includes("appointment")) return "success";
  if (dbType?.includes("cancel")) return "warning";
  if (dbType?.includes("reject")) return "error";
  return "info";
};

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<OwnerNotification[]>([]);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  
  // Initialize push notifications
  usePushNotifications();

  // load owner id and fetch notifications from Supabase
  useEffect(() => {
    const init = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        setUserId(uid);
        const { data: ownerRow } = await supabase
          .from("pet_owner_profiles")
          .select("id")
          .eq("user_id", uid)
          .maybeSingle();
        setOwnerId(ownerRow?.id ?? null);
        
        // Fetch notifications from Supabase notifications table
        const { data: notifications } = await supabase
          .from("notifications")
          .select("id,title,message,notification_type,is_read,created_at,related_appointment_id")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(50);
        
        if (notifications && notifications.length > 0) {
          const transformed = notifications.map((n: any) => ({
            id: String(n.id),
            ts: n.created_at,
            title: n.title,
            body: n.message,
            read: n.is_read,
            type: mapNotificationType(n.notification_type)
          }));
          setItems(transformed);
        } else {
          const cached = localStorage.getItem("ownerNotif");
          if (cached) setItems(JSON.parse(cached));
        }
      } catch {}
    };
    init();
  }, []);

  // persist cache
  useEffect(() => {
    try { localStorage.setItem("ownerNotif", JSON.stringify(items.slice(0,50))); } catch {}
  }, [items]);

  // realtime: listen to appointments for this owner
  useEffect(() => {
    if (!ownerId) return;
    const ch = supabase
      .channel("owner-notif-" + ownerId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "appointments", filter: `pet_owner_id=eq.${ownerId}` }, (payload) => {
        const appt: any = payload.new;
        pushToast({
          title: "Appointment requested",
          body: `Your appointment on ${appt.appointment_date} at ${appt.appointment_time} was created.`
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "appointments", filter: `pet_owner_id=eq.${ownerId}` }, (payload) => {
        const appt: any = payload.new;
        const prev: any = (payload as any).old || {};
        const changed = appt.status && appt.status !== prev.status;
        if (changed) {
          let title = "Appointment update";
          let body = `Status changed to ${appt.status}.`;
          let type: "success" | "error" | "warning" | "info" = "info";
          
          // Customize message for vet approvals/confirmations
          if (appt.status === "confirmed") {
            title = "✨ Appointment Confirmed!";
            body = `Your appointment on ${appt.appointment_date} at ${appt.appointment_time} has been confirmed by the veterinarian.`;
            type = "success";
          } else if (appt.status === "rejected" || appt.status === "no_show") {
            title = "❌ Appointment Status Changed";
            body = `Your appointment on ${appt.appointment_date} status changed to ${appt.status}.`;
            type = "error";
          } else if (appt.status === "completed") {
            title = "✓ Appointment Completed";
            body = `Your appointment on ${appt.appointment_date} has been marked as completed.`;
            type = "success";
          } else if (appt.status === "cancelled") {
            title = "⚠ Appointment Cancelled";
            body = `Your appointment on ${appt.appointment_date} has been cancelled.`;
            type = "warning";
          }
          
          pushToast({
            title,
            body,
            type,
            appointmentId: appt.id
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ownerId]);

  // realtime: listen to notifications table for real-time updates
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel("notif-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        const notif: any = payload.new;
        const newNotif: OwnerNotification = {
          id: String(notif.id),
          ts: notif.created_at,
          title: notif.title,
          body: notif.message,
          read: notif.is_read,
          type: mapNotificationType(notif.notification_type)
        };
        setItems((prev) => [newNotif, ...prev].slice(0, 50));
        // Show SweetAlert for new notifications
        const icon = newNotif.type || "info";
        Swal.fire({ icon, title: newNotif.title, text: newNotif.body, confirmButtonColor: "#2563eb" });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  async function pushToast(n: { title: string; body?: string; type?: "success" | "error" | "warning" | "info"; appointmentId?: number }) {
    const notif: OwnerNotification = { id: crypto.randomUUID(), ts: new Date().toISOString(), title: n.title, body: n.body, read: false, type: n.type };
    setItems((prev) => [notif, ...prev].slice(0, 50));
    
    // Write to Supabase notifications table
    if (userId) {
      try {
        const notificationType = n.type === "success" ? "appointment_confirmed" : n.type === "error" ? "appointment_rejected" : n.type === "warning" ? "appointment_cancelled" : "appointment_update";
        await supabase.from("notifications").insert({
          user_id: userId,
          title: n.title,
          message: n.body || "",
          notification_type: notificationType,
          is_read: false,
          related_appointment_id: n.appointmentId || null
        });
      } catch (err) {
        console.error("Failed to save notification:", err);
      }
    }
    
    // Use appropriate icon based on notification type
    const icon = n.type || "info";
    Swal.fire({ icon, title: n.title, text: n.body, confirmButtonColor: "#2563eb" });
  }

  const unread = items.filter(i => !i.read).length;

  // close on outside click / esc
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="relative">
      <button ref={btnRef} onClick={() => setOpen(o=>!o)} aria-label="Notifications" className="relative inline-flex items-center rounded-full bg-white p-2 ring-1 ring-neutral-200 hover:bg-neutral-50">
        <BellIcon className="w-5 h-5 text-neutral-700" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] grid place-items-center">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
      {open && (
        <div ref={panelRef} className="absolute right-0 mt-2 w-80 rounded-2xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
            <div className="text-sm font-semibold text-neutral-800">Notifications</div>
            {unread > 0 && (
              <button onClick={() => setItems(prev => prev.map(i => ({...i, read: true})))} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200"><CheckIcon className="w-3.5 h-3.5"/> Mark read</button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="p-6 text-sm text-neutral-500">No notifications yet.</div>
          ) : (
            <ul className="max-h-80 overflow-auto divide-y divide-neutral-100">
              {items.map(n => {
                const getNotificationStyle = (type?: string, read?: boolean) => {
                  if (read) return 'bg-white';
                  switch (type) {
                    case 'success': return 'bg-green-50/80 border-l-4 border-green-500';
                    case 'error': return 'bg-red-50/80 border-l-4 border-red-500';
                    case 'warning': return 'bg-yellow-50/80 border-l-4 border-yellow-500';
                    default: return 'bg-blue-50/40 border-l-4 border-blue-500';
                  }
                };
                return (
                  <li key={n.id} className={`p-3 ${getNotificationStyle(n.type, n.read)}`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="text-[13px] font-medium text-neutral-900">{n.title}</div>
                        {n.body && <div className="text-xs text-neutral-600 mt-0.5 leading-relaxed">{n.body}</div>}
                        <div className="text-[10px] text-neutral-400 mt-1">{new Date(n.ts).toLocaleString()}</div>
                      </div>
                      {n.type === 'success' && !n.read && (
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 mt-1"></div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
