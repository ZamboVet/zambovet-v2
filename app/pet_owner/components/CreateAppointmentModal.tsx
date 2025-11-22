"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { XMarkIcon, CalendarDaysIcon, HeartIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { buildLocal, isAtLeastMinutesFromNow, localISODate } from "../../../lib/utils/time";

export type CreateAppointmentModalProps = {
  open: boolean;
  ownerId: number | null;
  onClose: () => void;
  onCreated: (appt: any) => void;
  presetClinicId?: number | null;
};

type Pet = { id: number; name: string; species: string | null };
type Vet = {
  id: number;
  full_name: string;
  user_id: string;
  verification_status: string | null;
  is_active: boolean | null;
};

type Clinic = { id: number; name: string; operating_hours?: string | null };

export default function CreateAppointmentModal({ open, ownerId, onClose, onCreated, presetClinicId }: CreateAppointmentModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [vets, setVets] = useState<Vet[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [vetsLoading, setVetsLoading] = useState(false);
  const [vetsError, setVetsError] = useState<string | null>(null);

  const [patientId, setPatientId] = useState<number | "">("");
  const [veterinarianId, setVeterinarianId] = useState<number | "">("");
  const [clinicId, setClinicId] = useState<number | "">("");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [today, setToday] = useState<string>("");

  const reasonLeft = 200 - (reason?.length || 0);

  const sanitizeReason = (s: string) => {
    try {
      const nf = s.normalize('NFKC');
      const cleaned = nf.replace(/[^A-Za-z0-9 \t\n.,\-'/()&+:#?%!]/g, "");
      const collapsed = cleaned.replace(/\s+/g, " ");
      // Do not trim here to allow users to type spaces naturally (leading/trailing)
      // Length is still capped to 200 for UX feedback
      return collapsed.slice(0, 200);
    } catch {
      return s.slice(0, 200);
    }
  };
  const isReasonValid = (s: string) => {
    if (!s) return false;
    if (s.length < 3) return false;
    if (!/[A-Za-z]/.test(s)) return false;
    if (/^[^A-Za-z0-9]+$/.test(s)) return false;
    if (/(.)\1\1\1/.test(s)) return false;
    return true;
  };

  useEffect(() => {
    // set on client after mount to avoid SSR/CSR mismatch
    try { setToday(localISODate()); } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!open || !ownerId) return;
      try {
        const [{ data: petRows }, { data: clinicRows }] = await Promise.all([
          supabase.from("patients").select("id,name,species").eq("owner_id", ownerId).eq("is_active", true).order("name", { ascending: true }),
          supabase.from("clinics").select("id,name,operating_hours").order("name", { ascending: true }),
        ]);
        setPets((petRows || []) as Pet[]);
        setClinics((clinicRows || []) as Clinic[]);
        if (presetClinicId) setClinicId(presetClinicId);
      } catch (e: any) {
        await Swal.fire({ icon: "error", title: "Load failed", text: e?.message || "Please try again." });
      }
    };
    load();
  }, [open, ownerId, presetClinicId]);

  // When clinic changes, fetch vets for that clinic and preselect
  useEffect(() => {
    const run = async () => {
      if (!open || !clinicId) return;
      try {
        setVetsLoading(true);
        setVetsError(null);
        // Fetch veterinarians for the clinic from vetted view (approved + active + available)
        const { data: vetsData, error: vetsError } = await supabase
          .from('owner_visible_vets')
          .select('id,user_id,full_name,clinic_id')
          .eq('clinic_id', clinicId as number)
          .order('full_name', { ascending: true });
        
        if (vetsError) throw vetsError;
        
        
        
        if (!Array.isArray(vetsData) || vetsData.length === 0) {
          
          setVets([]);
          setVeterinarianId("");
          return;
        }
        
        const list: Vet[] = (vetsData || []).map((row:any) => ({
          id: row.id as number,
          full_name: row.full_name as string,
          user_id: (row.user_id as string) || "",
          verification_status: null,
          is_active: null,
        }));
        
        
        setVets(list);
        if (list.length === 0) {
          setVeterinarianId("");
        } else {
          setVeterinarianId(prev => {
            const prevNum = typeof prev === "number" ? prev : Number(prev) || null;
            if (prevNum && list.some(v => v.id === prevNum)) {
              return prevNum;
            }
            return list[0].id;
          });
        }
      } catch (error: any) {
        console.error('Error fetching veterinarians:', error);
        const msg = (error && typeof error === 'object' && 'message' in error) ? (error as any).message : 'Failed to load veterinarians';
        setVetsError(msg);
        setVets([]);
        setVeterinarianId("");
      } finally {
        setVetsLoading(false);
      }
    };
    if (!clinicId) {
      setVets([]);
      setVeterinarianId("");
      setVetsError(null);
      setVetsLoading(false);
      return;
    }
    run();
  }, [clinicId, open]);

  const assignedVet = useMemo(() => {
    return vets.find(v => v.id === (typeof veterinarianId === "number" ? veterinarianId : Number(veterinarianId))) || null;
  }, [vets, veterinarianId]);

  // Focus trap + ESC
  useEffect(() => {
    if (!open) return;
    const root = modalRef.current;
    if (!root) return;
    const selectors = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getNodes = () => Array.from(root.querySelectorAll<HTMLElement>(selectors)).filter(el => !el.hasAttribute('disabled'));
    const nodes = getNodes();
    nodes[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = getNodes(); if (f.length === 0) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
    };
    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Format time to 12-hour format
  const formatTo12Hour = (time24: string) => {
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12.toString().padStart(2, ' ')}:${m.toString().padStart(2, '0')} ${period}`;
  };

  // Generate time slots based on clinic operating hours and disabled by conflicts and 30-min rule
  const [slots, setSlots] = useState<{ value: string; display: string; disabled: boolean; hint?: string }[]>([]);
  useEffect(() => {
    const compute = async () => {
      if (!date || !veterinarianId) { setSlots([]); return; }
      // parse operating hours from selected clinic if present, else default
      const selectedClinic = clinics.find(c => c.id === clinicId);
      const rawHours = selectedClinic?.operating_hours as unknown;
      const normalized = typeof rawHours === 'string' ? rawHours : (rawHours == null ? '' : String(rawHours));
      const range = (normalized || "08:00-17:00").trim();
      const m = range.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
      const [start, end] = m ? [m[1], m[2]] : ["08:00", "17:00"];
      const stepMin = 30;
      const list: { value: string; display: string; disabled: boolean; hint?: string }[] = [];
      const toMinutes = (t: string) => { const [h, mm] = t.split(":").map(Number); return h*60 + mm; };
      const pad = (n: number) => n.toString().padStart(2, '0');
      const make = (mins: number) => `${pad(Math.floor(mins/60))}:${pad(mins%60)}`;
      const startM = toMinutes(start); const endM = toMinutes(end);
      // fetch conflicts for vet on date (pending/confirmed)
      const { data: appts } = await supabase
        .from('appointments')
        .select('appointment_time,status')
        .eq('veterinarian_id', veterinarianId as number)
        .eq('appointment_date', date);
      const busy = new Set<string>((appts||[]).filter((a:any)=> a.status !== 'cancelled').map((a:any)=> a.appointment_time));
      const todayStr = localISODate();
      const sameDay = date === todayStr;
      const now = new Date();
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
      for (let mnt = startM; mnt <= endM; mnt += stepMin) {
        const v = make(mnt);
        const dt = buildLocal(date, v);
        let disabled = false; let hint: string | undefined;
        if (sameDay && !isAtLeastMinutesFromNow(dt, 30)) { disabled = true; hint = 'Too soon'; }
        if (!disabled && busy.has(v)) { disabled = true; hint = 'Booked'; }
        // Check if time has already passed today
        if (sameDay && mnt < currentTimeMinutes) { disabled = true; hint = 'Past'; }
        list.push({ value: v, display: formatTo12Hour(v), disabled, hint });
      }
      setSlots(list);
      // clear time if selected value is now disabled
      if (time && list.find(s=> s.value===time && s.disabled)) setTime("");
    };
    compute();
  }, [date, veterinarianId, clinicId, clinics, time]);

  if (!open) return null;

  const submit = async () => {
    if (!ownerId || !patientId || !veterinarianId || !date || !time) {
      await Swal.fire({ icon: "warning", title: "Missing info", text: "Select pet, vet, date and time.", confirmButtonColor: "#2563eb" });
      return;
    }
    // block past datetime
    try {
      const dt = buildLocal(date, time);
      if (isNaN(dt.getTime())) throw new Error("Invalid date/time");
      if (!isAtLeastMinutesFromNow(dt, 30)) {
        await Swal.fire({ icon: "warning", title: "Too soon", text: "Please pick a time at least 30 minutes from now." });
        return;
      }
    } catch {
      await Swal.fire({ icon: "warning", title: "Invalid date/time", text: "Please verify your selection." });
      return;
    }
    const rawReason = reason;
    // Trim only on submit to store a clean value while allowing spaces during typing
    const finalReason = sanitizeReason(rawReason).trim();
    if (rawReason.trim() && !finalReason) {
      await Swal.fire({ icon: 'warning', title: 'Invalid reason', text: 'Please use letters, numbers, and common punctuation only.' });
      return;
    }
    if (finalReason && !isReasonValid(finalReason)) {
      await Swal.fire({ icon: 'warning', title: 'Invalid reason', text: 'Please enter a short, clear reason (min 3 characters).' });
      return;
    }
    setSaving(true);
    try {
      const vetForBooking = assignedVet;
      if (!vetForBooking) {
        await Swal.fire({ icon: "error", title: "Veterinarian unavailable", text: "Please select an active veterinarian before booking." });
        setSaving(false);
        return;
      }
      // Skip duplicate profile gating; vetted list already enforces approved + active

      // Check for duplicate appointment by same pet owner on same date
      const { data: ownerAppts, error: oErr } = await supabase
        .from("appointments")
        .select("id,appointment_date,status")
        .eq("pet_owner_id", ownerId)
        .eq("patient_id", patientId)
        .eq("appointment_date", date)
        .neq("status", "cancelled");
      if (oErr) throw oErr;
      if ((ownerAppts?.length || 0) > 0) {
        const existingAppt = ownerAppts![0];
        const petName = pets.find(p => p.id === (patientId as number))?.name || 'this pet';
        await Swal.fire({ 
          icon: "warning", 
          title: "Appointment already exists", 
          text: `You already have an appointment for ${petName} on ${date}. Please choose a different date or cancel the existing appointment.`,
          confirmButtonColor: "#2563eb"
        });
        setSaving(false);
        return;
      }
      // conflict check for vet
      const { data: conflicts, error: cErr } = await supabase
        .from("appointments")
        .select("id")
        .eq("veterinarian_id", veterinarianId as number)
        .eq("appointment_date", date)
        .eq("appointment_time", time)
        .limit(1);
      if (cErr) throw cErr;
      if ((conflicts?.length || 0) > 0) {
        await Swal.fire({ icon: "warning", title: "Time not available", text: "The veterinarian already has an appointment at this time." });
        setSaving(false);
        return;
      }
      const payload: any = {
        appointment_date: date,
        appointment_time: time,
        status: "pending",
        reason_for_visit: finalReason || null,
        clinic_id: clinicId || null,
        pet_owner_id: ownerId,
        patient_id: patientId,
        veterinarian_id: typeof veterinarianId === "number" ? veterinarianId : Number(veterinarianId),
        booking_type: "web",
      };
      const { data, error } = await supabase.from("appointments").insert(payload).select("*").single();
      if (error) throw error;

      // Create notification for the veterinarian
      try {
        // Get patient name for better notification message
        const { data: patientData } = await supabase
          .from("patients")
          .select("name")
          .eq("id", patientId)
          .maybeSingle();

        const patientName = patientData?.name || "a patient";

        if (vetForBooking.user_id) {
          await supabase.from('notifications').insert({
            user_id: vetForBooking.user_id,
            title: 'New Appointment Request',
            message: `New appointment request for ${patientName} on ${data.appointment_date} at ${data.appointment_time}`,
            notification_type: 'appointment',
            related_appointment_id: data.id,
          });
        }
      } catch (notifErr: any) {
        // Log error but don't block appointment creation
        console.error("Failed to create notification:", notifErr);
      }
      await Swal.fire({ icon: "success", title: "Appointment requested" });
      onCreated(data);
      onClose();
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "Create failed", text: e?.message || "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={modalRef} className="relative w-full max-w-2xl mx-4 rounded-3xl overflow-hidden" role="dialog" aria-modal="true">
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-blue-400 via-indigo-500 to-blue-600 opacity-80" />
        <div className="relative rounded-3xl bg-white">
          <div className="px-6 pt-6 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white grid place-items-center">
                <CalendarDaysIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">New Appointment</div>
                <div className="text-xs text-neutral-500">Book a visit for your pet</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Pet</label>
              <select value={patientId as any} onChange={(e)=> setPatientId(e.target.value ? Number(e.target.value) : "")} className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select pet</option>
                {pets.map(p => <option key={p.id} value={p.id}>{p.name} {p.species ? `(${p.species})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Veterinarian</label>
              <div className="w-full rounded-xl border border-neutral-200 px-3 py-2 bg-neutral-50 text-sm text-neutral-700">
                {clinicId ? (
                  vetsLoading ? (
                    <span className="text-neutral-500 text-sm">Loading veterinarians…</span>
                  ) : vetsError ? (
                    <span className="text-red-500 text-sm">{vetsError}</span>
                  ) : assignedVet ? (
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{assignedVet.full_name}</span>
                      <span className="text-xs text-neutral-500">Assigned automatically based on the selected clinic</span>
                    </div>
                  ) : (
                    <span className="text-red-500 text-sm">No veterinarians available for this clinic</span>
                  )
                ) : (
                  <span className="text-neutral-500 text-sm">Select a clinic to assign a veterinarian automatically</span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Clinic {presetClinicId ? "(preset)" : "(optional)"}</label>
              <select disabled={!!presetClinicId} value={clinicId as any} onChange={(e)=> { const val = e.target.value ? Number(e.target.value) : ""; setClinicId(val); }} className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-50">
                <option value="">Select clinic</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Reason for visit</label>
              <input value={reason} onChange={(e)=> setReason(sanitizeReason(e.target.value))} placeholder="e.g. Annual checkup" className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="mt-1 text-xs text-neutral-400 text-right">{reasonLeft} / 200</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Date</label>
              <input type="date" suppressHydrationWarning min={today || undefined} value={date} onChange={(e)=> setDate(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Time</label>
              {slots.length > 0 ? (
                <select value={time} onChange={(e)=> setTime(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select time</option>
                  {slots.map(s => (
                    <option key={s.value} value={s.value} disabled={s.disabled}>{s.display}{s.disabled && s.hint?` • ${s.hint}`:''}</option>
                  ))}
                </select>
              ) : (
                <input type="time" value={time} onChange={(e)=> setTime(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              )}
            </div>
          </div>

          <div className="px-6 pb-6 flex items-center justify-end gap-3">
            <button onClick={onClose} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">Cancel</button>
            <button onClick={submit} disabled={saving || !patientId || !veterinarianId || !date || !time} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {saving ? "Booking…" : "Book Appointment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
