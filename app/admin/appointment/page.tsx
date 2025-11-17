"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

const PRIMARY = "#0B63C7";

// Matches supabase_schema.sql: pending, confirmed, in_progress, completed, cancelled, no_show
const STATUSES = [
  "all",
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;

type Status = typeof STATUSES[number];

type Appointment = {
  id: number;
  pet_owner_id: number | null;
  patient_id: number | null;
  veterinarian_id: number | null;
  clinic_id: number | null;
  appointment_date: string;
  appointment_time: string;
  reason_for_visit: string | null;
  status: Status | Exclude<string, Status>;
  created_at: string | null;
};

export default function AdminAppointmentPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [range, setRange] = useState("30d");
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const since = (() => {
          const base = Date.now();
          if (range === "7d") return new Date(base - 7 * 86400000).toISOString().slice(0, 10);
          if (range === "90d") return new Date(base - 90 * 86400000).toISOString().slice(0, 10);
          return new Date(base - 30 * 86400000).toISOString().slice(0, 10);
        })();

        let qy = supabase
          .from("appointments")
          .select(
            "id,pet_owner_id,patient_id,veterinarian_id,clinic_id,appointment_date,appointment_time,reason_for_visit,status,created_at",
            { count: "exact" }
          )
          .gte("appointment_date", since)
          .order("appointment_date", { ascending: false })
          .order("appointment_time", { ascending: false });

        if (status !== "all") qy = qy.eq("status", status);
        if (q.trim()) qy = qy.ilike("reason_for_visit", `%${q.trim()}%`);

        const { data, error } = await qy;
        if (error) throw error;
        setRows((data || []) as Appointment[]);
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Failed to load appointments", text: err?.message || "Please try again." });
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [status, q, range]);

  useEffect(() => {
    (async()=>{ try { const { data } = await supabase.auth.getUser(); setAdminId(data.user?.id ?? null); } catch {} })();
  }, []);

  const filtered = useMemo(() => rows, [rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const pill = (s: string) =>
    s === "confirmed"
      ? "bg-emerald-100 text-emerald-700"
      : s === "pending"
      ? "bg-amber-100 text-amber-700"
      : s === "in_progress"
      ? "bg-blue-100 text-blue-700"
      : s === "completed"
      ? "bg-indigo-100 text-indigo-700"
      : s === "cancelled"
      ? "bg-rose-100 text-rose-700"
      : "bg-gray-100 text-gray-700";

  const showDetails = async (a: Appointment) => {
    try {
      const [{ data: pat }, { data: owner }, { data: vet }, { data: clinic }] = await Promise.all([
        a.patient_id
          ? supabase.from("patients").select("id,name,species,breed").eq("id", a.patient_id).maybeSingle()
          : Promise.resolve({ data: null }),
        a.pet_owner_id
          ? supabase.from("pet_owner_profiles").select("id,full_name,phone").eq("id", a.pet_owner_id).maybeSingle()
          : Promise.resolve({ data: null }),
        a.veterinarian_id
          ? supabase.from("veterinarians").select("id,full_name,specialization").eq("id", a.veterinarian_id).maybeSingle()
          : Promise.resolve({ data: null }),
        a.clinic_id
          ? supabase.from("clinics").select("id,name,address").eq("id", a.clinic_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const html = `<div style='text-align:left'>
        <div><b>Date</b>: ${a.appointment_date} • ${a.appointment_time}</div>
        <div><b>Status</b>: ${a.status}</div>
        <div style='margin-top:8px'><b>Reason</b>: ${a.reason_for_visit || "Consultation"}</div>
        <hr style='margin:12px 0'/>
        <div><b>Patient</b>: ${pat?.name || "-"} ${pat?.species ? `(${pat.species}${pat?.breed ? ` • ${pat.breed}` : ""})` : ""}</div>
        <div><b>Owner</b>: ${owner?.full_name || "-"} ${owner?.phone ? ` • ${owner.phone}` : ""}</div>
        <div><b>Veterinarian</b>: ${vet?.full_name || "-"} ${vet?.specialization ? ` • ${vet.specialization}` : ""}</div>
        <div><b>Clinic</b>: ${clinic?.name || "-"} ${clinic?.address ? ` • ${clinic.address}` : ""}</div>
      </div>`;
      await Swal.fire({ title: "Appointment Details", html, confirmButtonText: "Close", width: 600 });
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Failed to load details", text: err?.message || "Please try again." });
    }
  };

  const updateStatus = async (id: number, next: Status) => {
    const res = await Swal.fire({ icon: "question", title: `Mark as ${next}?`, showCancelButton: true, confirmButtonText: "Confirm" });
    if (!res.isConfirmed) return;
    const { error } = await supabase.from("appointments").update({ status: next }).eq("id", id);
    if (error) {
      await Swal.fire({ icon: "error", title: "Update failed", text: error.message });
      return;
    }
    setRows(rs => rs.map(r => (r.id === id ? { ...r, status: next } : r)));
    try { await supabase.from('notifications').insert({ title: 'Appointment status updated', message: `Appointment #${id} → ${next}`, notification_type: 'admin', user_id: adminId, related_appointment_id: id }); } catch {}
    await Swal.fire({ icon: "success", title: "Status updated" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>Appointment Management</h1>
          <p className="text-sm text-gray-500">Search, review, and update appointment statuses</p>
        </div>
        {/* Search bar removed */}
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2">
        <div className="inline-flex rounded-full bg-white ring-1 ring-black/5 overflow-hidden">
          {STATUSES.map(s => (
            <button key={s} onClick={()=>{ setStatus(s as Status); setPage(1);} } className={`px-3 py-1.5 text-sm ${status===s?"bg-blue-600 text-white":"text-gray-700 hover:bg-blue-50"}`}>{s.replace("_"," ").toUpperCase()}</button>
          ))}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-black/5 px-3 py-2">
          <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-500" />
          <select value={range} onChange={e=>{ setRange(e.target.value); setPage(1);} } className="text-sm bg-transparent outline-none">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        {/* Mobile list (sm:hidden) */}
        <div className="sm:hidden divide-y">
          {(loading ? Array.from({length:6}).map((_,i)=>({id:i,appointment_date:"",appointment_time:"",reason_for_visit:"",status:"pending" as Status})) : pageRows).map((a:any) => (
            <div key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 grid place-items-center"><CalendarDaysIcon className="w-5 h-5"/></div>
                  <div className="min-w-0">
                    <div className="font-medium" style={{ color: PRIMARY }}>#{a.id}</div>
                    <div className="text-xs text-gray-500 truncate">{a.reason_for_visit || "-"}</div>
                    <div className="text-xs text-gray-500">{a.appointment_date ? `${a.appointment_date} • ${a.appointment_time}` : "Loading"}</div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[11px] font-medium whitespace-nowrap ${pill(a.status)}`}>{String(a.status).replace("_"," ")}</span>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                {a.status !== "confirmed" && <button onClick={()=>updateStatus(a.id, "confirmed")} className="px-2 py-1 rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-xs">Confirm</button>}
                {a.status !== "in_progress" && <button onClick={()=>updateStatus(a.id, "in_progress")} className="px-2 py-1 rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-xs">Start</button>}
                {a.status !== "cancelled" && <button onClick={()=>updateStatus(a.id, "cancelled")} className="px-2 py-1 rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-xs">Cancel</button>}
                <button onClick={()=>showDetails(a)} className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-blue-50 text-xs">Details</button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-white">
            <div className="text-xs text-gray-500">Showing {filtered.length === 0 ? 0 : pageStart + 1}–{pageEnd} of {filtered.length}</div>
            <div className="inline-flex items-center gap-2">
              <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 disabled:opacity-50 inline-flex items-center gap-1" style={{ color: PRIMARY }}>
                <ChevronLeftIcon className="w-4 h-4" /> Prev
              </button>
              <div className="text-xs text-gray-600">Page {page} / {totalPages}</div>
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 disabled:opacity-50 inline-flex items-center gap-1" style={{ color: PRIMARY }}>
                Next <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {/* Desktop/tablet grid (hidden on mobile) */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-medium text-gray-500 bg-gray-50">
            <div className="col-span-4">Appointment</div>
            <div className="col-span-3">Reason</div>
            <div className="col-span-3">Date</div>
            <div className="col-span-2 text-right">Status</div>
          </div>
          {(loading ? Array.from({length:6}).map((_,i)=>({id:i,appointment_date:"",appointment_time:"",reason_for_visit:"",status:"pending" as Status})) : pageRows).map((a:any) => (
            <div key={a.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-t text-sm">
              <div className="col-span-4 flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 grid place-items-center"><CalendarDaysIcon className="w-5 h-5"/></div>
                <div>
                  <div className="font-medium" style={{ color: PRIMARY }}>#{a.id}</div>
                  <div className="text-xs text-gray-500">Clinic {a.clinic_id ?? "-"} • Vet {a.veterinarian_id ?? "-"}</div>
                </div>
              </div>
              <div className="col-span-3 text-gray-600 truncate">{a.reason_for_visit || "-"}</div>
              <div className="col-span-3 text-gray-600">{a.appointment_date ? `${a.appointment_date} • ${a.appointment_time}` : "Loading"}</div>
              <div className="col-span-2 flex justify-end gap-2">
                <span className={`px-2 py-1 rounded-full text-xs ${pill(a.status)}`}>{String(a.status).replace("_"," ")}</span>
                {!loading && (
                  <>
                    {a.status !== "confirmed" && <button onClick={()=>updateStatus(a.id, "confirmed")} className="px-2 py-1 rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-xs inline-flex items-center gap-1"><CheckCircleIcon className="w-4 h-4"/>Confirm</button>}
                    {a.status !== "in_progress" && <button onClick={()=>updateStatus(a.id, "in_progress")} className="px-2 py-1 rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-xs inline-flex items-center gap-1"><ClockIcon className="w-4 h-4"/>Start</button>}
                    {a.status !== "cancelled" && <button onClick={()=>updateStatus(a.id, "cancelled")} className="px-2 py-1 rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-xs inline-flex items-center gap-1"><XCircleIcon className="w-4 h-4"/>Cancel</button>}
                    <button onClick={()=>showDetails(a)} className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-blue-50 text-xs inline-flex items-center gap-1"><EyeIcon className="w-4 h-4"/>Details</button>
                  </>
                )}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-white">
            <div className="text-xs text-gray-500">Showing {filtered.length === 0 ? 0 : pageStart + 1}–{pageEnd} of {filtered.length}</div>
            <div className="inline-flex items-center gap-2">
              <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 disabled:opacity-50 inline-flex items-center gap-1" style={{ color: PRIMARY }}>
                <ChevronLeftIcon className="w-4 h-4" /> Prev
              </button>
              <div className="text-xs text-gray-600">Page {page} / {totalPages}</div>
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 disabled:opacity-50 inline-flex items-center gap-1" style={{ color: PRIMARY }}>
                Next <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
