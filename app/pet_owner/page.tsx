"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { CalendarDaysIcon, HeartIcon, HomeModernIcon, MapPinIcon, StarIcon } from "@heroicons/react/24/solid";
import { CheckBadgeIcon, ClipboardDocumentListIcon, PhoneIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../lib/supabaseClient";
import CreateAppointmentModal from "./components/CreateAppointmentModal";
import WelcomeDisplay from "./components/WelcomeDisplay"; // Added import statement
import { buildUtc, isAtLeastMinutesFromNow } from "../../lib/utils/time";
import { swalConfirmColor } from "../../lib/ui/tokens";

export default function PetOwnerDashboard() {
  const [activeTab, setActiveTab] = useState("Overview");
  const router = useRouter();

  const tabs = [
    "Overview",
    "My Pets",
    "Appointments",
    "Analytics",
    "Clinics",
    "Profile",
    "Settings",
  ];

  // Manual refresh helper for upcoming + summary after actions
  const refreshNow = async () => {
    try {
      if (!ownerId) return;
      const oid = ownerId as number;
      const today = new Date().toISOString().slice(0, 10);
      const { count: petsCount } = await supabase
        .from("patients").select("id", { count: "exact", head: true })
        .eq("owner_id", oid).eq("is_active", true);
      setTotalPets(petsCount ?? 0);
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, status, veterinarian_id, clinics(name), patients(name), reason_for_visit")
        .eq("pet_owner_id", oid)
        .in("status", ["pending", "confirmed"]) as any;
      const filtered = (appts||[])
        .filter((a: any) => a.appointment_date >= today)
        .sort((a: any, b: any) => (a.appointment_date > b.appointment_date ? 1 : -1))
        .slice(0, 5)
        .map((a: any) => ({ id: a.id, pet: a.patients?.name ?? "Pet", clinic: a.clinics?.name ?? "Clinic", dateLabel: `${a.appointment_date} ${a.appointment_time?.slice(0,5) ?? ""}`, type: a.reason_for_visit ?? "Check-up", appointment_date: a.appointment_date, appointment_time: a.appointment_time, veterinarian_id: a.veterinarian_id }));
      setUpcoming(filtered);
      setUpcomingCount(filtered.length);
      setTodayCount((appts||[]).filter((a:any)=> a.appointment_date === today).length);
      const { count: doneCount } = await supabase
        .from("appointments").select("id", { count: "exact", head: true })
        .eq("pet_owner_id", oid).eq("status", "completed");
      setCompletedCount(doneCount ?? 0);
      const { data: lastRow } = await supabase
        .from("appointments").select("appointment_date, appointment_time")
        .eq("pet_owner_id", oid).eq("status", "completed")
        .order("appointment_date", { ascending: false }).order("appointment_time", { ascending: false })
        .limit(1).maybeSingle();
      setLastVisit(lastRow?.appointment_date ? `${lastRow.appointment_date}${lastRow.appointment_time ? " " + String(lastRow.appointment_time).slice(0,5) : ""}` : "Never");
    } catch {}
  };

  const quick = [
    { key: "book", label: "Book Appointment", icon: CalendarDaysIcon, color: "bg-blue-600", tint: "bg-blue-50", text: "text-blue-700" },
    { key: "manage", label: "Manage Pets", icon: HeartIcon, color: "bg-indigo-600", tint: "bg-indigo-50", text: "text-indigo-700" },
    { key: "clinics", label: "Clinics", icon: HomeModernIcon, color: "bg-amber-500", tint: "bg-amber-50", text: "text-amber-700" },
  ];

  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [totalPets, setTotalPets] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [lastVisit, setLastVisit] = useState<string>("Never");
  const [upcoming, setUpcoming] = useState<Array<{ id: number; pet: string; clinic: string; dateLabel: string; type: string; appointment_date: string; appointment_time: string; veterinarian_id: number }>>([]);
  const [clinics, setClinics] = useState<Array<{ id: number; name: string; phone?: string | null; latitude?: number | null; longitude?: number | null; distanceKm?: number; recentScore?: number }>>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [recent, setRecent] = useState<Array<{ id: string; label: string; ts: string }>>([]);

  const statCards = useMemo(
    () => [
      { key: "pets", label: "My Pets", value: totalPets, icon: HeartIcon, accent: "bg-blue-600" },
      { key: "visits", label: "Upcoming Visits", value: upcomingCount, icon: CalendarDaysIcon, accent: "bg-amber-500" },
      { key: "completed", label: "Completed Visits", value: completedCount, icon: CheckBadgeIcon, accent: "bg-indigo-600" },
    ],
    [totalPets, upcomingCount, completedCount]
  );

  // Format recent activity with relative time
  const activities = useMemo(() => {
    const now = Date.now();
    return recent.map(r => {
      const ts = new Date(r.ts).getTime();
      const diff = now - ts;
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      let time = "Just now";
      if (mins < 60) time = mins <= 1 ? "Just now" : `${mins}m ago`;
      else if (hrs < 24) time = `${hrs}h ago`;
      else if (days === 1) time = "Yesterday";
      else time = `${days}d ago`;
      return { id: r.id, label: r.label, time };
    });
  }, [recent]);
  const tips = [
    { id: 1, title: "Routine Vaccinations", desc: "Keep your pets' shots up to date to prevent illness." },
    { id: 2, title: "Dental Hygiene", desc: "Regular brushing reduces tartar and disease risk." },
    { id: 3, title: "Hydration", desc: "Ensure clean water is always available." },
  ];

  useEffect(() => {
    const loadMetrics = async (oid: number) => {
      // total pets
      const { count: petsCount } = await supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", oid)
        .eq("is_active", true);
      setTotalPets(petsCount ?? 0);

      const today = new Date().toISOString().slice(0, 10);
      const { data: appts, error: apptErr } = await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, status, veterinarian_id, clinics(name), patients(name), reason_for_visit")
        .eq("pet_owner_id", oid)
        .in("status", ["pending", "confirmed"]) as any;
      if (!apptErr && appts) {
        const filtered = appts
          .filter((a: any) => a.appointment_date >= today)
          .sort((a: any, b: any) => (a.appointment_date > b.appointment_date ? 1 : -1))
          .slice(0, 5)
          .map((a: any) => ({
            id: a.id,
            pet: a.patients?.name ?? "Pet",
            clinic: a.clinics?.name ?? "Clinic",
            dateLabel: `${a.appointment_date} ${a.appointment_time?.slice(0,5) ?? ""}`,
            type: a.reason_for_visit ?? "Check-up",
            appointment_date: a.appointment_date,
            appointment_time: a.appointment_time,
            veterinarian_id: a.veterinarian_id,
          }));
        setUpcoming(filtered);
        setUpcomingCount(filtered.length);
        const todayOnly = appts.filter((a:any)=> a.appointment_date === today);
        setTodayCount(todayOnly.length);
      } else {
        setUpcoming([]);
        setUpcomingCount(0);
        setTodayCount(0);
      }

      // completed visits count
      const { count: doneCount } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("pet_owner_id", oid)
        .eq("status", "completed");
      setCompletedCount(doneCount ?? 0);

      // last completed visit date
      const { data: lastRow } = await supabase
        .from("appointments")
        .select("appointment_date, appointment_time")
        .eq("pet_owner_id", oid)
        .eq("status", "completed")
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastRow?.appointment_date) {
        setLastVisit(`${lastRow.appointment_date}${lastRow.appointment_time ? " " + String(lastRow.appointment_time).slice(0,5) : ""}`);
      } else {
        setLastVisit("Never");
      }

      // clinics
      // Recent clinics for this owner by frequency
      const { data: recentAppts } = await supabase
        .from("appointments")
        .select("clinic_id")
        .eq("pet_owner_id", oid)
        .not("clinic_id", "is", null)
        .order("appointment_date", { ascending: false })
        .limit(20);
      const freq: Record<number, number> = {};
      (recentAppts || []).forEach((r: any) => { const id = Number(r.clinic_id); if (!isNaN(id)) freq[id] = (freq[id] || 0) + 1; });

      // Pull active clinics (w/ coords) and compute distance later
      const { data: clinicsData } = await supabase
        .from("clinics")
        .select("id,name,phone,latitude,longitude")
        .eq("is_active", true)
        .limit(50);
      const base = ((clinicsData ?? []) as Array<any>).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone ?? null,
        latitude: c.latitude ?? null,
        longitude: c.longitude ?? null,
        recentScore: freq[c.id] || 0,
      }));
      setClinics(base as any);

      // recent activity (appointments + pets)
      const [apptRows, petRows] = await Promise.all([
        supabase.from("appointments").select("id,status,updated_at,appointment_date,appointment_time").eq("pet_owner_id", oid).order("updated_at", { ascending: false }).limit(20),
        supabase.from("patients").select("id,name,created_at").eq("owner_id", oid).order("created_at", { ascending: false }).limit(10),
      ]);
      const apptsInit = (apptRows.data || []) as any[];
      const petsInit = (petRows.data || []) as any[];
      const apptLabels = apptsInit.map(a => {
        const s = String(a.status);
        let label = "Updated appointment";
        if (s === 'pending') label = 'Requested appointment';
        else if (s === 'confirmed') label = 'Appointment confirmed';
        else if (s === 'in_progress') label = 'Visit started';
        else if (s === 'completed') label = 'Completed visit';
        else if (s === 'cancelled' || s === 'canceled') label = 'Cancelled appointment';
        const when = a.updated_at || `${a.appointment_date}T${(a.appointment_time||'00:00')}`;
        return { id: `appt-${a.id}`, label, ts: when };
      });
      const petLabels = petsInit.map(p => ({ id: `pet-${p.id}`, label: `Added new pet ${p.name}`, ts: p.created_at }));
      const merged = [...apptLabels, ...petLabels].sort((a,b)=> (a.ts > b.ts ? -1 : 1)).slice(0,5);
      setRecent(merged as any);
    };

    const init = async () => {
      setLoading(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) {
          setLoading(false);
          return;
        }

        const { data: ownerRow } = await supabase
          .from("pet_owner_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        const oid = ownerRow?.id ?? null;
        setOwnerId(oid);
        if (!oid) {
          setLoading(false);
          return;
        }
        await loadMetrics(oid);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Geolocation for distance
  useEffect(() => {
    try {
      if (!navigator?.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude; const lon = pos.coords.longitude;
          setUserLoc({ lat, lon });
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 }
      );
    } catch {}
  }, []);

  // Compute distances when we have user location
  useEffect(() => {
    if (!userLoc || clinics.length === 0) return;
    const R = 6371; // km
    const toRad = (d: number) => (d * Math.PI) / 180;
    const calc = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const dLat = toRad(lat2 - lat1); const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };
    setClinics(prev => prev.map(c => {
      if (c.latitude == null || c.longitude == null) return c;
      return { ...c, distanceKm: calc(userLoc.lat, userLoc.lon, Number(c.latitude), Number(c.longitude)) };
    }));
  }, [userLoc]);

  // Sort clinics: recentScore desc, then distance asc, fallback by name
  const recommended = useMemo(() => {
    const arr = [...clinics];
    arr.sort((a, b) => {
      const rs = (b.recentScore || 0) - (a.recentScore || 0);
      if (rs !== 0) return rs;
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return a.name.localeCompare(b.name);
    });
    return arr.slice(0, 3);
  }, [clinics]);

  // Realtime refresh on appointments change
  useEffect(() => {
    if (!ownerId) return;
    const ch = supabase
      .channel("owner-dashboard-" + ownerId)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `pet_owner_id=eq.${ownerId}` }, () => {
        // re-fetch metrics on any change
        (async () => {
          try {
            // @ts-ignore - call the same loader defined in the first effect via fetch in place
            const oid = ownerId as number;
            const today = new Date().toISOString().slice(0, 10);
            const { count: petsCount } = await supabase
              .from("patients").select("id", { count: "exact", head: true }).eq("owner_id", oid).eq("is_active", true);
            setTotalPets(petsCount ?? 0);
            const { data: appts } = await supabase
              .from("appointments")
              .select("id, appointment_date, appointment_time, status, veterinarian_id, clinics(name), patients(name), reason_for_visit")
              .eq("pet_owner_id", oid)
              .in("status", ["pending", "confirmed"]) as any;
            const filtered = (appts||[])
              .filter((a: any) => a.appointment_date >= today)
              .sort((a: any, b: any) => (a.appointment_date > b.appointment_date ? 1 : -1))
              .slice(0, 5)
              .map((a: any) => ({ id: a.id, pet: a.patients?.name ?? "Pet", clinic: a.clinics?.name ?? "Clinic", dateLabel: `${a.appointment_date} ${a.appointment_time?.slice(0,5) ?? ""}`, type: a.reason_for_visit ?? "Check-up", appointment_date: a.appointment_date, appointment_time: a.appointment_time, veterinarian_id: a.veterinarian_id, status: a.status }));
            setUpcoming(filtered);
            setUpcomingCount(filtered.length);
            setTodayCount((appts||[]).filter((a:any)=> a.appointment_date === today).length);
            const { count: doneCount } = await supabase
              .from("appointments").select("id", { count: "exact", head: true })
              .eq("pet_owner_id", oid).eq("status", "completed");
            setCompletedCount(doneCount ?? 0);
            const { data: lastRow } = await supabase
              .from("appointments").select("appointment_date, appointment_time")
              .eq("pet_owner_id", oid).eq("status", "completed")
              .order("appointment_date", { ascending: false }).order("appointment_time", { ascending: false })
              .limit(1).maybeSingle();
            setLastVisit(lastRow?.appointment_date ? `${lastRow.appointment_date}${lastRow.appointment_time ? " " + String(lastRow.appointment_time).slice(0,5) : ""}` : "Never");
            await Swal.fire({ icon: 'info', title: 'Refreshed', confirmButtonColor: swalConfirmColor });

            // refresh recent activity
            const [apptRows, petRows] = await Promise.all([
              supabase.from("appointments").select("id,status,updated_at,appointment_date,appointment_time").eq("pet_owner_id", ownerId).order("updated_at", { ascending: false }).limit(20),
              supabase.from("patients").select("id,name,created_at").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(10),
            ]);
            const apptsRecent = (apptRows.data || []) as any[];
            const petsRecent = (petRows.data || []) as any[];
            const apptLabels = apptsRecent.map(a => {
              const s = String(a.status);
              let label = "Updated appointment";
              if (s === 'pending') label = 'Requested appointment';
              else if (s === 'confirmed') label = 'Appointment confirmed';
              else if (s === 'in_progress') label = 'Visit started';
              else if (s === 'completed') label = 'Completed visit';
              else if (s === 'cancelled' || s === 'canceled') label = 'Cancelled appointment';
              const when = a.updated_at || `${a.appointment_date}T${(a.appointment_time||'00:00')}`;
              return { id: `appt-${a.id}`, label, ts: when };
            });
            const petLabels = petsRecent.map(p => ({ id: `pet-${p.id}`, label: `Added new pet ${p.name}`, ts: p.created_at }));
            const merged = [...apptLabels, ...petLabels].sort((a,b)=> (a.ts > b.ts ? -1 : 1)).slice(0,5);
            setRecent(merged as any);
          } catch {}
        })();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ownerId]);

  // Realtime for pets recently added
  useEffect(() => {
    if (!ownerId) return;
    const ch = supabase
      .channel("owner-dashboard-pets-" + ownerId)
      .on("postgres_changes", { event: "*", schema: "public", table: "patients", filter: `owner_id=eq.${ownerId}` }, () => {
        (async () => {
          try {
            const { data: pets } = await supabase.from("patients").select("id,name,created_at").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(10);
            const { data: appts } = await supabase.from("appointments").select("id,status,updated_at,appointment_date,appointment_time").eq("pet_owner_id", ownerId).order("updated_at", { ascending: false }).limit(20);
            const apptLabels = (appts||[] as any[]).map(a=>{
              const s = String(a.status);
              let label = "Updated appointment";
              if (s === 'pending') label = 'Requested appointment';
              else if (s === 'confirmed') label = 'Appointment confirmed';
              else if (s === 'in_progress') label = 'Visit started';
              else if (s === 'completed') label = 'Completed visit';
              else if (s === 'cancelled' || s === 'canceled') label = 'Cancelled appointment';
              const when = a.updated_at || `${a.appointment_date}T${(a.appointment_time||'00:00')}`;
              return { id: `appt-${a.id}`, label, ts: when };
            });
            const petLabels = (pets||[] as any[]).map(p=>({ id: `pet-${p.id}`, label: `Added new pet ${p.name}`, ts: p.created_at }));
            const merged = [...apptLabels, ...petLabels].sort((a,b)=> (a.ts > b.ts ? -1 : 1)).slice(0,5);
            setRecent(merged as any);
          } catch {}
        })();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ownerId]);

  // Realtime refresh for clinics list
  useEffect(() => {
    const ch = supabase
      .channel("owner-dashboard-clinics")
      .on("postgres_changes", { event: "*", schema: "public", table: "clinics" }, () => {
        (async () => {
          try {
            const { data: clinicsData } = await supabase
              .from("clinics")
              .select("id,name,phone")
              .eq("is_active", true)
              .limit(3);
            setClinics(((clinicsData ?? []) as Array<{ id: number; name: string; phone?: string | null }>).
              map((c) => ({ id: c.id, name: (c as any).name, phone: (c as any).phone })) as any);
            await Swal.fire({ icon: 'info', title: 'Refreshed', confirmButtonColor: '#2563eb' });
          } catch {}
        })();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const onQuick = (which: string) => {
    switch (which) {
      case "book":
        setBookOpen(true);
        break;
      case "manage":
        router.push("/pet_owner/my-pets");
        break;
      case "clinics":
        router.push("/pet_owner/clinics");
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-dvh bg-neutral-50">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-5 md:pt-6 pb-6 sm:pb-8 md:pb-10">
        <WelcomeDisplay />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={`sk-${i}`} className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-neutral-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 bg-neutral-200 rounded" />
                      <div className="h-5 w-16 bg-neutral-200 rounded" />
                    </div>
                  </div>
                </div>
              ))
            : statCards.map((s) => (
                <div key={s.key} className="rounded-lg sm:rounded-xl border border-neutral-200 bg-white shadow-sm">
                  <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                    <div className={`h-9 w-9 sm:h-10 sm:w-10 ${s.accent} rounded-lg text-white flex items-center justify-center flex-shrink-0`}>
                      <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-neutral-500 truncate">{s.label}</p>
                      <p className="text-lg sm:text-xl font-semibold">{s.value}</p>
                    </div>
                  </div>
                </div>
              ))}
        </div>

        <div className="mt-4 sm:mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          <div className="rounded-lg sm:rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="p-3 sm:p-4 border-b border-neutral-100 font-medium text-sm sm:text-base">Quick Actions</div>
            <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {quick.map((q) => (
                <button
                  key={q.key}
                  onClick={() => onQuick(q.key)}
                  className="group rounded-lg sm:rounded-xl border border-neutral-200 bg-white hover:shadow-md transition overflow-hidden text-left active:scale-[0.98]"
                >
                  <div className={`${q.tint} p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3`}>
                    <div className={`${q.color} text-white h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <q.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className={`${q.text} font-medium text-sm sm:text-base`}>{q.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="h-full">
            <div className="h-full rounded-lg sm:rounded-xl border border-neutral-200 bg-white shadow-sm flex flex-col">
              <div className="p-3 sm:p-4 border-b border-neutral-100 font-medium text-sm sm:text-base flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <CalendarDaysIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                  <span className="truncate">Upcoming Appointments</span>
                </div>
                <Link href="/pet_owner/appointments" className="text-xs sm:text-sm text-blue-600 hover:underline flex-shrink-0 whitespace-nowrap">See all</Link>
              </div>
              <ul className="divide-y divide-neutral-100">
                {loading && (
                  <>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <li key={`up-sk-${i}`} className="p-3 sm:p-4 animate-pulse">
                        <div className="h-3 w-32 sm:w-40 bg-neutral-200 rounded mb-2" />
                        <div className="h-3 w-40 sm:w-56 bg-neutral-200 rounded mb-1" />
                        <div className="h-2 w-20 sm:w-24 bg-neutral-200 rounded" />
                      </li>
                    ))}
                  </>
                )}
                {!loading && upcoming.map((u) => (
                  <li key={u.id} className="p-3 sm:p-4 flex items-start sm:items-center justify-between gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{u.pet} • {u.type}</p>
                      <p className="text-xs sm:text-sm text-neutral-500 truncate">{u.clinic}</p>
                      <p className="text-[10px] sm:text-xs text-neutral-400 truncate">{u.dateLabel}</p>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      <button
                        onClick={async () => {
                          const { value: form, isConfirmed } = await Swal.fire<{ date: string; time: string }>({
                            title: 'Reschedule',
                            html: `
                              <div class='text-left grid gap-2 font-[Poppins]'>
                                <label class='text-xs text-gray-500'>Date</label>
                                <input id='rs_date' type='date' class='swal2-input' value='${u.appointment_date}'/>
                                <label class='text-xs text-gray-500 mt-1'>Time</label>
                                <input id='rs_time' type='time' class='swal2-input' value='${u.appointment_time}'/>
                              </div>
                            `,
                            focusConfirm:false,
                            preConfirm: () => {
                              const date = (document.getElementById('rs_date') as HTMLInputElement)?.value;
                              const time = (document.getElementById('rs_time') as HTMLInputElement)?.value;
                              if (!date || !time) { Swal.showValidationMessage('Date and time are required'); return; }
                              const dt = buildUtc(date, time);
                              if (!isAtLeastMinutesFromNow(dt, 30)) { Swal.showValidationMessage('Please choose a time at least 30 minutes from now'); return; }
                              return { date, time } as any;
                            }
                          });
                          if (!isConfirmed || !form) return;
                          // resolve veterinarian_id for conflict check
                          let vetId = u.veterinarian_id as any;
                          if (vetId == null) {
                            const { data: row, error: vErr } = await supabase
                              .from('appointments')
                              .select('veterinarian_id')
                              .eq('id', u.id)
                              .maybeSingle();
                            if (vErr) { await Swal.fire({ icon:'error', title:'Check failed', text:vErr.message }); return; }
                            vetId = (row as any)?.veterinarian_id;
                          }
                          if (vetId != null) {
                            const { data: conflicts, error: cErr } = await supabase
                              .from('appointments')
                              .select('id')
                              .eq('veterinarian_id', Number(vetId))
                              .eq('appointment_date', form.date)
                              .eq('appointment_time', form.time)
                              .neq('id', u.id)
                              .limit(1);
                            if (cErr) { await Swal.fire({ icon:'error', title:'Check failed', text:cErr.message }); return; }
                            if ((conflicts?.length || 0) > 0) { await Swal.fire({ icon:'warning', title:'Time conflict', text:'This time is not available.' }); return; }
                          }
                          const { error } = await supabase.from('appointments').update({ appointment_date: form.date, appointment_time: form.time }).eq('id', u.id);
                          if (error) { await Swal.fire({ icon:'error', title:'Reschedule failed', text:error.message }); return; }
                          await Swal.fire({ icon:'success', title:'Rescheduled', confirmButtonColor: swalConfirmColor });
                          await refreshNow();
                        }}
                        className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-neutral-200 hover:bg-neutral-50 active:scale-95 whitespace-nowrap"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={async () => {
                          const res = await Swal.fire({ icon:'question', title:`Cancel appointment for ${u.pet}?`, showCancelButton:true, confirmButtonText:'Yes, cancel', confirmButtonColor: swalConfirmColor });
                          if (!res.isConfirmed) return;
                          let { error } = await supabase.from('appointments').update({ status:'cancelled' }).eq('id', u.id);
                          if (error) {
                            const retry = await supabase.from('appointments').update({ status:'canceled' }).eq('id', u.id);
                            error = retry.error as any;
                          }
                          if (error) { await Swal.fire({ icon:'error', title:'Cancel failed', text:error.message }); return; }
                          await Swal.fire({ icon:'success', title:'Canceled', confirmButtonColor: swalConfirmColor });
                          await refreshNow();
                        }}
                        className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  </li>
                ))}
                {!loading && upcoming.length === 0 && (
                  <li className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-neutral-500">No upcoming appointments.</p>
                      <button
                        onClick={() => Swal.fire({ title: "Book Appointment", text: "Let's book your first appointment.", icon: "info", confirmButtonColor: "#2563eb" })}
                        className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Book now
                      </button>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {activeTab !== "Overview" && (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-600">
            <p className="font-medium">{activeTab}</p>
            <p className="text-sm">Content for this section will appear here.</p>
          </div>
        )}

        <div className="mt-4 sm:mt-5 md:mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          <div className="h-full">
            <div className="h-full rounded-lg sm:rounded-xl border border-neutral-200 bg-white shadow-sm flex flex-col">
              <div className="p-3 sm:p-4 border-b border-neutral-100 font-medium text-sm sm:text-base flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <ClipboardDocumentListIcon className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 flex-shrink-0" />
                  <span className="truncate">Recent Activity</span>
                </div>
              </div>
              <ul className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                {loading && (
                  <>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <li key={`act-sk-${i}`} className="flex items-start gap-3 animate-pulse">
                        <span className="mt-1 h-2 w-2 rounded-full bg-neutral-200"></span>
                        <div className="space-y-2">
                          <div className="h-3 w-48 bg-neutral-200 rounded" />
                          <div className="h-2 w-24 bg-neutral-200 rounded" />
                        </div>
                      </li>
                    ))}
                  </>
                )}
                {!loading && activities.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 sm:gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-indigo-600 flex-shrink-0"></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm truncate">{a.label}</p>
                      <p className="text-[10px] sm:text-xs text-neutral-500">{a.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-lg sm:rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="p-3 sm:p-4 border-b border-neutral-100 font-medium text-sm sm:text-base">Pet Care Summary</div>
            <div className="p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-4 text-xs sm:text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 sm:p-3 rounded-lg bg-neutral-50 gap-1 sm:gap-0">
                  <span className="text-neutral-600 text-[10px] sm:text-xs">Total Pets</span>
                  <span className="font-semibold text-sm sm:text-base">{totalPets}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 sm:p-3 rounded-lg bg-neutral-50 gap-1 sm:gap-0">
                  <span className="text-neutral-600 text-[10px] sm:text-xs">Upcoming</span>
                  <span className="font-semibold text-sm sm:text-base">{upcomingCount}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 sm:p-3 rounded-lg bg-neutral-50 gap-1 sm:gap-0">
                  <span className="text-neutral-600 text-[10px] sm:text-xs">Today</span>
                  <span className="font-semibold text-sm sm:text-base text-green-600">{todayCount}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 sm:p-3 rounded-lg bg-neutral-50 gap-1 sm:gap-0">
                  <span className="text-neutral-600 text-[10px] sm:text-xs">Last Visit</span>
                  <span className="font-semibold text-sm sm:text-base truncate">{lastVisit}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-full">
            <div className="h-full rounded-lg sm:rounded-xl border border-neutral-200 bg-white shadow-sm flex flex-col">
              <div className="p-3 sm:p-4 border-b border-neutral-100 font-medium text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
                <HomeModernIcon className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0" />
                <span className="truncate">Recommended Clinics</span>
              </div>
              <ul className="divide-y divide-neutral-100">
                {loading && (
                  <>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <li key={`cl-sk-${i}`} className="p-3 sm:p-4 animate-pulse">
                        <div className="h-3 w-32 sm:w-40 bg-neutral-200 rounded mb-2" />
                        <div className="h-2 w-20 sm:w-24 bg-neutral-200 rounded" />
                      </li>
                    ))}
                  </>
                )}
                {!loading && recommended.map((c) => (
                  <li key={c.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{c.name}</p>
                      {c.phone && (
                        <p className="text-xs sm:text-sm text-neutral-500 inline-flex items-center gap-1 truncate">
                          <PhoneIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" /> 
                          <span className="truncate">{c.phone}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      {typeof c.distanceKm === 'number' && isFinite(c.distanceKm) && (
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs bg-white ring-1 ring-neutral-200 text-neutral-600 whitespace-nowrap">{c.distanceKm.toFixed(1)} km</span>
                      )}
                      {c.recentScore && c.recentScore > 0 && (
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700 whitespace-nowrap">Recent</span>
                      )}
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="p-1.5 sm:p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 active:scale-95 flex-shrink-0" aria-label="Call">
                          <PhoneIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </a>
                      ) : null}
                      <Link href={`/pet_owner/clinics/${c.id}`} className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 whitespace-nowrap">View</Link>
                    </div>
                  </li>
                ))}
                {!loading && clinics.length === 0 && (
                  <li className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                      <p className="text-xs sm:text-sm text-neutral-500">No clinics found nearby.</p>
                      <Link href="/pet_owner/clinics" className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 whitespace-nowrap">Explore</Link>
                    </div>
                  </li>
                )}
              </ul>
            </div>

          </div>

          <div className="h-full md:col-span-2 xl:col-span-1">
            <div className="h-full rounded-lg sm:rounded-xl border border-neutral-200 bg-white shadow-sm flex flex-col">
              <div className="p-3 sm:p-4 border-b border-neutral-100 font-medium text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
                <InformationCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-sky-600 flex-shrink-0" />
                <span>Care Tips</span>
              </div>
              <ul className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                {tips.map((t) => (
                  <li key={t.id} className="rounded-lg bg-neutral-50 p-2.5 sm:p-3">
                    <p className="text-xs sm:text-sm font-medium mb-1">{t.title}</p>
                    <p className="text-[10px] sm:text-xs text-neutral-600 leading-relaxed">{t.desc}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <CreateAppointmentModal
        open={bookOpen}
        ownerId={ownerId}
        onClose={() => setBookOpen(false)}
        onCreated={() => Swal.fire({ icon: "success", title: "Appointment requested" })}
      />
    </div>
  );
}
