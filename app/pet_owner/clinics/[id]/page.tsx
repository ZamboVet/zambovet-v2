"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabaseClient";
import { BuildingOffice2Icon, MapPinIcon, PhoneIcon, ArrowLeftIcon, ArrowTopRightOnSquareIcon, UserIcon } from "@heroicons/react/24/outline";

type Clinic = { id: number; name: string; address: string | null; phone: string | null; latitude?: number | null; longitude?: number | null };

type Vet = { id: number; full_name: string };

export default function ClinicDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const clinicId = Number(id);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: c } = await supabase
          .from("clinics")
          .select("id,name,address,phone,latitude,longitude")
          .eq("id", clinicId)
          .maybeSingle();
        setClinic((c as any) || null);
      } finally {
        setLoading(false);
      }
      try {
        const today = new Date().toISOString().slice(0,10);
        const { data: appts } = await supabase
          .from("appointments")
          .select("veterinarian_id")
          .eq("clinic_id", clinicId)
          .gte("appointment_date", today);
        const vetIds = Array.from(new Set(((appts || []) as any[]).map(a => a.veterinarian_id).filter(Boolean)));
        if (vetIds.length) {
          const { data: vRows } = await supabase.from("veterinarians").select("id,full_name").in("id", vetIds);
          setVets((vRows || []) as any);
        } else {
          setVets([]);
        }
      } finally {
        setLoadingRoster(false);
      }
    };
    load();
  }, [clinicId]);

  const MapBlock = () => {
    if (!clinic?.latitude || !clinic?.longitude) return null;
    const lat = Number(clinic.latitude);
    const lon = Number(clinic.longitude);
    const d = 0.005;
    const bbox = `${(lon - d).toFixed(6)},${(lat - d).toFixed(6)},${(lon + d).toFixed(6)},${(lat + d).toFixed(6)}`;
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;
    const link = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat.toFixed(6))}&mlon=${encodeURIComponent(lon.toFixed(6))}#map=17/${encodeURIComponent(lat.toFixed(6))}/${encodeURIComponent(lon.toFixed(6))}`;
    return (
      <div className="rounded-2xl overflow-hidden ring-1 ring-neutral-200">
        <iframe title="Clinic location" className="w-full h-80" src={src} />
        <div className="px-3 py-2 bg-white flex items-center justify-between text-sm text-neutral-600">
          <div className="flex items-center gap-2"><MapPinIcon className="w-4 h-4" /> {clinic?.address || 'Coordinates'}</div>
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">Open in OSM <ArrowTopRightOnSquareIcon className="w-4 h-4" /></a>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/pet_owner/clinics" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-sm">
            <ArrowLeftIcon className="w-4 h-4" /> Back
          </Link>
        </div>
      </div>

      <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-5">
        {loading ? (
          <div className="h-24 rounded-xl bg-neutral-100 animate-pulse" />
        ) : clinic ? (
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white grid place-items-center"><BuildingOffice2Icon className="w-5 h-5" /></div>
                <div>
                  <div className="text-xl font-semibold text-neutral-900">{clinic.name}</div>
                  <div className="mt-1 flex items-start gap-2 text-sm text-neutral-600"><MapPinIcon className="w-4 h-4 mt-0.5" /> {clinic.address || 'No address'}</div>
                  {clinic.phone && <div className="mt-1 flex items-start gap-2 text-sm text-neutral-600"><PhoneIcon className="w-4 h-4 mt-0.5" /> {clinic.phone}</div>}
                </div>
              </div>
              <MapBlock />
            </div>
            <div className="rounded-2xl bg-white ring-1 ring-neutral-200 p-4 h-fit">
              <div className="text-sm font-semibold text-neutral-800 mb-2">Veterinarian roster</div>
              {loadingRoster ? (
                <div className="text-sm text-neutral-500">Loading roster…</div>
              ) : vets.length === 0 ? (
                <div className="text-sm text-neutral-500">No upcoming veterinarians found.</div>
              ) : (
                <ul className="space-y-2">
                  {vets.map(v => (
                    <li key={v.id} className="rounded-xl bg-neutral-50 p-3 flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-neutral-600" />
                      <div className="font-medium text-neutral-800">{v.full_name}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-neutral-500">Clinic not found or access restricted.</div>
        )}
      </div>
    </div>
  );
}
