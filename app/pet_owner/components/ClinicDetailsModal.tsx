"use client";

import { useEffect, useRef, useState } from "react";
import { XMarkIcon, BuildingOffice2Icon, MapPinIcon, PhoneIcon, StarIcon, CalendarDaysIcon, UserIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../../lib/supabaseClient";

export type ClinicDetailsModalProps = {
  open: boolean;
  clinicId: number | null;
  onClose: () => void;
};

type Clinic = { id: number; name: string; address: string | null; phone: string | null; email?: string | null; rating?: number | null; latitude?: number | null; longitude?: number | null };

type Vet = { id: number; full_name: string };

export default function ClinicDetailsModal({ open, clinicId, onClose }: ClinicDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [loadingClinic, setLoadingClinic] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [vets, setVets] = useState<Vet[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!open || !clinicId) return;
      setLoadingClinic(true);
      setLoadingRoster(true);
      try {
        const { data: c, error: cErr } = await supabase
          .from("clinics")
          .select("id,name,address,phone,latitude,longitude")
          .eq("id", clinicId)
          .maybeSingle();
        if (cErr) throw cErr;
        setClinic((c as any) || null);
      } catch (e) {
        setClinic(null);
      } finally {
        setLoadingClinic(false);
      }

      // fetch roster separately so UI renders clinic/map immediately
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
  }, [open, clinicId]);

  // Focus trap + ESC
  useEffect(() => {
    if (!open) return;
    const root = modalRef.current; if (!root) return;
    const sel = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(sel)).filter(el => !el.hasAttribute('disabled'));
    nodes[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = Array.from(root.querySelectorAll<HTMLElement>(sel)).filter(el => !el.hasAttribute('disabled'));
      if (f.length === 0) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
    };
    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Initialize Leaflet map when coordinates are available
  useEffect(() => {
    const hasCoords = !!(clinic?.latitude && clinic?.longitude);
    if (!open || !hasCoords) return;
    let cancelled = false;
    (async () => {
      try {
        // inject Leaflet CSS once
        if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        const L = (await import('leaflet')).default;
        if (cancelled || !mapContainerRef.current || !clinic) return;
        const lat = Number(clinic.latitude);
        const lon = Number(clinic.longitude);
        // Create or update map
        if (!mapRef.current) {
          mapRef.current = L.map(mapContainerRef.current, { zoomControl: true, attributionControl: true }).setView([lat, lon], 16);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(mapRef.current);
        } else {
          mapRef.current.setView([lat, lon], 16);
        }
        // Custom clinic marker icon using paw image from public folder
        const icon = L.icon({
          iconUrl: '/paw.webp',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lon]);
          markerRef.current.setIcon(icon);
        } else {
          markerRef.current = L.marker([lat, lon], { icon }).addTo(mapRef.current);
        }
      } catch {
        // If Leaflet is not installed yet, silently ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, clinic?.latitude, clinic?.longitude]);

  // Cleanup map on modal close/unmount
  useEffect(() => {
    if (!open && mapRef.current) {
      try { mapRef.current.remove(); } catch {}
      mapRef.current = null;
      markerRef.current = null;
    }
    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [open]);

  if (!open || !clinicId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={modalRef} className="relative w-full max-w-3xl mx-4 rounded-3xl overflow-hidden" role="dialog" aria-modal="true">
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 opacity-80" />
        <div className="relative rounded-3xl bg-white">
          <div className="px-6 pt-6 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white grid place-items-center">
                <BuildingOffice2Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">Clinic Details</div>
                <div className="text-xs text-neutral-500">Hours and veterinarian roster</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100" aria-label="Close">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 pb-6 space-y-5">
            <div className="rounded-2xl bg-white ring-1 ring-neutral-200 p-4">
              {loadingClinic ? (
                <div className="text-sm text-neutral-500">Loading…</div>
              ) : clinic ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="font-semibold text-neutral-900">{clinic.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-neutral-600"><MapPinIcon className="w-4 h-4" /> {clinic.address || 'No address provided'}</div>
                    {clinic.phone && <div className="mt-1 flex items-center gap-2 text-sm text-neutral-600"><PhoneIcon className="w-4 h-4" /> {clinic.phone}</div>}
                  </div>
                  <div className="sm:text-right">
                    {typeof clinic.rating === 'number' && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-1 text-[11px] ring-1 ring-amber-200">
                        <StarIcon className="w-3.5 h-3.5" /> {clinic.rating?.toFixed?.(1)}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-neutral-500">Opening hours: <span className="font-medium text-neutral-700">Not provided</span></div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-neutral-500">Clinic not found or access restricted.</div>
              )}
            </div>

            {clinic?.latitude && clinic?.longitude ? (
              <div className="rounded-2xl overflow-hidden ring-1 ring-neutral-200">
                <div ref={mapContainerRef} className="w-full h-72" />
                {(() => {
                  const lat = Number(clinic!.latitude);
                  const lon = Number(clinic!.longitude);
                  const link = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat.toFixed(6))}&mlon=${encodeURIComponent(lon.toFixed(6))}#map=17/${encodeURIComponent(lat.toFixed(6))}/${encodeURIComponent(lon.toFixed(6))}`;
                  return (
                    <div className="px-3 py-2 bg-white flex items-center justify-between text-sm text-neutral-600">
                      <div className="flex items-center gap-2"><MapPinIcon className="w-4 h-4" /> {clinic?.address || 'Coordinates'}</div>
                      <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">Open in OSM <ArrowTopRightOnSquareIcon className="w-4 h-4" /></a>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="rounded-2xl bg-white ring-1 ring-neutral-200 p-4 flex items-center justify-between">
                <div className="text-sm text-neutral-600 flex items-center gap-2"><MapPinIcon className="w-4 h-4" /> No map location yet.</div>
                {clinic?.address ? (
                  <button
                    onClick={async () => {
                      if (!clinic?.address) return;
                      try {
                        setGeoLoading(true);
                        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(clinic.address)}`;
                        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
                        const data: any[] = await res.json();
                        if (!data?.length) {
                          alert('Could not find coordinates for this address.');
                          setGeoLoading(false);
                          return;
                        }
                        const lat = parseFloat(data[0].lat);
                        const lon = parseFloat(data[0].lon);
                        const confirmSave = confirm('Location found. Save these coordinates to the clinic record?');
                        if (confirmSave) {
                          const { error } = await supabase.from('clinics').update({ latitude: lat, longitude: lon }).eq('id', clinic.id);
                          if (!error) {
                            setClinic({ ...clinic, latitude: lat, longitude: lon });
                          }
                        } else {
                          setClinic({ ...clinic, latitude: lat, longitude: lon });
                        }
                      } catch {}
                      finally { setGeoLoading(false); }
                    }}
                    className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={geoLoading}
                  >
                    {geoLoading ? 'Locating…' : 'Locate on map'}
                  </button>
                ) : null}
              </div>
            )}

            <div className="rounded-2xl bg-white ring-1 ring-neutral-200 p-4">
              <div className="text-sm font-semibold text-neutral-800 mb-2">Veterinarian roster (from upcoming appointments)</div>
              {loadingRoster ? (
                <div className="text-sm text-neutral-500">Loading roster…</div>
              ) : vets.length === 0 ? (
                <div className="text-sm text-neutral-500">No upcoming veterinarians found.</div>
              ) : (
                <ul className="grid sm:grid-cols-2 gap-2">
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
        </div>
      </div>
    </div>
  );
}
