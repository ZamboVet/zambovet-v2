"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../../lib/supabaseClient";
import { getCurrentVet } from "../../../../lib/utils/currentVet";
import { Poppins } from "next/font/google";
import { MapPinIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

const poppins = Poppins({ subsets: ["latin"], weight: ["400","500","600","700"] });
const PRIMARY = "#2563eb";

type Profile = { id: string; user_role: string; full_name: string | null };

type Vet = { id: number; user_id: string; full_name: string; clinic_id: number | null };

type Clinic = { id: number; name: string; address: string | null; latitude: number | null; longitude: number | null; operating_hours?: any };
type Hours = { [day in "Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat"|"Sun"]: { open: string; close: string; closed?: boolean } };

export default function ClinicLocationPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vet, setVet] = useState<Vet | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [address, setAddress] = useState<string>("");
  const [lat, setLat] = useState<string>("");
  const [lon, setLon] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [hours, setHours] = useState<Hours>({ Mon:{open:"09:00",close:"17:00"}, Tue:{open:"09:00",close:"17:00"}, Wed:{open:"09:00",close:"17:00"}, Thu:{open:"09:00",close:"17:00"}, Fri:{open:"09:00",close:"17:00"}, Sat:{open:"09:00",close:"12:00"}, Sun:{open:"09:00",close:"12:00",closed:true} });
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { profile: p, vet: v } = await getCurrentVet();
        setProfile({ id: p.id, user_role: p.user_role, full_name: p.full_name || null });
        if (!v) {
          console.log('Failed to get or create veterinarian profile');
          await Swal.fire({
            icon: 'error',
            title: 'Profile Error',
            text: 'Unable to load or create your veterinarian profile. Please try again or contact support.',
            confirmButtonText: 'OK',
            allowOutsideClick: false
          });
          return;
        }
        
        console.log('Veterinarian profile found:', v.id);
        setVet({ id: v.id, user_id: v.user_id, full_name: v.full_name, clinic_id: (v as any).clinic_id ?? null });
        
        // Load clinic data if exists
        if (v.clinic_id != null) {
          console.log('Loading clinic data for clinic ID:', v.clinic_id);
          const { data: c, error: cErr } = await supabase
            .from("clinics")
            .select("id,name,address,latitude,longitude,operating_hours")
            .eq("id", Number(v.clinic_id))
            .single();
            
          if (cErr) {
            console.error('Clinic data error:', cErr);
            throw cErr;
          }
          
          console.log('Clinic data loaded:', c.id);
          setClinic(c as Clinic);
          setClinicName(c.name || "");
          setAddress(c.address || "");
          setLat(c?.latitude != null ? String(c.latitude) : "");
          setLon(c?.longitude != null ? String(c.longitude) : "");
          if ((c as any)?.operating_hours) {
            setHours((c as any).operating_hours as Hours);
          }
        } else {
          console.log('No clinic found, allowing creation of new clinic');
          setClinic(null);
        }
      } catch (err: any) {
        console.error('Initialization error:', err);
        await Swal.fire({ 
          icon: "error", 
          title: "Failed to load data", 
          text: err?.message || "An error occurred while loading your data. Please try again.",
          showConfirmButton: true
        });
      } finally {
        setLoading(false);
      }
    };
    
    init();
    
    // Cleanup function
    return () => {
      // Any cleanup if needed
    };
  }, []);

  const bbox = useMemo(() => {
    const la = parseFloat(lat);
    const lo = parseFloat(lon);
    if (Number.isNaN(la) || Number.isNaN(lo)) return null as string | null;
    const d = 0.01;
    return `${lo - d},${la - d},${lo + d},${la + d}`;
  }, [lat, lon]);

  const save = async () => {
    console.log('Save button clicked');
    
    if (loading) {
      console.log('Still loading data, please wait');
      await Swal.fire({
        icon: 'info',
        title: 'Loading',
        text: 'Please wait while we load your data...',
        showConfirmButton: false,
        timer: 2000
      });
      return;
    }
    
    if (!vet) {
      console.log('Vet is null, cannot save');
      await Swal.fire({
        icon: 'error',
        title: 'Veterinarian Profile Required',
        text: 'Unable to load your veterinarian profile. Please try refreshing the page or contact support if the issue persists.',
        confirmButtonText: 'Refresh',
        allowOutsideClick: false
      }).then(() => {
        window.location.reload();
      });
      return;
    }
    console.log('Vet ID:', vet.id);
    
    const la = parseFloat(lat);
    const lo = parseFloat(lon);
    console.log('Parsed coordinates:', { la, lo });
    
    if (Number.isNaN(la) || Number.isNaN(lo)) {
      console.log('Invalid coordinates');
      await Swal.fire({ 
        icon: "warning", 
        title: "Invalid coordinates", 
        text: "Please enter both latitude and longitude." 
      });
      return;
    }
    const addr = (address || "").trim();
    if (!addr) {
      await Swal.fire({
        icon: 'warning',
        title: 'Address required',
        text: 'Clinic address cannot be empty.'
      });
      return;
    }
    setSaving(true);
    try {
      // Re-fetch latest clinic_id to avoid duplicate inserts when state is stale
      let latestClinicId: number | null = vet?.clinic_id ?? null;
      try {
        const { data: freshVet } = await supabase
          .from('veterinarians')
          .select('id,clinic_id')
          .eq('id', vet.id)
          .single();
        if (freshVet && typeof freshVet.clinic_id !== 'undefined') {
          latestClinicId = (freshVet.clinic_id as number | null);
          setVet(v => v ? { ...v, clinic_id: latestClinicId } : v);
        }
      } catch {}

      if (clinic || latestClinicId != null) {
        const targetId = clinic ? clinic.id : (latestClinicId as number);
        console.log('Updating existing clinic with ID:', targetId);
        const updateData = { 
          name: clinicName || (clinic ? clinic.name : ''), 
          latitude: la, 
          longitude: lo, 
          address: address || (clinic ? clinic.address : null), 
          operating_hours: hours 
        };
        console.log('Update data:', updateData);
        
        const { error } = await supabase
          .from("clinics")
          .update(updateData)
          .eq("id", targetId);
          
        if (error) {
          console.error('Error updating clinic:', error);
          throw error;
        }
        if (!clinic && latestClinicId != null) {
          // hydrate local clinic state if we updated by id only
          setClinic({ id: targetId, name: updateData.name, address: updateData.address as any, latitude: la, longitude: lo, operating_hours: hours });
        }
      } else {
        console.log('Creating new clinic');
        const insertData = { 
          name: clinicName || "My Clinic", 
          address: addr, 
          latitude: la, 
          longitude: lo, 
          operating_hours: hours 
        };
        console.log('Insert data:', insertData);
        
        const { data: ins, error: insErr } = await supabase
          .from("clinics")
          .insert(insertData)
          .select("id")
          .single();
          
        if (insErr) {
          console.error('Error creating clinic:', insErr);
          throw insErr;
        }
        
        const newId = ins?.id as number | undefined;
        console.log('New clinic ID:', newId);
        
        if (!newId) {
          throw new Error('Failed to get new clinic ID');
        }
        
        console.log('Updating veterinarian with clinic ID:', newId);
        
        const { error: updateErr } = await supabase
          .from("veterinarians")
          .update({ clinic_id: newId })
          .eq("id", vet.id);
          
        if (updateErr) {
          console.error('Error updating veterinarian:', updateErr);
          throw updateErr;
        }
        
        const newClinic = { 
          id: newId!, 
          name: clinicName || "My Clinic", 
          address, 
          latitude: la, 
          longitude: lo, 
          operating_hours: hours 
        };
        
        console.log('Setting new clinic data:', newClinic);
        setClinic(newClinic);
        setVet(v => v ? { ...v, clinic_id: newId! } : v);
      }
      console.log('Save successful');
      await Swal.fire({ 
        icon: "success", 
        title: "Location saved",
        showConfirmButton: true,
        timer: 3000
      });
    } catch (err: any) {
      console.error('Save error:', err);
      await Swal.fire({ 
        icon: "error", 
        title: "Save failed", 
        text: err?.message || "Please try again.",
        showConfirmButton: true
      });
    } finally {
      setSaving(false);
    }
  };

  // Debounced suggestions as user types
  useEffect(() => {
    const q = address.trim();
    if (!q) { setSuggestions([]); return; }
    const id = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': 'en' } });
        const data: Array<{ display_name: string; lat: string; lon: string }> = res.ok ? await res.json() : [];
        setSuggestions(data);
      } catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(id);
  }, [address]);

  const useMyLocation = async () => {
    if (!('geolocation' in navigator)) { await Swal.fire({ icon: 'info', title: 'Location not available', text: 'Your browser does not support geolocation.' }); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: la, longitude: lo } = pos.coords;
      setLat(String(la)); setLon(String(lo));
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(la))}&lon=${encodeURIComponent(String(lo))}`);
        if (res.ok) {
          const j = await res.json();
          if (j?.display_name) setAddress(j.display_name);
        }
        await Swal.fire({ icon: 'success', title: 'Location set from device' });
      } catch {
        await Swal.fire({ icon: 'success', title: 'Location set from device' });
      }
    }, async (err) => {
      await Swal.fire({ icon: 'error', title: 'Permission required', text: err?.message || 'Enable location permission and try again.' });
    }, { enableHighAccuracy: true, timeout: 8000 });
  };

  const geocode = async () => {
    const q = address.trim();
    if (!q) { await Swal.fire({ icon: 'info', title: 'Enter an address', text: 'Type a clinic address to search.' }); return; }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': 'en' } });
      if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
      const data: Array<{ lat: string; lon: string; display_name: string }>= await res.json();
      if (!data.length) { await Swal.fire({ icon: 'warning', title: 'No results', text: 'Try a more specific address.' }); return; }
      const best = data[0];
      setLat(best.lat);
      setLon(best.lon);
      await Swal.fire({ icon: 'success', title: 'Location found', text: best.display_name });
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Geocoding failed', text: e?.message || 'Please try again.' });
    }
  };

  // Leaflet map
  useEffect(() => {
    const initMap = async () => {
      try {
        if (mapRef.current) return; // already initialized
        const mod = await import('leaflet');
        const L: any = (mod as any).default || mod; // leaflet default export
        leafletRef.current = L;
        // inject CSS (CDN) if not present
        if (!document.querySelector('link[data-leaflet]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.setAttribute('data-leaflet','1');
          document.head.appendChild(link);
        }
        const container = document.getElementById('vet-map');
        if (!container) return;
        const startLat = !Number.isNaN(parseFloat(lat)) ? parseFloat(lat) : 14.5995;
        const startLon = !Number.isNaN(parseFloat(lon)) ? parseFloat(lon) : 120.9842;
        const map = L.map(container).setView([startLat, startLon], 15);
        mapRef.current = map;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
        const icon = L.icon({ iconUrl: '/paw.webp', iconSize: [32,32], iconAnchor: [16,32] });
        const m = L.marker([startLat, startLon], { icon }).addTo(map);
        markerRef.current = m;
        map.on('click', async (e: any) => {
          const { lat: la, lng: lo } = e.latlng;
          setLat(String(la));
          setLon(String(lo));
          m.setLatLng([la, lo]);
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(la))}&lon=${encodeURIComponent(String(lo))}`);
            if (res.ok) {
              const j = await res.json();
              if (j?.display_name) {
                setAddress(j.display_name);
                setSuggestions([]);
              }
            }
          } catch {}
        });
      } catch {}
    };
    initMap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, lat, lon]);

  useEffect(() => {
    const m = markerRef.current; const L = leafletRef.current; const map = mapRef.current;
    if (!m || !L || !map) return;
    const la = parseFloat(lat); const lo = parseFloat(lon);
    if (!Number.isNaN(la) && !Number.isNaN(lo)) { m.setLatLng([la, lo]); map.setView([la, lo], 15); }
  }, [lat, lon]);

  return (
    <div className={`${poppins.className} space-y-6`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>Clinic Location</h1>
          <div className="text-sm text-gray-500">Set your clinic coordinates and opening hours</div>
        </div>
        <button onClick={save} disabled={saving || loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
          Save
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white/80 backdrop-blur-sm p-5 shadow ring-1 ring-black/5 space-y-4">
          <div className="text-lg font-semibold" style={{ color: PRIMARY }}>Coordinates</div>
          <div className="grid grid-cols-1 gap-3 relative">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 ring-1 ring-gray-200">
              <span className="text-xs text-gray-500">Clinic name</span>
              <input value={clinicName} onChange={(e)=>setClinicName(e.target.value)} placeholder="My Vet Clinic" className="flex-1 outline-none bg-transparent text-sm" />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 ring-1 ring-gray-200">
              <span className="text-xs text-gray-500">Address</span>
              <input value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="Search address or place" className="flex-1 outline-none bg-transparent text-sm" />
              <button onClick={geocode} className="ml-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700">Find</button>
              <button onClick={useMyLocation} className="ml-2 px-3 py-1.5 rounded-lg bg-white ring-1 ring-gray-200 text-xs hover:bg-gray-50">Use my location</button>
            </div>
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-xl bg-white shadow ring-1 ring-black/10 overflow-hidden">
                <ul className="max-h-60 overflow-auto text-sm">
                  {suggestions.map((s, i) => (
                    <li key={i} className="px-3 py-2 hover:bg-gray-50 cursor-pointer" onClick={() => { setAddress(s.display_name); setLat(s.lat); setLon(s.lon); setSuggestions([]); }}>
                      <div className="font-medium text-gray-800 truncate">{s.display_name}</div>
                      <div className="text-xs text-gray-500">{s.lat}, {s.lon}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 ring-1 ring-gray-200">
              <span className="text-xs text-gray-500">Latitude</span>
              <input value={lat} onChange={(e)=>setLat(e.target.value)} placeholder="14.5995" className="flex-1 outline-none bg-transparent text-sm" />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 ring-1 ring-gray-200">
              <span className="text-xs text-gray-500">Longitude</span>
              <input value={lon} onChange={(e)=>setLon(e.target.value)} placeholder="120.9842" className="flex-1 outline-none bg-transparent text-sm" />
            </div>
          </div>
          <div className="text-xs text-gray-500">Type your address and click Find to auto-fill coordinates, or paste coordinates manually.</div>
        </div>

        <div className="rounded-3xl bg-white/80 backdrop-blur-sm p-5 shadow ring-1 ring-black/5">
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-2 text-lg font-semibold" style={{ color: PRIMARY }}>
              <MapPinIcon className="w-5 h-5" /> Map
            </div>
            {bbox && lat && lon ? (
              <a href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lon)}#map=17/${encodeURIComponent(lat)}/${encodeURIComponent(lon)}`} target="_blank" rel="noreferrer" className="text-sm text-blue-700">Open in OSM</a>
            ) : null}
          </div>
          <div id="vet-map" className="h-72 rounded-xl overflow-hidden ring-1 ring-gray-200 bg-gray-50" />
        </div>
      </div>

      <div className="rounded-3xl bg-white/80 backdrop-blur-sm p-5 shadow ring-1 ring-black/5">
        <div className="text-lg font-semibold mb-3" style={{ color: PRIMARY }}>Opening hours</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] as const).map(d => (
            <div key={d} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 ring-1 ring-gray-200">
              <span className="w-10 text-gray-600">{d}</span>
              <label className="inline-flex items-center gap-1 text-xs text-gray-600">
                <input type="checkbox" checked={!!hours[d].closed} onChange={(e)=> setHours(h => ({ ...h, [d]: { ...h[d], closed: e.target.checked } }))} /> Closed
              </label>
              <input type="time" value={hours[d].open} onChange={(e)=> setHours(h => ({ ...h, [d]: { ...h[d], open: e.target.value } }))} disabled={!!hours[d].closed} className="ml-auto outline-none bg-transparent" />
              <span className="text-gray-300">–</span>
              <input type="time" value={hours[d].close} onChange={(e)=> setHours(h => ({ ...h, [d]: { ...h[d], close: e.target.value } }))} disabled={!!hours[d].closed} className="outline-none bg-transparent" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
