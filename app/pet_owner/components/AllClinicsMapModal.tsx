"use client";

import { useEffect, useRef } from "react";
import { XMarkIcon, MapPinIcon } from "@heroicons/react/24/outline";

export type AllClinicsMapModalProps = {
  open: boolean;
  onClose: () => void;
  points: Array<{ id: number; name: string; lat: number; lon: number; address?: string | null }>;
};

export default function AllClinicsMapModal({ open, onClose, points }: AllClinicsMapModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

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

  // Init Leaflet map and markers
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        const L = (await import('leaflet')).default;
        if (cancelled || !mapContainerRef.current) return;
        // Build bounds from points with coords
        const coords = points.filter(p => isFinite(p.lat) && isFinite(p.lon));
        const center: [number, number] = coords.length ? [coords[0].lat, coords[0].lon] : [14.5995, 120.9842];
        if (!mapRef.current) {
          mapRef.current = L.map(mapContainerRef.current, { zoomControl: true, attributionControl: true }).setView(center, 12);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(mapRef.current);
        }
        // Clear previous markers
        markersRef.current.forEach(m => { try { m.remove(); } catch {} });
        markersRef.current = [];
        const icon = L.icon({ iconUrl: '/paw.webp', iconSize: [32, 32], iconAnchor: [16, 16] });
        const bounds = L.latLngBounds([]);
        coords.forEach(p => {
          const mk = L.marker([p.lat, p.lon], { icon }).addTo(mapRef.current);
          mk.bindPopup(`<div style="min-width:180px"><div style="font-weight:600">${p.name}</div><div style="font-size:12px;color:#6b7280;display:flex;gap:6px;align-items:center"><span>📍</span><span>${p.address ? String(p.address).replace(/`/g,'') : ''}</span></div></div>`);
          markersRef.current.push(mk);
          // @ts-ignore
          bounds.extend([p.lat, p.lon]);
        });
        if (coords.length > 1) mapRef.current.fitBounds(bounds.pad(0.15));
      } catch {
        // ignore if leaflet not available yet
      }
    })();
    return () => { cancelled = true; };
  }, [open, points]);

  // Cleanup
  useEffect(() => {
    if (!open && mapRef.current) {
      try { mapRef.current.remove(); } catch {}
      mapRef.current = null;
      markersRef.current = [];
    }
    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
        markersRef.current = [];
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={modalRef} className="relative w-full max-w-5xl mx-4 rounded-3xl overflow-hidden" role="dialog" aria-modal="true">
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 opacity-80" />
        <div className="relative rounded-3xl bg-white">
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white grid place-items-center">
                <MapPinIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">All Clinics Map</div>
                <div className="text-xs text-neutral-500">Showing clinic locations</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100" aria-label="Close">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="px-6 pb-6">
            <div ref={mapContainerRef} className="w-full h-[70vh] rounded-2xl ring-1 ring-neutral-200 overflow-hidden" />
          </div>
        </div>
      </div>
    </div>
  );
}
