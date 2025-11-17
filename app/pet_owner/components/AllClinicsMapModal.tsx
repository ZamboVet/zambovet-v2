"use client";

import { useEffect, useRef, useState } from "react";
import { XMarkIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../../lib/supabaseClient";

export type AllClinicsMapModalProps = {
  open: boolean;
  onClose: () => void;
  points: Array<{ id: number; name: string; lat: number; lon: number; address?: string | null }>;
};

type Service = { id: number; clinic_id: number; name: string; description: string | null; is_active: boolean };

export default function AllClinicsMapModal({ open, onClose, points }: AllClinicsMapModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [clinicServices, setClinicServices] = useState<Record<number, Service[]>>({});
  const [loadingServices, setLoadingServices] = useState(false);

  // Inject custom CSS for popup styling
  useEffect(() => {
    if (!open) return;
    const styleId = 'clinic-popup-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .clinic-popup .leaflet-popup-content-wrapper {
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        padding: 0;
      }
      .clinic-popup .leaflet-popup-content {
        margin: 0;
        padding: 12px;
        min-width: 200px;
        max-width: 320px;
      }
      .clinic-popup .leaflet-popup-tip {
        background: white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      @media (max-width: 640px) {
        .clinic-popup .leaflet-popup-content {
          max-width: 280px;
          padding: 10px;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      const existing = document.getElementById(styleId);
      if (existing) existing.remove();
    };
  }, [open]);

  // Fetch services for all clinics
  useEffect(() => {
    if (!open || points.length === 0) return;
    const fetchServices = async () => {
      setLoadingServices(true);
      try {
        const clinicIds = points.map(p => p.id);
        const { data, error } = await supabase
          .from('services')
          .select('id, clinic_id, name, description, is_active')
          .in('clinic_id', clinicIds)
          .eq('is_active', true)
          .order('name', { ascending: true });
        
        if (error) throw error;
        
        const servicesByClinic: Record<number, Service[]> = {};
        (data || []).forEach((service: any) => {
          if (!servicesByClinic[service.clinic_id]) {
            servicesByClinic[service.clinic_id] = [];
          }
          servicesByClinic[service.clinic_id].push(service);
        });
        
        setClinicServices(servicesByClinic);
      } catch (e) {
        console.error('Failed to fetch services:', e);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, [open, points]);

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
        
        // Helper function to escape HTML
        const escapeHtml = (text: string | null | undefined): string => {
          if (!text) return '';
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        };
        
        // Helper function to create popup HTML with services
        const createPopupHTML = (clinicId: number, clinicName: string, address: string | null) => {
          const services = clinicServices[clinicId] || [];
          const hasServices = services.length > 0;
          const escapedName = escapeHtml(clinicName);
          const escapedAddress = address ? escapeHtml(address) : '';
          
          let html = `
            <div style="min-width:200px;max-width:320px;font-family:system-ui,-apple-system,sans-serif">
              <div style="font-weight:600;font-size:15px;color:#111827;margin-bottom:8px;line-height:1.4">${escapedName}</div>
              ${escapedAddress ? `<div style="font-size:12px;color:#6b7280;display:flex;gap:6px;align-items:start;margin-bottom:${hasServices ? '12px' : '0'};line-height:1.5">
                <span style="flex-shrink:0;margin-top:2px">📍</span>
                <span>${escapedAddress}</span>
              </div>` : ''}
              ${hasServices ? `
                <div style="border-top:1px solid #e5e7eb;padding-top:10px;margin-top:10px">
                  <div style="font-weight:600;font-size:12px;color:#059669;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Available Services</div>
                  <div style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto">
                    ${services.map(s => {
                      const escapedServiceName = escapeHtml(s.name);
                      const escapedDescription = s.description ? escapeHtml(s.description) : '';
                      return `
                      <div style="padding:6px 8px;background:#f0fdf4;border-left:3px solid #10b981;border-radius:4px">
                        <div style="font-weight:500;font-size:13px;color:#111827;margin-bottom:${escapedDescription ? '4px' : '0'}">${escapedServiceName}</div>
                        ${escapedDescription ? `<div style="font-size:11px;color:#6b7280;line-height:1.4">${escapedDescription}</div>` : ''}
                      </div>
                    `;
                    }).join('')}
                  </div>
                </div>
              ` : `
                <div style="border-top:1px solid #e5e7eb;padding-top:10px;margin-top:10px">
                  <div style="font-size:12px;color:#9ca3af;font-style:italic">No services listed</div>
                </div>
              `}
            </div>
          `;
          return html;
        };
        
        coords.forEach(p => {
          const mk = L.marker([p.lat, p.lon], { icon }).addTo(mapRef.current);
          // Create popup with services
          const popupContent = createPopupHTML(p.id, p.name, p.address ?? null);
          mk.bindPopup(popupContent, { 
            maxWidth: 350,
            className: 'clinic-popup'
          });
          markersRef.current.push(mk);
          // @ts-ignore
          bounds.extend([p.lat, p.lon]);
        });
        
        // Update popups when services are loaded
        if (Object.keys(clinicServices).length > 0) {
          markersRef.current.forEach((mk, idx) => {
            const p = coords[idx];
            if (p) {
              const popupContent = createPopupHTML(p.id, p.name, p.address ?? null);
              mk.setPopupContent(popupContent);
            }
          });
        }
        
        if (coords.length > 1) mapRef.current.fitBounds(bounds.pad(0.15));
      } catch {
        // ignore if leaflet not available yet
      }
    })();
    return () => { cancelled = true; };
  }, [open, points, clinicServices]);

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
                <div className="text-xs text-neutral-500">
                  {loadingServices ? 'Loading services...' : 'Click markers to view clinic services'}
                </div>
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
