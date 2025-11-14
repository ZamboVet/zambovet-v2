"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../../lib/supabaseClient";
import { Poppins } from "next/font/google";
import { CalendarDaysIcon, ArrowPathIcon, MagnifyingGlassIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const PRIMARY = "#2563eb";

type Profile = { id: string; user_role: string };

type Vet = { id: number; user_id: string; full_name: string };

type Appointment = { id: number; patient_id: number | null; pet_owner_id: number | null; appointment_date: string; appointment_time: string; status: string };

type Diary = {
  id: number;
  patient_id: number;
  pet_owner_id: number;
  entry_date: string;
  title: string | null;
  content: string | null;
  symptoms: string | null;
  medication_given: any | null;
  weight: number | null;
  temperature: number | null;
  created_at: string | null;
};

type Patient = { id: number; name: string; species: string | null; breed: string | null };

type Owner = { id: number; full_name: string };

export default function VetDailyPatientRecords() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vet, setVet] = useState<Vet | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Record<number, Patient>>({});
  const [owners, setOwners] = useState<Record<number, Owner>>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          await Swal.fire({ icon: "warning", title: "Sign in required", text: "Please sign in to continue." });
          window.location.href = "/login";
          return;
        }
        const { data: p, error: pErr } = await supabase.from("profiles").select("id,user_role").eq("id", user.id).single();
        if (pErr) throw pErr;
        if (p.user_role !== "veterinarian") {
          await Swal.fire({ icon: "error", title: "Access denied", text: "Veterinarian account required." });
          window.location.href = "/";
          return;
        }
        setProfile(p as Profile);

        const { data: v, error: vErr } = await supabase
          .from("veterinarians")
          .select("id,user_id,full_name")
          .eq("user_id", p.id)
          .maybeSingle();
        if (vErr && vErr.code !== "PGRST116") throw vErr;
        if (!v) {
          await Swal.fire({ icon: "info", title: "Application pending", text: "Your vet profile is not yet active." });
          setLoading(false);
          return;
        }
        setVet(v as Vet);
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Failed to load", text: err?.message || "Please try again." });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchEntries = async () => {
    if (!vet) return;
    setLoading(true);
    try {
      // Pull all completed appointments for this vet
      const { data: rows, error: aErr } = await supabase
        .from("appointments")
        .select("id,patient_id,pet_owner_id,appointment_date,appointment_time,status")
        .eq("veterinarian_id", vet.id)
        .eq("status", "completed")
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false })
        .limit(1000);
      if (aErr) throw aErr;
      setAppts((rows || []) as Appointment[]);

      // hydrate names for patients and owners
      const pIds = Array.from(new Set((rows || []).map(d => d.patient_id).filter(Boolean))) as number[];
      const oIds = Array.from(new Set((rows || []).map(d => d.pet_owner_id).filter(Boolean))) as number[];
      const [pRes, oRes] = await Promise.all([
        pIds.length ? supabase.from("patients").select("id,name,species,breed").in("id", pIds) : Promise.resolve({ data: [] as any[] }),
        oIds.length ? supabase.from("pet_owner_profiles").select("id,full_name").in("id", oIds) : Promise.resolve({ data: [] as any[] })
      ]);
      const pm: Record<number, Patient> = {};
      (pRes.data as any[]).forEach(r => { pm[r.id] = { id: r.id, name: r.name, species: r.species || null, breed: r.breed || null }; });
      const om: Record<number, Owner> = {};
      (oRes.data as any[]).forEach(r => { om[r.id] = { id: r.id, full_name: r.full_name }; });
      setPatients(pm);
      setOwners(om);
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Failed to fetch records", text: err?.message || "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (vet) fetchEntries(); }, [vet]);

  const filtered = useMemo(() => {
    if (!q.trim()) return appts;
    const x = q.toLowerCase();
    return appts.filter(e =>
      (patients[e.patient_id || 0]?.name || "").toLowerCase().includes(x) ||
      (owners[e.pet_owner_id || 0]?.full_name || "").toLowerCase().includes(x)
    );
  }, [appts, q, patients, owners]);

  return (
    <div className={`${poppins.className} space-y-6`}>
      <div className="rounded-3xl bg-white/80 backdrop-blur shadow ring-1 ring-black/5 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>Completed Appointments</h1>
          <div className="text-sm text-gray-500">Full history of your completed consultations</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchEntries} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50">
            <ArrowPathIcon className={`w-4 h-4 ${loading?"animate-spin":""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm">
        <MagnifyingGlassIcon className="w-4 h-4 text-gray-500" />
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search patient, owner, title, symptoms" className="w-full outline-none text-sm bg-transparent" />
      </div>

      <div className="rounded-2xl bg-white/70 backdrop-blur shadow ring-1 ring-gray-100">
        {loading ? (
          <ul className="divide-y animate-pulse">
            {Array.from({length:5}).map((_,i)=> (
              <li key={i} className="p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-56 bg-gray-200 rounded" />
                  <div className="h-3 w-40 bg-gray-100 rounded" />
                </div>
                <div className="h-8 w-24 bg-gray-100 rounded" />
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl grid place-items-center bg-blue-50 text-blue-700 mb-2">
              <CalendarDaysIcon className="w-6 h-6" />
            </div>
            <div className="text-sm text-gray-600">No completed appointments found.</div>
            <p className="text-xs text-gray-400">Try adjusting your search.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((e) => (
              <li key={e.id} className="p-4">
                <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate" style={{ color: PRIMARY }}>{patients[e.patient_id || 0]?.name || `Patient #${e.patient_id}`}</div>
                      <div className="mt-0.5 text-xs text-gray-500 flex items-center gap-2">
                        <span className="truncate">Owner: {owners[e.pet_owner_id || 0]?.full_name || `Owner #${e.pet_owner_id}`}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 whitespace-nowrap inline-flex items-center gap-1"><CheckCircleIcon className="w-3.5 h-3.5"/>completed</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">{e.appointment_date} {String(e.appointment_time).slice(0,5)}</div>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">Consultation completed</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
