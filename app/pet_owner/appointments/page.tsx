"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { CalendarDaysIcon, PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import CreateAppointmentModal from "../components/CreateAppointmentModal";
import ReviewModal from "../components/ReviewModal";

 type Appointment = {
  id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason_for_visit: string | null;
  clinic_id: number | null;
  pet_owner_id: number | null;
  patient_id: number | null;
  veterinarian_id: number | null;
 };

 type Pet = { id: number; name: string; };
 type Vet = { id: number; full_name: string };
 type Clinic = { id: number; name: string };

export default function OwnerAppointmentsPage() {
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("all");
  const [qRaw, setQRaw] = useState("");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"List" | "Week">("List");
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [consultByAppt, setConsultByAppt] = useState<Record<number, { id: number; status: string }>>({});
  const [reviewByAppt, setReviewByAppt] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setMounted(true);
    try {
      const f = new Date().toISOString().slice(0,10);
      const t = new Date(Date.now() + 30*86400000).toISOString().slice(0,10);
      setFromDate(f);
      setToDate(t);
    } catch {}
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setQuery(qRaw), 300);
    return () => clearTimeout(t);
  }, [qRaw]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) {
          await Swal.fire({ icon: "warning", title: "Sign in required", text: "Please sign in to continue." });
          window.location.href = "/login";
          return;
        }
        const { data: ownerRow } = await supabase.from("pet_owner_profiles").select("id").eq("user_id", userId).maybeSingle();
        setOwnerId(ownerRow?.id ?? null);
      } catch (e: any) {
        await Swal.fire({ icon: "error", title: "Failed to load", text: e?.message || "Please try again." });
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchList = async () => {
      if (!ownerId || !fromDate || !toDate) return;
      setLoading(true);
      try {
        const from = 0;
        const to = page * PAGE_SIZE - 1;
        let q = supabase
          .from("appointments")
          .select("id,appointment_date,appointment_time,status,reason_for_visit,clinic_id,pet_owner_id,patient_id,veterinarian_id")
          .eq("pet_owner_id", ownerId)
          .gte("appointment_date", fromDate)
          .lte("appointment_date", toDate)
          .order("appointment_date", { ascending: true })
          .order("appointment_time", { ascending: true })
          .range(from, to);
        if (status !== "all") {
          q = q.eq("status", status);
        }
        if (query.trim()) q = q.ilike("reason_for_visit", `%${query.trim()}%`);
        const { data, error } = await q;
        if (error) throw error;
        const arr = (data || []) as Appointment[];
        setItems(arr);
        setHasMore(arr.length === page * PAGE_SIZE);
      } catch (e: any) {
        await Swal.fire({ icon: "error", title: "Failed to fetch", text: e?.message || "Please try again." });
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [ownerId, status, query, fromDate, toDate, page]);

  // Realtime refresh
  useEffect(() => {
    if (!ownerId) return;
    const ch = supabase
      .channel("owner-appts-" + ownerId)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `pet_owner_id=eq.${ownerId}` }, () => {
        // re-fetch with current filters
        (async () => {
          try {
            const from = 0;
            const to = page * PAGE_SIZE - 1;
            let q = supabase
              .from("appointments")
              .select("id,appointment_date,appointment_time,status,reason_for_visit,clinic_id,pet_owner_id,patient_id,veterinarian_id")
              .eq("pet_owner_id", ownerId)
              .gte("appointment_date", fromDate)
              .lte("appointment_date", toDate)
              .order("appointment_date", { ascending: true })
              .order("appointment_time", { ascending: true })
              .range(from, to);
            if (status !== "all") q = q.eq("status", status);
            if (query.trim()) q = q.ilike("reason_for_visit", `%${query.trim()}%`);
            const { data } = await q;
            setItems((data || []) as Appointment[]);
          } catch {}
        })();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ownerId, status, query, fromDate, toDate, page]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loading && viewMode === 'List') {
        setPage(p => p + 1);
      }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, viewMode]);

  // realtime auto-refresh
  useEffect(() => {
    if (!ownerId) return;
    const ch = supabase.channel("appointments-owner-" + ownerId)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `pet_owner_id=eq.${ownerId}` }, () => {
        setPage(1);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ownerId]);

  const [petsMap, setPetsMap] = useState<Record<number, Pet>>({});
  const [vetsMap, setVetsMap] = useState<Record<number, Vet>>({});
  const [clinicsMap, setClinicsMap] = useState<Record<number, Clinic>>({});
  useEffect(() => {
    const enrich = async () => {
      const pids = Array.from(new Set(items.map(i=>i.patient_id).filter(Boolean))) as number[];
      const vids = Array.from(new Set(items.map(i=>i.veterinarian_id).filter(Boolean))) as number[];
      const cids = Array.from(new Set(items.map(i=>i.clinic_id).filter(Boolean))) as number[];
      const [pRes, vRes, cRes] = await Promise.all([
        pids.length ? supabase.from("patients").select("id,name").in("id", pids) : Promise.resolve({ data: [] as any[] }),
        vids.length ? supabase.from("veterinarians").select("id,full_name").in("id", vids) : Promise.resolve({ data: [] as any[] }),
        cids.length ? supabase.from("clinics").select("id,name").in("id", cids) : Promise.resolve({ data: [] as any[] }),
      ]);
      const pm: Record<number, Pet> = {}; (pRes.data as any[]).forEach(r=> pm[r.id] = { id:r.id, name:r.name }); setPetsMap(pm);
      const vm: Record<number, Vet> = {}; (vRes.data as any[]).forEach(r=> vm[r.id] = { id:r.id, full_name:r.full_name }); setVetsMap(vm);
      const cm: Record<number, Clinic> = {}; (cRes.data as any[]).forEach(r=> cm[r.id] = { id:r.id, name:r.name }); setClinicsMap(cm);
    };
    if (items.length) enrich();
  }, [items]);

  // Detect consultations and reviews for displayed appointments
  useEffect(() => {
    const run = async () => {
      try {
        const apptIds = Array.from(new Set(items.map(i=>i.id)));
        if (apptIds.length === 0) { setConsultByAppt({}); setReviewByAppt({}); return; }
        const [consultRes, reviewRes] = await Promise.all([
          supabase.from('consultations').select('id,appointment_id,status').in('appointment_id', apptIds),
          supabase.from('reviews').select('id,appointment_id').in('appointment_id', apptIds),
        ]);
        const m: Record<number, { id:number; status:string }> = {};
        (consultRes.data||[]).forEach((r:any)=> { m[r.appointment_id] = { id: r.id, status: r.status }; });
        setConsultByAppt(m);
        const rm: Record<number, boolean> = {};
        (reviewRes.data||[]).forEach((r:any)=> { rm[r.appointment_id] = true; });
        setReviewByAppt(rm);
      } catch {}
    };
    run();
  }, [items]);

  const viewConsultation = async (a: Appointment) => {
    try {
      const { data: c } = await supabase.from('consultations').select('id,status,chief_complaint,started_at,completed_at').eq('appointment_id', a.id).maybeSingle();
      if (!c) { await Swal.fire({ icon:'info', title:'Consultation not available yet' }); return; }
      const [vitalRes, dxRes, rxRes] = await Promise.all([
        supabase.from('consultation_vitals').select('measured_at,weight,temperature,heart_rate,notes').eq('consultation_id', (c as any).id).order('measured_at', { ascending:false }).limit(1),
        supabase.from('consultation_diagnoses').select('diagnosis_text,notes').eq('consultation_id', (c as any).id).order('id', { ascending:false }),
        supabase.from('consultation_prescriptions').select('medication_name,dosage,duration,instructions').eq('consultation_id', (c as any).id).order('id', { ascending:false }),
      ]);
      const v = (vitalRes.data||[])[0];
      const dx = dxRes.data||[];
      const rx = rxRes.data||[];
      const vitalsHtml = v ? `
        <div style='display:grid;grid-template-columns:1fr 1fr;gap:8px'>
          <div style='display:flex;justify-content:space-between;padding:8px;border-radius:12px;background:#f6f7f9'><span style='color:#6b7280'>Weight</span><b>${v.weight ?? '—'} kg</b></div>
          <div style='display:flex;justify-content:space-between;padding:8px;border-radius:12px;background:#f6f7f9'><span style='color:#6b7280'>Temperature</span><b>${v.temperature ?? '—'} °C</b></div>
          <div style='display:flex;justify-content:space-between;padding:8px;border-radius:12px;background:#f6f7f9'><span style='color:#6b7280'>Heart rate</span><b>${v.heart_rate ?? '—'} bpm</b></div>
        </div>
        <div style='margin-top:8px'>
          <div style='font-size:12px;color:#6b7280'>Notes</div>
          <div style='padding:8px;border-radius:12px;background:#f9fafb;border:1px solid #eef2f7'>${v.notes || '—'}</div>
        </div>` : '<div style="padding:8px;border-radius:12px;background:#fff;border:1px solid #eef2f7">—</div>';
      const dxHtml = dx.length ? dx.map((d:any,i:number)=> `<li style='border:1px solid #eef2f7;background:#fff;border-radius:12px;padding:10px'><div style='color:#2563eb;font-weight:600'>Diagnosis ${i+1}</div><div>${d.diagnosis_text}</div><div style='font-size:12px;color:#6b7280;margin-top:4px'>Notes</div><div>${d.notes || '—'}</div></li>`).join('') : '<li style="border:1px solid #eef2f7;background:#fff;border-radius:12px;padding:10px">—</li>';
      const rxHtml = rx.length ? rx.map((r:any,i:number)=> `<li style='border:1px solid #eef2f7;background:#fff;border-radius:12px;padding:10px'><div style='color:#2563eb;font-weight:600'>Prescription ${i+1}</div><div>${r.medication_name}</div><div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px'><div style='background:#f6f7f9;border-radius:10px;padding:8px;display:flex;justify-content:space-between'><span style='color:#6b7280'>Dosage</span><b>${r.dosage || '—'}</b></div><div style='background:#f6f7f9;border-radius:10px;padding:8px;display:flex;justify-content:space-between'><span style='color:#6b7280'>Duration</span><b>${r.duration || '—'}</b></div></div><div style='font-size:12px;color:#6b7280;margin-top:4px'>Instructions</div><div>${r.instructions || '—'}</div></li>`).join('') : '<li style="border:1px solid #eef2f7;background:#fff;border-radius:12px;padding:10px">—</li>';
      const html = `
        <div style='font-family:Poppins,ui-sans-serif;text-align:left;display:grid;gap:14px'>
          <div style='display:flex;justify-content:space-between;align-items:center'>
            <div style='font-size:13px;color:#6b7280'>${a.appointment_date} • ${a.appointment_time}</div>
            <span style='padding:4px 10px;border-radius:9999px;background:${(c as any).status==='completed'?'#DCFCE7':'#DBEAFE'};color:${(c as any).status==='completed'?'#166534':'#1E40AF'};font-size:12px;text-transform:capitalize'>${(c as any).status}</span>
          </div>
          <div>
            <div style='font-size:12px;color:#6b7280;margin-bottom:6px'>Vitals</div>
            ${vitalsHtml}
          </div>
          <div>
            <div style='font-size:12px;color:#6b7280;margin-bottom:6px'>Diagnoses</div>
            <ul style='display:grid;gap:8px'>${dxHtml}</ul>
          </div>
          <div>
            <div style='font-size:12px;color:#6b7280;margin-bottom:6px'>Prescriptions</div>
            <ul style='display:grid;gap:8px'>${rxHtml}</ul>
          </div>
        </div>`;
      await Swal.fire({ title: 'Consultation Summary', html, width: 680, showCloseButton: true, confirmButtonText: 'Close' });
    } catch (e:any) {
      await Swal.fire({ icon:'error', title:'Unable to load consultation', text: e?.message || 'Please try again.' });
    }
  };

  const formatDatePretty = (s: string) => {
    try {
      const [yy, mm, dd] = (s || "").split("-").map(Number);
      if (!yy || !mm || !dd) return s;
      const dt = new Date(Date.UTC(yy, (mm || 1) - 1, dd || 1));
      return dt.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
    } catch {
      return s;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
      <div className="mx-auto max-w-7xl space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header card like MyPetsPage */}
      <div className="rounded-lg sm:rounded-2xl md:rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-3 sm:p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg sm:rounded-xl bg-blue-600 text-white flex-shrink-0 grid place-items-center">
            <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm sm:text-base md:text-lg font-semibold text-neutral-900 truncate">My Appointments</div>
            <div className="text-[10px] sm:text-xs md:text-sm text-neutral-500 truncate">Book and manage your pet's visits</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <button onClick={()=> setViewMode(v => v==='List' ? 'Week' : 'List')} className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-[10px] sm:text-xs md:text-sm font-medium active:scale-95">{viewMode==='List' ? 'Week' : 'List'}</button>
          <button onClick={()=> setModalOpen(true)} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-[10px] sm:text-xs md:text-sm font-medium active:scale-95">
            <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" /> <span className="hidden sm:inline">New Appointment</span><span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Toolbar chips */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 text-xs sm:text-sm min-w-0">
          <span className="text-neutral-500 font-medium whitespace-nowrap">Status</span>
          <select value={status} onChange={(e)=> setStatus(e.target.value)} className="outline-none bg-transparent font-medium flex-1 min-w-0">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Canceled</option>
          </select>
        </div>
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 text-[10px] sm:text-xs md:text-sm flex-1 sm:flex-none min-w-0">
          <CalendarDaysIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-500 flex-shrink-0" />
          <input type="date" suppressHydrationWarning value={fromDate} onChange={(e)=> setFromDate(e.target.value)} className="outline-none bg-transparent font-medium flex-1 min-w-0 text-[10px] sm:text-xs" />
          <span className="text-neutral-400 px-0.5 flex-shrink-0">—</span>
          <input type="date" suppressHydrationWarning value={toDate} onChange={(e)=> setToDate(e.target.value)} className="outline-none bg-transparent font-medium flex-1 min-w-0 text-[10px] sm:text-xs" />
        </div>
        <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 flex-1 sm:flex-1 text-xs sm:text-sm min-w-0">
          <MagnifyingGlassIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-500 flex-shrink-0" />
          <input value={qRaw} onChange={(e)=> setQRaw(e.target.value)} placeholder="Search..." className="w-full outline-none bg-transparent text-xs sm:text-sm" />
        </div>
      </div>

      {viewMode === 'Week' ? (
        <div className="rounded-lg sm:rounded-xl md:rounded-2xl bg-white/70 backdrop-blur shadow ring-1 ring-gray-100 p-2.5 sm:p-3 md:p-4 overflow-x-auto">
          {(() => {
            const byDay: Record<string, Appointment[]> = {};
            items.forEach(a=>{ (byDay[a.appointment_date] ||= []).push(a); });
            const days = Object.keys(byDay).sort();
            if (days.length === 0) return <div className="text-[10px] sm:text-xs md:text-sm text-gray-600 text-center py-3 sm:py-4">No appointments in selected range.</div>;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 min-w-0">
                {days.map(d => (
                  <div key={d} className="rounded-lg sm:rounded-xl bg-white ring-1 ring-gray-100 p-2 sm:p-2.5 md:p-3 min-w-0">
                    <div className="text-[10px] sm:text-xs md:text-sm font-semibold text-blue-700 truncate">{formatDatePretty(d)}</div>
                    <ul className="mt-1.5 sm:mt-2 space-y-1.5 sm:space-y-2">
                      {byDay[d].map(a => (
                        <li key={a.id} className="rounded-lg bg-gray-50 p-1.5 sm:p-2 md:p-3 text-[10px] sm:text-xs md:text-sm">
                          <div className="font-medium text-blue-700 truncate">{a.appointment_time}</div>
                          <div className="text-[10px] sm:text-xs text-gray-600 truncate mt-0.5">{a.reason_for_visit || 'Consultation'}</div>
                          <span className={`inline-block mt-1 sm:mt-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] md:text-[11px] whitespace-nowrap ${a.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : a.status === 'pending' ? 'bg-amber-100 text-amber-700' : a.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      ) : (
      <div className="rounded-lg sm:rounded-xl md:rounded-2xl bg-white/70 backdrop-blur shadow ring-1 ring-gray-100">
        {loading ? (
          <ul className="divide-y animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="p-2.5 sm:p-3 md:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                  <div className="h-3 sm:h-4 w-full sm:w-48 md:w-56 bg-gray-200 rounded" />
                  <div className="h-2.5 sm:h-3 w-24 sm:w-32 md:w-40 bg-gray-100 rounded" />
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <div className="h-5 sm:h-6 w-10 sm:w-12 md:w-16 bg-gray-100 rounded-full" />
                  <div className="h-7 sm:h-8 w-14 sm:w-16 md:w-20 bg-gray-100 rounded hidden sm:block" />
                </div>
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="p-4 sm:p-6 md:p-10 text-center">
            <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl grid place-items-center bg-blue-50 text-blue-700 mb-2">
              <CalendarDaysIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="text-xs sm:text-sm text-gray-600">No appointments found</div>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Try adjusting filters or book a new appointment.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {items.map(a => (
              <li key={a.id} className="p-2 sm:p-3 md:p-4">
                <div className="rounded-lg sm:rounded-xl bg-white shadow-sm ring-1 ring-gray-100 p-2.5 sm:p-3 md:p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5 sm:gap-3 md:gap-4 hover:shadow-md transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start flex-wrap gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                      <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] md:text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200 line-clamp-1">
                        {(a.clinic_id && clinicsMap[a.clinic_id]?.name) || "-"}
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] md:text-xs text-gray-500 truncate mb-1">
                      {(a.patient_id && petsMap[a.patient_id]?.name) || "-"} • {(a.veterinarian_id && vetsMap[a.veterinarian_id]?.full_name) || "-"}
                    </div>
                    <div className="font-medium text-blue-700 text-xs sm:text-sm md:text-base truncate">{formatDatePretty(a.appointment_date)}</div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-blue-700">{a.appointment_time}</div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-gray-600 line-clamp-2 mt-1"><span className="font-medium">Reason:</span> {a.reason_for_visit || "Consultation"}</div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto flex-shrink-0">
                    <span className={`px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] md:text-xs font-medium text-center whitespace-nowrap ${a.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : a.status === "pending" ? "bg-amber-100 text-amber-700" : a.status === "completed" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{a.status === 'cancelled' ? 'canceled' : a.status}</span>
                    <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto">
                      {consultByAppt[a.id] && (
                        <button onClick={()=>viewConsultation(a)} className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-[10px] sm:text-[11px] md:text-sm font-medium transition active:scale-95 whitespace-nowrap">View</button>
                      )}
                      {a.status === 'completed' && !reviewByAppt[a.id] && (
                        <ReviewModal
                          appointmentId={a.id}
                          veterinarianId={a.veterinarian_id}
                          clinicId={a.clinic_id}
                          petOwnerId={a.pet_owner_id}
                          onSuccess={() => {
                            setReviewByAppt(prev => ({ ...prev, [a.id]: true }));
                          }}
                        />
                      )}
                      {a.status !== 'cancelled' && a.status !== 'completed' && (
                        <button onClick={async ()=> {
                          const res = await Swal.fire({ icon:'question', title:'Cancel?', showCancelButton:true, confirmButtonText:'Yes', confirmButtonColor:'#dc2626' });
                          if (!res.isConfirmed) return;
                          const { error } = await supabase.from('appointments').update({ status:'cancelled' }).eq('id', a.id);
                          if (error) { await Swal.fire({ icon:'error', title:'Failed', text:error.message }); return; }
                          setItems(prev => prev.map(it => it.id===a.id ? { ...it, status:'cancelled' } : it));
                          try { await supabase.from('notifications').insert({ title:'Appointment cancelled', message:`Appointment #${a.id} on ${a.appointment_date} • ${a.appointment_time}`, related_appointment_id: a.id, notification_type:'system' }); } catch {}
                          await Swal.fire({ icon:'success', title:'Canceled', confirmButtonColor:'#2563eb' });
                        }} className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 ring-1 ring-red-200 text-[10px] sm:text-[11px] md:text-sm font-medium transition active:scale-95 whitespace-nowrap">Cancel</button>
                      )}
                      {a.status !== 'cancelled' && (
                        <button 
                          disabled={a.status === 'confirmed' || a.status === 'completed' || a.status === 'in_progress'}
                          title={a.status === 'confirmed' || a.status === 'completed' || a.status === 'in_progress' ? 'Cannot reschedule confirmed appointments. Please contact the clinic to reschedule.' : 'Reschedule appointment'}
                          onClick={async ()=> {
                            if (a.status === 'confirmed' || a.status === 'completed' || a.status === 'in_progress') return;
                            const { value: form, isConfirmed } = await Swal.fire<{ date: string; time: string }>({
                              title: 'Reschedule',
                              html: `
                                <div class='text-left grid gap-2 font-[Poppins]'>
                                  <label class='text-xs text-gray-500'>Date</label>
                                  <input id='rs_date' type='date' class='swal2-input' value='${a.appointment_date}'/>
                                  <label class='text-xs text-gray-500 mt-1'>Time</label>
                                  <input id='rs_time' type='time' class='swal2-input' value='${a.appointment_time}'/>
                                </div>
                              `,
                              focusConfirm:false,
                              preConfirm: () => {
                                const date = (document.getElementById('rs_date') as HTMLInputElement)?.value;
                                const time = (document.getElementById('rs_time') as HTMLInputElement)?.value;
                                if (!date || !time) { Swal.showValidationMessage('Date and time are required'); return; }
                                const pd = date.split('-').map(Number);
                                const pt = time.split(':').map(Number);
                                const dt = new Date(Date.UTC(pd[0], (pd[1]||1)-1, pd[2]||1, pt[0]||0, pt[1]||0, 0));
                                const min = Date.now() + 30*60*1000; // 30 minutes from now
                                if (dt.getTime() < min) { Swal.showValidationMessage('Please choose a time at least 30 minutes from now'); return; }
                                return { date, time } as any;
                              }
                            });
                            if (!isConfirmed || !form) return;
                            let conflicts: any[] | null = [];
                            let cErr: any = null;
                            if (a.veterinarian_id) {
                              const res = await supabase
                                .from('appointments')
                                .select('id')
                                .eq('veterinarian_id', a.veterinarian_id)
                                .eq('appointment_date', form.date)
                                .eq('appointment_time', form.time)
                                .neq('id', a.id)
                                .limit(1);
                              conflicts = res.data;
                              cErr = res.error;
                            }
                            if (cErr) { await Swal.fire({ icon:'error', title:'Failed', text:cErr.message }); return; }
                            if ((conflicts?.length || 0) > 0) { await Swal.fire({ icon:'warning', title:'Conflict', text:'This time is not available.' }); return; }
                            const { error } = await supabase.from('appointments').update({ appointment_date: form.date, appointment_time: form.time }).eq('id', a.id);
                            if (error) { await Swal.fire({ icon:'error', title:'Failed', text:error.message }); return; }
                            setItems(prev => prev.map(it => it.id===a.id ? { ...it, appointment_date: form.date, appointment_time: form.time } : it));
                            try { await supabase.from('notifications').insert({ title:'Appointment rescheduled', message:`Appointment #${a.id} → ${form.date} • ${form.time}`, related_appointment_id: a.id, notification_type:'system' }); } catch {}
                            await Swal.fire({ icon:'success', title:'Rescheduled', confirmButtonColor:'#2563eb' });
                          }} 
                          className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] md:text-sm font-medium transition active:scale-95 whitespace-nowrap ${
                            a.status === 'confirmed' || a.status === 'completed' || a.status === 'in_progress'
                              ? 'bg-gray-100 text-gray-400 ring-1 ring-gray-200 cursor-not-allowed opacity-60'
                              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 ring-1 ring-purple-200'
                          }`}
                        >
                          Reschedule
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
            <li className="p-2 sm:p-2">
              <div ref={sentinelRef} className="h-6 sm:h-8 w-full text-center text-[10px] sm:text-xs text-gray-400">{hasMore ? 'Loading more…' : '– End of results –'}</div>
            </li>
          </ul>
        )}
      </div>
      )}

      <CreateAppointmentModal
        open={modalOpen}
        ownerId={ownerId}
        onClose={() => setModalOpen(false)}
        onCreated={(appt) => {
          setItems(prev => [...prev, appt]);
        }}
      />
      </div>
    </div>
  );
}
