"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { BuildingOffice2Icon, MagnifyingGlassIcon, MapPinIcon, PhoneIcon, StarIcon, PlusIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import CreateAppointmentModal from "../components/CreateAppointmentModal";
import ClinicDetailsModal from "../components/ClinicDetailsModal";
import AllClinicsMapModal from "../components/AllClinicsMapModal";

type Review = { id: number; rating: number; title: string | null; comment: string | null; created_at: string };
type Clinic = { id: number; name: string; address: string | null; phone: string | null; rating?: number | null; reviews?: Review[] };

export default function OwnerClinicsPage() {
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [items, setItems] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [presetClinic, setPresetClinic] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [availableSet, setAvailableSet] = useState<Set<number>>(new Set());
  const [allMapOpen, setAllMapOpen] = useState(false);
  const [allPoints, setAllPoints] = useState<Array<{ id:number; name:string; lat:number; lon:number; address?: string | null }>>([]);
  const [clinicReviews, setClinicReviews] = useState<Record<number, Review[]>>({});
  const [expandedClinic, setExpandedClinic] = useState<number | null>(null);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const debounceTimer = useRef<any>(null);
  const onSearchChange = (val: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setQuery(val), 300);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) {
          await Swal.fire({ icon: "warning", title: "Sign in required", text: "Please sign in to continue." });
          window.location.href = "/login";
          return;
        }
        const { data: ownerRow } = await supabase.from("pet_owner_profiles").select("id").eq("user_id", userId).maybeSingle();
        setOwnerId(ownerRow?.id ?? null);
      } catch (e: any) {
        await Swal.fire({ icon: "error", title: "Failed to load", text: e?.message || "Please try again." });
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      try {
        let q = supabase.from("clinics").select("id,name,address,phone").order("name", { ascending: true });
        if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
        const { data, error } = await q;
        if (error) throw error;
        setItems((data || []) as any);
      } catch (e: any) {
        await Swal.fire({ icon: "error", title: "Failed to fetch", text: e?.message || "Please try again." });
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [query]);

  // Fetch availability (clinics having available veterinarians)
  useEffect(() => {
    const fetchAvailability = async () => {
      const { data } = await supabase
        .from('veterinarians')
        .select('clinic_id')
        .eq('is_available', true)
        .not('clinic_id', 'is', null);
      const set = new Set<number>();
      (data || []).forEach((r: any) => { if (r.clinic_id) set.add(r.clinic_id as number); });
      setAvailableSet(set);
    };
    fetchAvailability();
  }, []);

  // Fetch reviews for all clinics
  useEffect(() => {
    const fetchAllReviews = async () => {
      if (items.length === 0) return;
      try {
        const clinicIds = items.map(c => c.id);
        const { data, error } = await supabase
          .from('reviews')
          .select('id,clinic_id,rating,title,comment,created_at')
          .in('clinic_id', clinicIds)
          .eq('is_approved', true)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const reviewsByClinic: Record<number, Review[]> = {};
        (data || []).forEach((review: any) => {
          if (!reviewsByClinic[review.clinic_id]) {
            reviewsByClinic[review.clinic_id] = [];
          }
          reviewsByClinic[review.clinic_id].push(review);
        });
        
        setClinicReviews(reviewsByClinic);
      } catch (e: any) {
        // Silently fail if reviews can't be fetched
      }
    };
    fetchAllReviews();
  }, [items]);

  // Listen for veterinarian status changes
  useEffect(() => {
    const channel = supabase.channel('vet-status-changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'veterinarians',
        filter: 'clinic_id=not.is.null'
      }, async () => {
        // Refresh availability when vet status changes
        const { data } = await supabase
          .from('veterinarians')
          .select('clinic_id')
          .eq('is_available', true)
          .not('clinic_id', 'is', null);
        const set = new Set<number>();
        (data || []).forEach((r: any) => { if (r.clinic_id) set.add(r.clinic_id as number); });
        setAvailableSet(set);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Derive city list from addresses
  const allCities = Array.from(new Set(items
    .map(c => (c.address || '').split(',').map(s=>s.trim()).slice(-2,-1)[0])
    .filter(Boolean))) as string[];

  // Persist filters to URL + localStorage
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (city && city !== 'all') params.set('city', city); else params.delete('city');
      if (onlyAvailable) params.set('available', '1'); else params.delete('available');
      const q = params.toString();
      const url = `${window.location.pathname}${q ? `?${q}` : ''}`;
      window.history.replaceState(null, '', url);
      localStorage.setItem('clinicsFilters', JSON.stringify({ city, onlyAvailable }));
    } catch {}
  }, [city, onlyAvailable]);

  // Initialize from URL/localStorage
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const saved = localStorage.getItem('clinicsFilters');
      const s = saved ? JSON.parse(saved) : {};
      const c = params.get('city') || s.city || 'all';
      const a = (params.get('available') || (s.onlyAvailable ? '1' : '')) ? true : false;
      setCity(c);
      setOnlyAvailable(a);
    } catch {}
  }, []);

  const filtered = items.filter(c => {
    const matchQuery = query.trim() ? (c.name || '').toLowerCase().includes(query.trim().toLowerCase()) : true;
    const inferredCity = ((c.address || '').split(',').map((s:string)=>s.trim()).slice(-2,-1)[0]) || '';
    const matchCity = city === 'all' ? true : inferredCity.toLowerCase() === city.toLowerCase();
    const matchAvail = onlyAvailable ? availableSet.has(c.id) : true;
    return matchQuery && matchCity && matchAvail;
  });

  const onOpenAllMap = async () => {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('id,name,address,latitude,longitude')
        .eq('is_active', true)
        .limit(200);
      if (error) throw error;
      const pts = (data || []).map((c:any)=> ({ id:c.id, name:c.name, address:c.address ?? null, lat: Number(c.latitude), lon: Number(c.longitude) }))
        .filter(p => isFinite(p.lat) && isFinite(p.lon));
      setAllPoints(pts);
      setAllMapOpen(true);
    } catch (e:any) {
      await Swal.fire({ icon:'error', title:'Unable to load map', text: e?.message || 'Please try again.' });
    }
  };

  // Realtime refresh for clinics
  useEffect(() => {
    const ch = supabase
      .channel("owner-clinics-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "clinics" }, () => {
        (async () => {
          try {
            let q = supabase.from("clinics").select("id,name,address,phone").order("name", { ascending: true });
            if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
            const { data } = await q;
            setItems((data || []) as any);
            await Swal.fire({ icon: 'info', title: 'Refreshed', confirmButtonColor: '#2563eb' });
          } catch {}
        })();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [query]);

  return (
    <div className="min-h-screen bg-neutral-50 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="rounded-2xl sm:rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-3 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-emerald-600 text-white flex-shrink-0 grid place-items-center">
            <BuildingOffice2Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-semibold text-neutral-900">Clinics</div>
            <div className="text-xs sm:text-sm text-neutral-500 truncate">Find a clinic and book a visit</div>
          </div>
        </div>
        
        {/* Filters - Mobile First Design */}
        <div className="flex flex-col gap-2 sm:gap-3">
          {/* Search bar - Full width on mobile */}
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200">
            <MagnifyingGlassIcon className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            <input ref={searchRef} defaultValue={query} onChange={(e)=> onSearchChange(e.target.value)} placeholder="Search clinics" className="w-full outline-none text-sm bg-transparent" />
          </div>
          
          {/* Filter row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 text-xs sm:text-sm flex-1 sm:flex-none">
              <span className="text-neutral-500 font-medium">City</span>
              <select value={city} onChange={(e)=> setCity(e.target.value)} className="outline-none bg-transparent font-medium min-w-0">
                <option value="all">All</option>
                {allCities.map(c => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 cursor-pointer text-xs sm:text-sm flex-1 sm:flex-none">
              <input type="checkbox" checked={onlyAvailable} onChange={(e)=> setOnlyAvailable(e.target.checked)} className="rounded" />
              <span className="font-medium">Only available</span>
            </label>
            <button onClick={onOpenAllMap} className="px-3 py-2 rounded-lg sm:rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs sm:text-sm font-medium flex-1 sm:flex-none text-center">
              <span className="hidden sm:inline">View all clinics</span>
              <span className="sm:hidden">View Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg sm:rounded-2xl border border-neutral-200 bg-white shadow-sm h-32 sm:h-40 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-lg sm:rounded-2xl border border-dashed border-neutral-300 bg-white shadow-sm p-6 sm:p-10 text-center">
            <div className="mx-auto mb-2 sm:mb-3 h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center">
              <BuildingOffice2Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <p className="text-neutral-700 font-medium mb-1 text-sm sm:text-base">No clinics found</p>
            <p className="text-neutral-500 text-xs sm:text-sm">Try a different search.</p>
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="group rounded-lg sm:rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5">
              <div className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center ring-1 ring-emerald-100">
                      <BuildingOffice2Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/pet_owner/clinics/${c.id}`} className="block font-semibold text-neutral-900 tracking-tight text-sm sm:text-base line-clamp-2 hover:underline" title={c.name}>{c.name}</Link>
                      <div className="mt-1 flex items-start gap-1.5 text-xs sm:text-sm text-neutral-600">
                        <MapPinIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 shrink-0" />
                        <span className="line-clamp-2 break-words" title={c.address || 'No address'}>{c.address || "No address"}</span>
                      </div>
                      {c.phone && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs sm:text-sm text-neutral-600">
                          <PhoneIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                          <span className="truncate" title={c.phone}>{c.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {availableSet.has(c.id) ? (
                      <div className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-50 ring-1 ring-emerald-200" title="Available" aria-label="Available">
                        <span className="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500" />
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-neutral-100 ring-1 ring-neutral-200" title="Not available" aria-label="Not available">
                        <span className="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-neutral-400" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <button onClick={() => { setPresetClinic(c.id); setModalOpen(true); }} className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center justify-center gap-1.5 sm:gap-2 font-medium">
                    <PlusIcon className="w-4 h-4" /> Book
                  </button>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-none justify-end">
                    <button onClick={() => { setDetailsId(c.id); setDetailsOpen(true); }} className="flex-1 sm:flex-none p-1.5 sm:p-2 rounded-lg bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-emerald-700 flex items-center justify-center" title="View location">
                      <MapPinIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="flex-1 sm:flex-none p-1.5 sm:p-2 rounded-lg bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-blue-700 flex items-center justify-center" title="Call clinic">
                        <PhoneIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              {(clinicReviews[c.id]?.length ?? 0) > 0 && (
                <div className="border-t border-neutral-100">
                  <button
                    onClick={() => setExpandedClinic(expandedClinic === c.id ? null : c.id)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between hover:bg-neutral-50 transition text-xs sm:text-sm font-medium text-neutral-700"
                  >
                    <div className="flex items-center gap-2">
                      <StarIcon className="w-4 h-4 text-amber-500" />
                      <span>{clinicReviews[c.id]!.length} review{clinicReviews[c.id]!.length !== 1 ? 's' : ''}</span>
                    </div>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${expandedClinic === c.id ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedClinic === c.id && (
                    <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-3 bg-neutral-50">
                      {clinicReviews[c.id]!.slice(0, 3).map((review) => (
                        <div key={review.id} className="rounded-lg bg-white p-2.5 sm:p-3 border border-neutral-200 text-xs sm:text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <StarIcon
                                  key={i}
                                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}`}
                                />
                              ))}
                            </div>
                            <span className="text-neutral-500 text-[10px] sm:text-xs">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {review.title && <p className="font-medium text-neutral-900 mb-1">{review.title}</p>}
                          {review.comment && <p className="text-neutral-600 line-clamp-2">{review.comment}</p>}
                        </div>
                      ))}
                      {clinicReviews[c.id]!.length > 3 && (
                        <p className="text-center text-neutral-500 text-xs py-1">+{clinicReviews[c.id]!.length - 3} more review{clinicReviews[c.id]!.length - 3 !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <CreateAppointmentModal
        open={modalOpen}
        ownerId={ownerId}
        presetClinicId={presetClinic}
        onClose={() => { setModalOpen(false); setPresetClinic(null); }}
        onCreated={() => Swal.fire({ icon:'success', title:'Appointment requested' })}
      />

      <ClinicDetailsModal
        open={detailsOpen}
        clinicId={detailsId}
        onClose={() => { setDetailsOpen(false); setDetailsId(null); }}
      />

      <AllClinicsMapModal
        open={allMapOpen}
        onClose={() => setAllMapOpen(false)}
        points={allPoints}
      />
      </div>
    </div>
  );
}
