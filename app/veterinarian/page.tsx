"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import { supabase } from "../../lib/supabaseClient";
import { getCurrentVet } from "../../lib/utils/currentVet";
import Header from "./components/Header";
import KPIs from "./components/KPIs";
import QuickActions from "./components/QuickActions";
import UpcomingAppointments from "./components/UpcomingAppointments";
import RecentReviews from "./components/RecentReviews";
import ProfileCard from "./components/ProfileCard";
import { AcademicCapIcon, CalendarDaysIcon, CheckCircleIcon, ClockIcon, StarIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { Poppins } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const PRIMARY = "#2563eb";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  user_role: string;
  verification_status: string;
};

type Vet = {
  id: number;
  user_id: string;
  full_name: string;
  specialization: string | null;
  clinic_id: number | null;
  is_available: boolean;
  average_rating: number | null;
};

type Appointment = {
  id: number;
  appointment_date: string;
  appointment_time: string;
  clinic_id: number | null;
  status: string;
  reason_for_visit: string | null;
  pet_owner_id: number | null;
  patient_id: number | null;
};

type Review = {
  id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string | null;
};

export default function VetDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vet, setVet] = useState<Vet | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [range, setRange] = useState("30d");
  const [mounted, setMounted] = useState(false);
  const [vetClass, setVetClass] = useState<{ category: string | null; classification_level: string | null; license_type: string | null } | null>(null);

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const { profile: profRes, vet: vetObj } = await getCurrentVet();
        setProfile(profRes as any);
        if (!vetObj) {
          await Swal.fire({ icon: "info", title: "Application pending", text: "Your veterinarian profile is not active yet. Please wait for admin approval." });
          setVet(null);
          setAppointments([]);
          setReviews([]);
          return;
        }
        const vetRow = {
          id: vetObj.id,
          user_id: vetObj.user_id,
          full_name: vetObj.full_name,
          specialization: vetObj.specialization || null,
          clinic_id: (vetObj as any).clinic_id ?? null,
          is_available: !!vetObj.is_available,
          average_rating: vetObj.average_rating ?? 0
        } as Vet;
        setVet(vetRow);
        // Load vet classification
        try {
          const { data: vc } = await supabase
            .from('veterinarian_classifications')
            .select('category,classification_level,license_type')
            .eq('vet_id', vetRow.id)
            .maybeSingle();
          setVetClass((vc as any) || null);
        } catch {}
        // If this is the first approved veterinarian, require clinic location setup before proceeding
        try {
          const { count: approvedCount } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("user_role", "veterinarian")
            .eq("verification_status", "approved");
          // Only enforce gate if we successfully received a count.
          if (approvedCount != null && approvedCount <= 1 && vetRow.clinic_id == null) {
            await Swal.fire({ icon: "info", title: "Set up your clinic location", text: "As the first approved veterinarian, please set up your clinic location to enable bookings." });
            window.location.href = "/veterinarian/clinic/location";
            return;
          }
        } catch {}
        const { data: appts, error: aErr } = await supabase
          .from("appointments")
          .select("id,appointment_date,appointment_time,clinic_id,status,reason_for_visit,pet_owner_id,patient_id")
          .eq("veterinarian_id", vetRow.id)
          .gte("appointment_date", todayISO)
          .order("appointment_date", { ascending: true })
          .order("appointment_time", { ascending: true })
          .limit(8);
        if (aErr) throw aErr;
        setAppointments((appts || []) as Appointment[]);
        const { data: revs, error: rErr } = await supabase
          .from("reviews")
          .select("id,rating,title,comment,created_at")
          .eq("veterinarian_id", vetRow.id)
          .eq("is_approved", true)
          .order("id", { ascending: false })
          .limit(6);
        if (rErr) throw rErr;
        setReviews((revs || []) as Review[]);
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Failed to load", text: err?.message || "Please try again." });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [todayISO]);

  const counts = useMemo(() => {
    const t = appointments.filter(a => a.appointment_date === todayISO).length;
    const pending = appointments.filter(a => a.status === "pending").length;
    const confirmed = appointments.filter(a => a.status === "confirmed").length;
    return { today: t, pending, confirmed };
  }, [appointments, todayISO]);

  const toggleAvailability = async () => {
    if (!vet) return;
    const res = await Swal.fire({ icon: "question", title: vet.is_available ? "Go offline?" : "Go online?", showCancelButton: true, confirmButtonText: "Confirm" });
    if (!res.isConfirmed) return;
    const { error } = await supabase.from("veterinarians").update({ is_available: !vet.is_available }).eq("id", vet.id);
    if (error) {
      await Swal.fire({ icon: "error", title: "Update failed", text: error.message });
      return;
    }
    const newStatus = !vet.is_available;
    setVet({ ...vet, is_available: newStatus });
    // Broadcast status change to all listeners
    try {
      const channel = supabase.channel(`vet-status-${vet.id}`);
      channel.send({ type: 'broadcast', event: 'status_change', payload: { vet_id: vet.id, is_available: newStatus } });
    } catch {}
    await Swal.fire({ icon: "success", title: "Status updated" });
  };

  // Subscribe to broadcast changes
  useEffect(() => {
    if (!vet) return;
    const channel = supabase.channel(`vet-status-${vet.id}`);
    channel.on('broadcast', { event: 'status_change' }, (payload: any) => {
      if (payload.payload?.vet_id === vet.id) {
        setVet(v => v ? { ...v, is_available: payload.payload.is_available } : null);
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [vet?.id]);
  

  return (
    <div className={`${poppins.className}`}> 
      <div className="w-full max-w-none mx-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 space-y-5">
        <Header
          name={vet?.full_name || profile?.full_name || "Veterinarian"}
          online={!!vet?.is_available}
          verification={profile?.verification_status || "pending"}
          specialization={vet?.specialization || "General Practice"}
          onToggle={toggleAvailability}
          primary={PRIMARY}
        />

        <div className="rounded-3xl bg-white/70 backdrop-blur p-5 sm:p-6 shadow-md space-y-6">
          <KPIs today={counts.today} pending={counts.pending} confirmed={counts.confirmed} rating={vet?.average_rating ?? 0} primary={PRIMARY} />

          <QuickActions />

          <div className="grid lg:grid-cols-3 gap-6">
            <UpcomingAppointments
              appointments={appointments}
              loading={loading}
              range={range}
              setRange={setRange}
              mounted={mounted}
              primary={PRIMARY}
            />
            <RecentReviews reviews={reviews} loading={loading} primary={PRIMARY} />
          </div>

          <ProfileCard
            name={vet?.full_name || profile?.full_name || "-"}
            specialization={vet?.specialization || "General"}
            email={profile?.email || null}
            verification={profile?.verification_status || "pending"}
            primary={PRIMARY}
            category={vetClass?.category || null}
            classificationLevel={vetClass?.classification_level || null}
            licenseType={vetClass?.license_type || null}
          />
        </div>

      </div>
    </div>
  );
}
