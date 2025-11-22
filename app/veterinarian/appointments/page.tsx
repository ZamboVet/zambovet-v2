"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { getCurrentVet } from "../../../lib/utils/currentVet";
import { Poppins } from "next/font/google";
import { FunnelIcon, MagnifyingGlassIcon, ArrowPathIcon, CheckCircleIcon, XCircleIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const PRIMARY = "#2563eb";

 type Profile = { id: string; email: string; full_name: string | null; user_role: string; };
 type Vet = { id: number; user_id: string; full_name: string; };
 type Appointment = {
  id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason_for_visit: string | null;
  clinic_id: number | null;
  pet_owner_id: number | null;
  patient_id: number | null;
 };

const PAGE_SIZE = 10;

function VetAppointmentsPageInner() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vet, setVet] = useState<Vet | null>(null);
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"List" | "Week">("List");
  // removed date range filter
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [ownerId, setOwnerId] = useState<number | "all">("all");
  const [patientId, setPatientId] = useState<number | "all">("all");
  const [clinicId, setClinicId] = useState<number | "all">("all");
  const [ownersMap, setOwnersMap] = useState<Record<number, { name: string; email: string | null }>>({});
  const [patientsMap, setPatientsMap] = useState<Record<number, { name: string; species: string | null }>>({});
  const [clinicsMap, setClinicsMap] = useState<Record<number, { name: string }>>({});

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const init = async () => {
      try {
        const { profile, vet } = await getCurrentVet();
        setProfile(profile as any);
        if (!vet) {
          setVet(null);
          setItems([]);
          setLoading(false);
          return;
        }
        setVet({ id: vet.id, user_id: vet.user_id, full_name: vet.full_name });
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Failed to load", text: err?.message || "Please try again." });
        window.location.href = "/login";
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchList = async () => {
      if (!vet) return;
      setLoading(true);
      try {
        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        let q = supabase
          .from("appointments")
          .select("id,appointment_date,appointment_time,status,reason_for_visit,clinic_id,pet_owner_id,patient_id", { count: "exact" })
          .eq("veterinarian_id", vet.id)
          // removed date range filter
          .order("appointment_date", { ascending: true })
          .order("appointment_time", { ascending: true })
          .range(from, to);

        if (status !== "all") q = q.eq("status", status);
        if (ownerId !== "all") q = q.eq("pet_owner_id", ownerId as number);
        if (patientId !== "all") q = q.eq("patient_id", patientId as number);
        if (clinicId !== "all") q = q.eq("clinic_id", clinicId as number);
        if (query.trim()) q = q.ilike("reason_for_visit", `%${query.trim()}%`);

        const { data, error, count } = await q;
        if (error) throw error;
        setItems((data || []) as Appointment[]);
        setTotal(count || 0);

        // Enrich maps for filters and display
        const ownerIds = Array.from(new Set((data || []).map(d => d.pet_owner_id).filter(Boolean))) as number[];
        const patientIds = Array.from(new Set((data || []).map(d => d.patient_id).filter(Boolean))) as number[];
        const clinicIds = Array.from(new Set((data || []).map(d => d.clinic_id).filter(Boolean))) as number[];

        const [ownersRes, patientsRes, clinicsRes] = await Promise.all([
          ownerIds.length ? supabase.from("pet_owner_profiles").select("id,full_name,email").in("id", ownerIds) : Promise.resolve({ data: [] as any[] }),
          patientIds.length ? supabase.from("patients").select("id,name,species").in("id", patientIds) : Promise.resolve({ data: [] as any[] }),
          clinicIds.length ? supabase.from("clinics").select("id,name").in("id", clinicIds) : Promise.resolve({ data: [] as any[] }),
        ]);
        const ownersArr = Array.isArray(ownersRes?.data) ? ownersRes!.data as any[] : [];
        const patientsArr = Array.isArray(patientsRes?.data) ? patientsRes!.data as any[] : [];
        const clinicsArr = Array.isArray(clinicsRes?.data) ? clinicsRes!.data as any[] : [];
        const om: Record<number, { name: string; email: string | null }> = {};
        ownersArr.forEach(r => { om[r.id] = { name: r.full_name || r.email || `Owner ${r.id}`, email: r.email || null }; });
        const pm: Record<number, { name: string; species: string | null }> = {};
        patientsArr.forEach(r => { pm[r.id] = { name: r.name || `Patient ${r.id}`, species: r.species || null }; });
        const cm: Record<number, { name: string }> = {};
        clinicsArr.forEach(r => { cm[r.id] = { name: r.name || `Clinic ${r.id}` }; });
        setOwnersMap(om); setPatientsMap(pm); setClinicsMap(cm);
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Failed to fetch", text: err?.message || "Please try again." });
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [vet, status, query, ownerId, patientId, clinicId, page]);

  // Realtime updates
  useEffect(() => {
    if (!vet) return;
    const ch = supabase.channel("appointments-vet-" + vet.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `veterinarian_id=eq.${vet.id}` }, () => {
        setPage(1);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [vet]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const formatLongDate = (isoDate: string) => {
    try {
      const d = new Date(isoDate + 'T00:00:00');
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return isoDate; }
  };
  const formatTime = (t: string) => String(t).slice(0,8);

  const canTransition = (current: string, next: string) => {
    if (next === 'confirmed') return current === 'pending';
    if (next === 'completed') return current === 'confirmed' || current === 'in_progress';
    if (next === 'cancelled') return current === 'pending' || current === 'confirmed';
    return true;
  };

  const updateStatus = async (id: number, current: string, next: string, confirmText: string) => {
    if (!canTransition(current, next)) {
      await Swal.fire({ icon: 'info', title: 'Action not allowed', text: `You cannot set status to "${next}" from "${current}".` });
      return;
    }
    const res = await Swal.fire({ icon: "question", title: confirmText, showCancelButton: true, confirmButtonText: "Confirm" });
    if (!res.isConfirmed) return;
    const { error } = await supabase.from("appointments").update({ status: next }).eq("id", id);
    if (error) {
      await Swal.fire({ icon: "error", title: "Update failed", text: error.message });
      return;
    }
    // Get appointment details BEFORE updating state
    const apptItem = items.find(it => it.id === id);
    
    setItems(prev => prev.map(it => (it.id === id ? { ...it, status: next } : it)));
    try {
      const title = next === 'confirmed' ? 'Appointment confirmed' : next === 'completed' ? 'Appointment completed' : next === 'no_show' ? 'Appointment marked no-show' : next === 'canceled' ? 'Appointment canceled' : 'Appointment updated';
      // Get the appointment details to find pet owner's user_id
      if (apptItem?.pet_owner_id) {
        const { data: ownerData } = await supabase.from('pet_owner_profiles').select('user_id').eq('id', apptItem.pet_owner_id).maybeSingle();
        const ownerUserId = (ownerData as any)?.user_id;
        if (ownerUserId) {
          console.log('📢 Sending notification to user:', ownerUserId);
          await supabase.from('notifications').insert({ user_id: ownerUserId, title, message: `Appointment #${id} → ${next}`, related_appointment_id: id, notification_type: 'system' });
          
          // Send push notification
          console.log('📤 Calling push notification API...');
          const response = await fetch('/api/send-push-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: ownerUserId,
              title: next === 'confirmed' ? '✨ Appointment Confirmed!' : `Appointment ${next}`,
              message: `Your appointment #${id} status: ${next}`,
              data: { appointmentId: id },
              notificationType: `appointment_${next}`
            })
          });
          const result = await response.json();
          console.log('✅ Push notification response:', result);
        }
      }
    } catch (err) {
      console.error('❌ Error sending notification:', err);
    }
    await Swal.fire({ icon: "success", title: "Status updated" });
  };

  const reschedule = async (a: Appointment) => {
    const { value: form, isConfirmed } = await Swal.fire<{ date: string; time: string }>({
      title: "Reschedule appointment",
      html: `
        <div class='text-left grid gap-2 font-[Poppins]'>
          <label class='text-xs text-gray-500'>Date</label>
          <input id='rs_date' type='date' class='swal2-input' value='${a.appointment_date}'/>
          <label class='text-xs text-gray-500 mt-1'>Time</label>
          <input id='rs_time' type='time' class='swal2-input' value='${a.appointment_time}'/>
        </div>
      `,
      focusConfirm: false,
      preConfirm: () => {
        const date = (document.getElementById('rs_date') as HTMLInputElement)?.value;
        const time = (document.getElementById('rs_time') as HTMLInputElement)?.value;
        if (!date || !time) { Swal.showValidationMessage('Date and time are required'); return; }
        return { date, time };
      }
    });
    if (!isConfirmed || !form) return;
    const { data: conflicts, error: cErr } = await supabase
      .from("appointments")
      .select("id")
      .eq("veterinarian_id", (vet as Vet).id)
      .eq("appointment_date", form.date)
      .eq("appointment_time", form.time)
      .neq("id", a.id)
      .limit(1);
    if (cErr) { await Swal.fire({ icon: 'error', title: 'Check failed', text: cErr.message }); return; }
    if ((conflicts?.length || 0) > 0) { await Swal.fire({ icon: 'warning', title: 'Time conflict', text: 'You already have an appointment at this time.' }); return; }
    const { error } = await supabase.from("appointments").update({ appointment_date: form.date, appointment_time: form.time }).eq("id", a.id);
    if (error) { await Swal.fire({ icon: 'error', title: 'Reschedule failed', text: error.message }); return; }
    setItems(prev => prev.map(it => it.id === a.id ? { ...it, appointment_date: form.date, appointment_time: form.time } : it));
    try {
      // Get the appointment's pet owner's user_id for notification
      if (a.pet_owner_id) {
        const { data: ownerData } = await supabase.from('pet_owner_profiles').select('user_id').eq('id', a.pet_owner_id).maybeSingle();
        const ownerUserId = (ownerData as any)?.user_id;
        if (ownerUserId) {
          await supabase.from('notifications').insert({ user_id: ownerUserId, title: 'Appointment rescheduled', message: `Appointment #${a.id} → ${form.date} • ${form.time}`, related_appointment_id: a.id, notification_type: 'system' });
          
          // Send push notification
          await fetch('/api/send-push-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: ownerUserId,
              title: '📅 Appointment Rescheduled',
              message: `Your appointment has been rescheduled to ${form.date} at ${form.time}`,
              data: { appointmentId: a.id },
              notificationType: 'appointment_rescheduled'
            })
          }).catch(err => console.error('Push notification failed:', err));
        }
      }
    } catch {}
    await Swal.fire({ icon: 'success', title: 'Rescheduled' });
  };

  const showDetails = async (a: Appointment) => {
    try {
      const [{ data: pat }, { data: owner }] = await Promise.all([
        a.patient_id ? supabase.from("patients").select("id,name,species,breed,owner_id").eq("id", a.patient_id).maybeSingle() : Promise.resolve({ data: null }),
        a.pet_owner_id ? supabase.from("pet_owner_profiles").select("id,full_name").eq("id", a.pet_owner_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const statusMap: Record<string, { bg: string; fg: string }> = {
        confirmed: { bg: '#DCFCE7', fg: '#166534' },
        pending: { bg: '#FEF3C7', fg: '#92400E' },
        completed: { bg: '#DBEAFE', fg: '#1E40AF' },
        cancelled: { bg: '#F3F4F6', fg: '#374151' },
        no_show: { bg: '#F3F4F6', fg: '#374151' },
        in_progress: { bg: '#E0E7FF', fg: '#3730A3' }
      };
      const st = statusMap[String(a.status)] || { bg: '#F3F4F6', fg: '#374151' };
      const clinicName = a.clinic_id ? (clinicsMap[a.clinic_id]?.name || `Clinic #${a.clinic_id}`) : '-';
      const patientLine = pat ? `${pat.name}${pat.species ? ` (${pat.species}${pat.breed ? ` • ${pat.breed}` : ''})` : ''}` : '-';
      const ownerLine = owner?.full_name || '-';
      const reason = a.reason_for_visit || 'Consultation';
      const html = `
        <div style="font-family:Poppins,ui-sans-serif;text-align:left;display:grid;gap:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div style="font-size:14px;color:#6b7280">${a.appointment_date} • ${a.appointment_time}</div>
            <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:9999px;background:${st.bg};color:${st.fg};font-size:12px;text-transform:capitalize">${a.status.replace('_',' ')}</span>
          </div>
          <div style="display:grid;gap:6px">
            <div style="font-size:12px;color:#6b7280">Reason</div>
            <div style="padding:10px 12px;border-radius:12px;background:#f9fafb;color:#374151;border:1px solid #eef2f7">${reason}</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div style="display:grid;gap:6px">
              <div style="font-size:12px;color:#6b7280">Patient</div>
              <div style="font-size:14px;color:#111827;font-weight:600">${patientLine}</div>
            </div>
            <div style="display:grid;gap:6px">
              <div style="font-size:12px;color:#6b7280">Owner</div>
              <div style="font-size:14px;color:#111827;font-weight:600">${ownerLine}</div>
            </div>
          </div>
          <div style="display:grid;gap:6px">
            <div style="font-size:12px;color:#6b7280">Clinic</div>
            <div style="font-size:14px;color:#111827">${clinicName}</div>
          </div>
        </div>`;
      await Swal.fire({ title: "Appointment Details", html, showCloseButton: true, focusConfirm: false, confirmButtonText: "Close" });
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Failed to load details", text: err?.message || "Please try again." });
    }
  };

  return (
    <div className={`${poppins.className} space-y-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>Appointments</h1>
          <p className="text-sm text-gray-500">Manage and track your upcoming and past consultations</p>
        </div>
        <button onClick={() => setPage(1)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 ring-1 ring-gray-100 hover:bg-white transition active:scale-[.98]">
          <ArrowPathIcon className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending" },
          { key: "confirmed", label: "Confirmed" },
          { key: "completed", label: "Completed" },
          { key: "cancelled", label: "Cancelled" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setPage(1); setStatus(t.key); }}
            className={`px-3 py-1.5 rounded-full text-sm transition whitespace-nowrap ${status===t.key ? "bg-blue-600 text-white shadow" : "bg-white/80 ring-1 ring-gray-100 hover:bg-white text-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-white/80 ring-1 ring-gray-100 min-w-max">
          <FunnelIcon className="w-4 h-4 text-gray-500" />
          <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="text-sm outline-none bg-transparent">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        {/* date range filter removed */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-white/80 ring-1 ring-gray-100 min-w-max">
          <span className="text-xs text-gray-500">Owner</span>
          <select value={ownerId as any} onChange={(e)=>{ setPage(1); setOwnerId(e.target.value === 'all' ? 'all' : Number(e.target.value)); }} className="text-sm outline-none bg-transparent">
            <option value="all">All</option>
            {Object.entries(ownersMap).map(([id, o])=> (<option key={id} value={id}>{o.name}</option>))}
          </select>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-white/80 ring-1 ring-gray-100 min-w-max">
          <span className="text-xs text-gray-500">Patient</span>
          <select value={patientId as any} onChange={(e)=>{ setPage(1); setPatientId(e.target.value === 'all' ? 'all' : Number(e.target.value)); }} className="text-sm outline-none bg-transparent">
            <option value="all">All</option>
            {Object.entries(patientsMap).map(([id, p])=> (<option key={id} value={id}>{p.name}</option>))}
          </select>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-white/80 ring-1 ring-gray-100 min-w-max">
          <span className="text-xs text-gray-500">Clinic</span>
          <select value={clinicId as any} onChange={(e)=>{ setPage(1); setClinicId(e.target.value === 'all' ? 'all' : Number(e.target.value)); }} className="text-sm outline-none bg-transparent">
            <option value="all">All</option>
            {Object.entries(clinicsMap).map(([id, c])=> (<option key={id} value={id}>{c.name}</option>))}
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 ring-1 ring-gray-100 flex-1 min-w-0">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-500" />
          <input value={query} onChange={(e) => { setPage(1); setQuery(e.target.value); }} placeholder="Search owner/patient/clinic/reason" className="w-full outline-none text-sm bg-transparent" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setViewMode(v=> v==='List'?'Week':'List')} className="px-3 py-2 rounded-xl bg-white/80 ring-1 ring-gray-100">{viewMode==='List'?'Week view':'List view'}</button>
        </div>
      </div>

      {viewMode === 'Week' ? (
        <div className="rounded-2xl bg-white/70 backdrop-blur shadow ring-1 ring-gray-100 p-4">
          {(() => {
            const byDay: Record<string, Appointment[]> = {};
            items.forEach(a => { (byDay[a.appointment_date] ||= []).push(a); });
            const days = Object.keys(byDay).sort();
            if (days.length === 0) {
              return <div className="text-sm text-gray-600">No appointments in selected range.</div>;
            }
            return (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {days.map(d => (
                  <div key={d} className="rounded-xl bg-white ring-1 ring-gray-100 p-3">
                    <div className="text-sm font-semibold" style={{ color: PRIMARY }}>{d}</div>
                    <ul className="mt-2 space-y-2">
                      {byDay[d].map(a => (
                        <li key={a.id} className="rounded-lg bg-gray-50 p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium" style={{ color: PRIMARY }}>{a.appointment_time}</div>
                              <div className="text-xs text-gray-600 truncate">{a.reason_for_visit || 'Consultation'}</div>
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${a.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : a.status === 'pending' ? 'bg-amber-100 text-amber-700' : a.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{a.status.replace('_', ' ')}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {a.status === 'completed' ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-xs font-medium">Done</span>
                            ) : (
                              <Link href={`/veterinarian/consultations/${a.id}`} className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 font-medium">Consult</Link>
                            )}
                            <button onClick={() => showDetails(a)} className="px-2.5 py-1 rounded-lg bg-white ring-1 ring-gray-200 text-xs hover:bg-gray-50">Details</button>
                            <button onClick={() => reschedule(a)} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs hover:bg-gray-200 ring-1 ring-gray-300">Reschedule</button>
                            {a.status === 'pending' && (
                              <button
                                onClick={() => updateStatus(a.id, a.status, 'confirmed', 'Confirm this appointment?')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700 font-medium"
                              >
                                Confirm
                              </button>
                            )}
                            {canTransition(a.status, 'cancelled') && (
                              <button
                                onClick={() => updateStatus(a.id, a.status, 'cancelled', 'Cancel this appointment?')}
                                className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs hover:bg-red-100 ring-1 ring-red-200"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
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
        <div className="rounded-2xl bg-white/70 backdrop-blur shadow ring-1 ring-gray-100">
          {loading ? (
            <ul className="divide-y animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="p-4 flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-56 bg-gray-200 rounded" />
                    <div className="h-3 w-40 bg-gray-100 rounded" />
                  <div className="h-8 w-20 bg-gray-100 rounded" />
                </div>
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl grid place-items-center bg-blue-50 text-blue-700 mb-2">
              <CalendarDaysIcon className="w-6 h-6" />
            </div>
            <div className="text-sm text-gray-600">No appointments found</div>
            <p className="text-xs text-gray-400">Try clearing filters or creating a new appointment.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {items.map(a => (
              <li key={a.id} className="p-4">
                <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 p-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between hover:shadow-md transition">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2.5 py-1 rounded-full text-xs ring-1 ${a.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : a.status === 'pending' ? 'bg-amber-50 text-amber-700 ring-amber-200' : a.status === 'completed' ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-gray-50 text-gray-600 ring-gray-200'}`}>{a.status.replace('_',' ')}</span>
                    </div>
                    <div className="text-xs text-gray-500 truncate mb-1">
                      {(a.patient_id && patientsMap[a.patient_id]?.name) || '-'} • {(a.clinic_id && clinicsMap[a.clinic_id]?.name) || '-'}
                    </div>
                    <div className="text-lg font-bold leading-6" style={{ color: PRIMARY }}>{formatLongDate(a.appointment_date)}</div>
                    <div className="text-sm text-gray-700">{formatTime(a.appointment_time)}</div>
                    <div className="text-sm text-gray-600 mt-1 truncate">Reason for consultation: {a.reason_for_visit || 'Consultation'}</div>
                  </div>
                  <div className="flex flex-col gap-2 items-stretch sm:items-end shrink-0 w-full sm:w-auto">
                    {/* Primary Action - Consult */}
                    <div className="flex items-center gap-2">
                      {a.status === 'completed' ? (
                        <span title="Consultation done" className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-sm font-medium w-full sm:w-auto text-center">Completed</span>
                      ) : (
                        <Link 
                          title="Open consultation" 
                          href={`/veterinarian/consultations/${a.id}`} 
                          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium shadow-sm hover:shadow transition w-full sm:w-auto text-center"
                        >
                          Start Consultation
                        </Link>
                      )}
                    </div>
                    
                    {/* Status Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {a.status === 'pending' && (
                        <button
                          title="Confirm this appointment"
                          onClick={() => updateStatus(a.id, a.status, "confirmed", "Confirm this appointment?")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium shadow-sm hover:shadow transition w-full sm:w-auto"
                        >
                          Confirm
                        </button>
                      )}
                      {canTransition(a.status, 'completed') && (
                        <button
                          title="Mark appointment as completed"
                          onClick={() => updateStatus(a.id, a.status, "completed", "Mark as completed?")}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium shadow-sm hover:shadow transition w-full sm:w-auto"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                    
                    {/* Secondary Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button 
                        title="View details" 
                        onClick={() => showDetails(a)} 
                        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 ring-1 ring-gray-300 text-sm transition w-full sm:w-auto"
                      >
                        Details
                      </button>
                      <button 
                        title="Reschedule appointment" 
                        onClick={() => reschedule(a)} 
                        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 ring-1 ring-gray-300 text-sm transition w-full sm:w-auto"
                      >
                        Reschedule
                      </button>
                      {canTransition(a.status, 'cancelled') && (
                        <button
                          title="Cancel appointment"
                          onClick={() => updateStatus(a.id, a.status, "cancelled", "Cancel this appointment?")}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 ring-1 ring-red-200 text-sm font-medium transition w-full sm:w-auto"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-500">Page {page} of {totalPages}</div>
        <div className="flex items-center gap-2">
          <button disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-1 rounded-lg border bg-white disabled:opacity-50">Prev</button>
          <button disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))} className="px-3 py-1 rounded-lg border bg-white disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}

export default function VetAppointmentsPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
      <VetAppointmentsPageInner />
    </Suspense>
  );
}
