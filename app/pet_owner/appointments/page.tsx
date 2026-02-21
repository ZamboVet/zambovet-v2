"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { CalendarDaysIcon, PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import CreateAppointmentModal from "../components/CreateAppointmentModal";
import ReviewModal from "../components/ReviewModal";
import { localISODate } from "../../../lib/utils/time";

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

/**
 * Verify current user owns the appointment before modifying it.
 * Returns the verified owner ID or null if verification fails.
 */
async function verifyAppointmentOwnership(appointmentId: number): Promise<number | null> {
  try {
    // Get current authenticated user
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return null;

    // Get owner profile for current user
    const { data: ownerRow } = await supabase
      .from("pet_owner_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!ownerRow?.id) return null;

    // Verify the appointment belongs to this owner
    const { data: appt } = await supabase
      .from("appointments")
      .select("id,pet_owner_id")
      .eq("id", appointmentId)
      .eq("pet_owner_id", ownerRow.id)
      .maybeSingle();
    
    if (!appt) return null;
    return ownerRow.id;
  } catch {
    return null;
  }
}

export default function OwnerAppointmentsPage() {
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  
  // AbortController for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    try {
      const f = localISODate();
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
      const t = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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

  // AJAX fetch function with abort support
  const fetchAppointments = useCallback(async (isLoadMore = false) => {
    if (!ownerId || !fromDate || !toDate) return;
    
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const currentFetchId = ++fetchIdRef.current;
    
    // Set appropriate loading state
    if (isLoadMore) {
      setFetchingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }
    
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
      if (query.trim()) {
        q = q.ilike("reason_for_visit", `%${query.trim()}%`);
      }
      
      const { data, error: fetchError } = await q;
      
      // Check if this request is still valid (not superseded by newer request)
      if (currentFetchId !== fetchIdRef.current) return;
      
      if (fetchError) throw fetchError;
      
      const arr = (data || []) as Appointment[];
      setItems(arr);
      setHasMore(arr.length === page * PAGE_SIZE);
      setError(null);
    } catch (e: any) {
      // Ignore abort errors
      if (e?.name === 'AbortError') return;
      
      // Check if this request is still valid
      if (currentFetchId !== fetchIdRef.current) return;
      
      setError(e?.message || "Failed to fetch appointments");
      console.error("Fetch appointments error:", e);
    } finally {
      // Only update loading state if this is still the current request
      if (currentFetchId === fetchIdRef.current) {
        setLoading(false);
        setFetchingMore(false);
      }
    }
  }, [ownerId, status, query, fromDate, toDate, page]);

  // Trigger fetch when dependencies change
  useEffect(() => {
    fetchAppointments(page > 1);
    
    // Cleanup: abort on unmount or dependency change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAppointments]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [status, query, fromDate, toDate]);

  // Realtime: simplify to reset pagination and let fetchList run
  useEffect(() => {
    if (!ownerId) return;
    const ch = supabase
      .channel("appointments-owner-" + ownerId)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `pet_owner_id=eq.${ownerId}` }, () => {
        setPage(1);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ownerId]);

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
          <div style='display:flex;justify-content:space-between;padding:8px;border-radius:12px;background:#f6f7f9'><span style='color:#6b7280'>Weight</span><b>${v.weight ?? '-'} kg</b></div>
          <div style='display:flex;justify-content:space-between;padding:8px;border-radius:12px;background:#f6f7f9'><span style='color:#6b7280'>Temperature</span><b>${v.temperature ?? '-'} C</b></div>
          <div style='display:flex;justify-content:space-between;padding:8px;border-radius:12px;background:#f6f7f9'><span style='color:#6b7280'>Heart rate</span><b>${v.heart_rate ?? '-'} bpm</b></div>
        </div>
        <div style='margin-top:8px'>
          <div style='font-size:12px;color:#6b7280'>Notes</div>
          <div style='padding:8px;border-radius:12px;background:#f9fafb;border:1px solid #eef2f7'>${v.notes || '-'}</div>
        </div>` : '<div style="padding:8px;border-radius:12px;background:#fff;border:1px solid #eef2f7">-</div>';
      const dxHtml = dx.length ? dx.map((d:any,i:number)=> `<li style='border:1px solid #eef2f7;background:#fff;border-radius:12px;padding:10px'><div style='color:#2563eb;font-weight:600'>Diagnosis ${i+1}</div><div>${d.diagnosis_text}</div><div style='font-size:12px;color:#6b7280;margin-top:4px'>Notes</div><div>${d.notes || '-'}</div></li>`).join('') : '<li style="border:1px solid #eef2f7;background:#fff;border-radius:12px;padding:10px">-</li>';
      const rxHtml = rx.length ? rx.map((r:any,i:number)=> `<li style='border:1px solid #eef2f7;background:#fff;border-radius:12px;padding:10px'><div style='color:#2563eb;font-weight:600'>Prescription ${i+1}</div><div>${r.medication_name}</div><div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px'><div style='background:#f6f7f9;border-radius:10px;padding:8px;display:flex;justify-content:space-between'><span style='color:#6b7280'>Dosage</span><b>${r.dosage || '-'}</b></div><div style='background:#f6f7f9;border-radius:10px;padding:8px;display:flex;justify-content:space-between'><span style='color:#6b7280'>Duration</span><b>${r.duration || '-'}</b></div></div><div style='font-size:12px;color:#6b7280;margin-top:4px'>Instructions</div><div>${r.instructions || '-'}</div></li>`).join('') : '<li style="border:1px solid #eef2f7;background:#fff;border-radius:12px;padding:10px">-</li>';
      const html = `
        <div style='font-family:Poppins,ui-sans-serif;text-align:left;display:grid;gap:14px'>
          <div style='display:flex;justify-content:space-between;align-items:center'>
            <div style='font-size:13px;color:#6b7280'>${a.appointment_date} - ${a.appointment_time}</div>
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
    <div className="min-h-dvh bg-neutral-50">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-5 md:pt-6">
        {/* Header Card - Matches My Pets page style */}
        <div className="rounded-lg sm:rounded-2xl bg-white/70 backdrop-blur ring-1 ring-neutral-200 shadow-sm px-3 sm:px-4 md:px-5 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center flex-shrink-0">
              <CalendarDaysIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-semibold text-neutral-900 truncate">My Appointments</h1>
              <p className="text-[10px] sm:text-xs md:text-sm text-neutral-500 truncate">Book and manage your pet visits</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button 
              onClick={()=> setViewMode(v => v==='List' ? 'Week' : 'List')} 
              className="flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-[10px] sm:text-xs md:text-sm font-medium active:scale-95"
            >
              {viewMode==='List' ? 'Week View' : 'List View'}
            </button>
            <button 
              onClick={()=> setModalOpen(true)} 
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-[10px] sm:text-xs md:text-sm font-medium active:scale-95"
            >
              <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>New Appointment</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6 space-y-3 sm:space-y-4">
      {ownerId === null && (
        <div className="rounded-lg sm:rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-3 sm:p-4 text-amber-800">
          <div className="font-medium mb-1 text-sm">Profile incomplete</div>
          <div className="text-xs sm:text-sm">Please complete your profile to continue booking and managing appointments. <a href="/pet_owner/settings" className="underline font-medium hover:text-amber-900">Go to Settings</a></div>
        </div>
      )}

      {/* Filters - Matches Clinics page style */}
      <div className="sticky top-2 z-10">
        <div className="rounded-lg sm:rounded-2xl bg-white/80 backdrop-blur ring-1 ring-neutral-200 p-2.5 sm:p-3 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 items-stretch lg:items-center">
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-sm flex-1 lg:flex-none lg:min-w-[180px]">
              <span className="text-neutral-500 font-medium text-[10px] sm:text-xs whitespace-nowrap">Status</span>
              <select 
                value={status} 
                onChange={(e)=> setStatus(e.target.value)} 
                className="outline-none bg-transparent font-medium flex-1 min-w-0 text-xs sm:text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 text-[10px] sm:text-xs shadow-sm flex-1 lg:flex-none min-w-0">
              <CalendarDaysIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-500 flex-shrink-0" />
              <input type="date" suppressHydrationWarning value={fromDate} onChange={(e)=> setFromDate(e.target.value)} className="outline-none bg-transparent font-medium flex-1 min-w-0 text-[10px] sm:text-xs" />
              <span className="text-neutral-400 px-0.5 flex-shrink-0">-</span>
              <input type="date" suppressHydrationWarning value={toDate} onChange={(e)=> setToDate(e.target.value)} className="outline-none bg-transparent font-medium flex-1 min-w-0 text-[10px] sm:text-xs" />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 flex-1 shadow-sm text-xs sm:text-sm min-w-0">
              <MagnifyingGlassIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-500 flex-shrink-0" />
              <input 
                value={qRaw} 
                onChange={(e)=> setQRaw(e.target.value)} 
                placeholder="Search..." 
                className="w-full outline-none bg-transparent text-xs sm:text-sm" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error display with retry */}
      {error && (
        <div className="rounded-lg sm:rounded-2xl bg-red-50 ring-1 ring-red-200 p-3 sm:p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-red-800">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs sm:text-sm font-medium">{error}</span>
          </div>
          <button 
            onClick={() => fetchAppointments()} 
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs sm:text-sm font-medium hover:bg-red-700 active:scale-95 whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      {viewMode === 'Week' ? (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-4">
          {(() => {
            const byDay: Record<string, Appointment[]> = {};
            items.forEach(a=>{ (byDay[a.appointment_date] ||= []).push(a); });
            const days = Object.keys(byDay).sort();
            if (days.length === 0) return (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 grid place-items-center mb-3">
                  <CalendarDaysIcon className="w-8 h-8" />
                </div>
                <div className="text-sm font-medium text-neutral-900">No appointments found</div>
                <div className="text-sm text-neutral-500 mt-1">Try adjusting your date range or filters</div>
              </div>
            );
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {days.map(d => (
                  <div key={d} className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4 hover:shadow-md transition-shadow">
                    <div className="text-sm font-bold text-blue-900 mb-3">{formatDatePretty(d)}</div>
                    <ul className="space-y-2">
                      {byDay[d].map(a => (
                        <li key={a.id} className="rounded-lg bg-white shadow-sm border border-neutral-100 p-3 hover:shadow transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-blue-700 text-sm">{a.appointment_time}</div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${a.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : a.status === 'pending' ? 'bg-amber-100 text-amber-700' : a.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-600'}`}>
                              {a.status}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-600 line-clamp-2">{a.reason_for_visit || 'General consultation'}</div>
                          {a.patient_id && petsMap[a.patient_id] && (
                            <div className="text-xs text-neutral-500 mt-1.5">Pet: {petsMap[a.patient_id].name}</div>
                          )}
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
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100">
        {loading ? (
          <div className="divide-y divide-neutral-100 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-48 bg-neutral-200 rounded" />
                    <div className="h-3 w-32 bg-neutral-100 rounded" />
                    <div className="h-3 w-64 bg-neutral-100 rounded" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-20 bg-neutral-100 rounded-lg" />
                    <div className="h-8 w-16 bg-neutral-100 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 grid place-items-center mb-4">
              <CalendarDaysIcon className="w-8 h-8" />
            </div>
            <div className="text-base font-semibold text-neutral-900">No appointments found</div>
            <p className="text-sm text-neutral-500 mt-2">Try adjusting your filters or book a new appointment to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {items.map(a => (
              <div key={a.id} className="p-4 hover:bg-neutral-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${a.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : a.status === "pending" ? "bg-amber-100 text-amber-700" : a.status === "completed" ? "bg-blue-100 text-blue-700" : "bg-neutral-100 text-neutral-600"}`}>
                        {a.status === 'confirmed' ? 'Confirmed' : a.status === 'pending' ? 'Pending' : a.status === 'completed' ? 'Completed' : 'Cancelled'}
                      </span>
                      {(a.clinic_id && clinicsMap[a.clinic_id]?.name) && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {clinicsMap[a.clinic_id].name}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <div className="text-lg font-bold text-blue-700">{formatDatePretty(a.appointment_date)}</div>
                        <div className="text-sm font-semibold text-blue-600">{a.appointment_time}</div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-neutral-600">
                        {a.patient_id && petsMap[a.patient_id] && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{petsMap[a.patient_id].name}</span>
                          </div>
                        )}
                        {a.veterinarian_id && vetsMap[a.veterinarian_id] && (
                          <div className="flex items-center gap-1.5">
                            <span>Dr. {vetsMap[a.veterinarian_id].full_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-neutral-700">
                        <span className="font-semibold">Reason:</span> {a.reason_for_visit || "General consultation"}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 flex-shrink-0">
                      {consultByAppt[a.id] && (
                        <button onClick={()=>viewConsultation(a)} className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold shadow-sm transition-all active:scale-95 whitespace-nowrap">
                          View Details
                        </button>
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
                          const res = await Swal.fire({ icon:'question', title:'Cancel Appointment?', text:'This action cannot be undone.', showCancelButton:true, confirmButtonText:'Yes, Cancel', cancelButtonText:'Keep It', confirmButtonColor:'#dc2626' });
                          if (!res.isConfirmed) return;
                          const verifiedOwnerId = await verifyAppointmentOwnership(a.id);
                          if (!verifiedOwnerId) {
                            await Swal.fire({ icon:'error', title:'Unauthorized', text:'You do not have permission to cancel this appointment.' });
                            return;
                          }
                          const { error } = await supabase.from('appointments').update({ status:'cancelled' }).eq('id', a.id).eq('pet_owner_id', verifiedOwnerId);
                          if (error) { await Swal.fire({ icon:'error', title:'Failed', text:error.message }); return; }
                          setItems(prev => prev.map(it => it.id===a.id ? { ...it, status:'cancelled' } : it));
                          try { await supabase.from('notifications').insert({ user_id: (await supabase.auth.getUser()).data.user?.id, title:'Appointment cancelled', message:`Appointment #${a.id} on ${a.appointment_date} at ${a.appointment_time}`, related_appointment_id: a.id, notification_type:'system' }); } catch {}
                          await Swal.fire({ icon:'success', title:'Cancelled Successfully', confirmButtonColor:'#2563eb' });
                        }} className="px-4 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-sm font-semibold transition-all active:scale-95 whitespace-nowrap">
                          Cancel
                        </button>
                      )}
                      {a.status !== 'cancelled' && (
                        <button 
                          disabled={a.status === 'confirmed' || a.status === 'completed' || a.status === 'in_progress'}
                          title={a.status === 'confirmed' || a.status === 'completed' || a.status === 'in_progress' ? 'Cannot reschedule confirmed appointments. Please contact the clinic.' : 'Reschedule appointment'}
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
                                const dt = new Date(pd[0] || 1970, (pd[1]||1)-1, pd[2]||1, pt[0]||0, pt[1]||0, 0);
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
                            // Verify ownership server-side before rescheduling
                            const verifiedOwnerId = await verifyAppointmentOwnership(a.id);
                            if (!verifiedOwnerId) {
                              await Swal.fire({ icon:'error', title:'Unauthorized', text:'You do not have permission to reschedule this appointment.' });
                              return;
                            }
                            const { error } = await supabase.from('appointments').update({ appointment_date: form.date, appointment_time: form.time }).eq('id', a.id).eq('pet_owner_id', verifiedOwnerId);
                            if (error) { await Swal.fire({ icon:'error', title:'Failed', text:error.message }); return; }
                            setItems(prev => prev.map(it => it.id===a.id ? { ...it, appointment_date: form.date, appointment_time: form.time } : it));
                            try { await supabase.from('notifications').insert({ user_id: (await supabase.auth.getUser()).data.user?.id, title:'Appointment rescheduled', message:`Appointment #${a.id} moved to ${form.date} at ${form.time}`, related_appointment_id: a.id, notification_type:'system' }); } catch {}
                            await Swal.fire({ icon:'success', title:'Rescheduled', confirmButtonColor:'#2563eb' });
                          }} 
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 whitespace-nowrap ${
                            a.status === 'confirmed' || a.status === 'completed' || a.status === 'in_progress'
                              ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed opacity-60'
                              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                          }`}
                        >
                          Reschedule
                        </button>
                      )}
                  </div>
                </div>
              </div>
            ))}
            <div className="p-4">
              <div ref={sentinelRef} className="h-8 w-full text-center text-sm text-neutral-400 font-medium flex items-center justify-center gap-2">
                {fetchingMore ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Loading more...</span>
                  </>
                ) : hasMore ? (
                  <span>Scroll for more</span>
                ) : (
                  <span>All appointments loaded</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      )}
      </div>
      <CreateAppointmentModal
        open={modalOpen}
        ownerId={ownerId}
        onClose={() => setModalOpen(false)}
        onCreated={(appt) => {
          setItems((prev) => [...prev, appt]);
        }}
      />
    </div>
  );
}
