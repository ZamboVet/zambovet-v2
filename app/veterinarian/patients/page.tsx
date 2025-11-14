"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { Poppins } from "next/font/google";
import Link from "next/link";
import { MagnifyingGlassIcon, ArrowPathIcon, UserGroupIcon, FunnelIcon, Bars3BottomLeftIcon, RectangleStackIcon } from "@heroicons/react/24/outline";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const PRIMARY = "#0B63C7";

 type Profile = { id: string; email: string; full_name: string | null; user_role: string; verification_status?: string };
 type Vet = { id: number; user_id: string; full_name: string };
 type Patient = { id: number; owner_id: number | null; name: string; species: string; breed: string | null; profile_picture_url: string | null };
 type Owner = { id: number; full_name: string; };

const PAGE_SIZE = 12;

export default function VetPatientsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vet, setVet] = useState<Vet | null>(null);
  const [items, setItems] = useState<Array<Patient & { owner?: Owner }>>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState<string>("all");
  const [breedFilter, setBreedFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("last_visit_desc");
  const [meta, setMeta] = useState<Record<number, { last_visit?: string | null }>>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  useEffect(() => {
    const init = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          await Swal.fire({ icon: "warning", title: "Sign in required", text: "Please sign in to continue." });
          window.location.href = "/login";
          return;
        }
        const { data: p, error: pErr } = await supabase.from("profiles").select("id,email,full_name,user_role,verification_status").eq("id", user.id).single();
        if (pErr) throw pErr;
        setProfile(p as Profile);
        if (p.user_role !== "veterinarian") {
          await Swal.fire({ icon: "error", title: "Access denied", text: "Veterinarian account required." });
          window.location.href = "/";
          return;
        }
        // If profile is not yet approved, block access
        if ((p as any)?.verification_status && (p as any).verification_status !== 'approved') {
          await Swal.fire({ icon: "info", title: "Application pending", text: "Your vet profile is not yet active." });
          setVet(null);
          setItems([]);
          setLoading(false);
          return;
        }
        const { data: v, error: vErr } = await supabase
          .from("veterinarians")
          .select("id,user_id,full_name")
          .eq("user_id", p.id)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (vErr && vErr.code !== "PGRST116") throw vErr;
        if (!v) {
          // Auto-create vet record when account is approved but record is missing
          const payload = { user_id: p.id, full_name: p.full_name || 'Veterinarian', is_available: true } as any;
          const { data: newVet, error: upErr } = await supabase
            .from('veterinarians')
            .upsert(payload, { onConflict: 'user_id' })
            .select('id,user_id,full_name')
            .single();
          if (upErr) {
            await Swal.fire({ icon: "error", title: "Profile setup failed", text: upErr.message || "Please try again." });
            setVet(null);
            setItems([]);
            setLoading(false);
            return;
          }
          setVet(newVet as unknown as Vet);
        } else {
          setVet(v as Vet);
        }
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Failed to load", text: err?.message || "Please try again." });
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchList = async () => {
      if (!vet) return;
      setLoading(true);
      try {
        // get unique patient IDs from this vet's appointments
        const { data: appts, error: aErr } = await supabase
          .from("appointments")
          .select("patient_id")
          .eq("veterinarian_id", vet.id)
          .not("patient_id", "is", null);
        if (aErr) throw aErr;
        const ids = Array.from(new Set((appts || []).map(a => a.patient_id))) as number[];
        if (ids.length === 0) {
          setItems([]);
          setTotal(0);
          setLoading(false);
          return;
        }
        // fetch patients by IDs with pagination and optional search by name
        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        let q = supabase
          .from("patients")
          .select("id,owner_id,name,species,breed,profile_picture_url", { count: "exact" })
          .in("id", ids)
          .order("id", { ascending: true })
          .range(from, to);
        if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
        if (speciesFilter !== "all") q = q.eq("species", speciesFilter);
        if (breedFilter !== "all") q = q.eq("breed", breedFilter);
        const { data: pats, error: pErr, count } = await q;
        if (pErr) throw pErr;
        const ownersIds = Array.from(new Set((pats || []).map(p => p.owner_id).filter(Boolean))) as number[];
        let ownersMap: Record<number, Owner> = {};
        if (ownersIds.length > 0) {
          const { data: owners, error: oErr } = await supabase
            .from("pet_owner_profiles")
            .select("id,full_name")
            .in("id", ownersIds);
          if (oErr) throw oErr;
          ownersMap = (owners || []).reduce((acc, o) => { acc[o.id] = o as Owner; return acc; }, {} as Record<number, Owner>);
        }
        const withOwners = (pats || []).map(p => ({ ...(p as Patient), owner: p.owner_id ? ownersMap[p.owner_id] : undefined }));
        // last visit per patient
        const idsPage = withOwners.map(p=>p.id);
        let lastVisitMap: Record<number, string> = {};
        if (idsPage.length > 0) {
          const { data: visits, error: vErr } = await supabase
            .from("appointments")
            .select("patient_id,appointment_date,appointment_time,status")
            .in("patient_id", idsPage)
            .order("appointment_date", { ascending: false })
            .order("appointment_time", { ascending: false })
            .limit(500);
          if (vErr) throw vErr;
          (visits || []).forEach((a:any) => {
            const pid = a.patient_id as number;
            if (!lastVisitMap[pid]) {
              lastVisitMap[pid] = `${a.appointment_date} ${a.appointment_time}`;
            }
          });
        }
        setMeta(prev => ({ ...prev, ...Object.fromEntries(Object.entries(lastVisitMap).map(([k,v])=>[Number(k), { last_visit: v }])) }));
        // sort by last visit desc if selected
        let list = withOwners.slice();
        if (sort === "last_visit_desc") {
          list.sort((a,b) => {
            const av = lastVisitMap[a.id] || "";
            const bv = lastVisitMap[b.id] || "";
            return (bv > av ? 1 : bv < av ? -1 : 0);
          });
        }
        setItems(list);
        setTotal(count || 0);
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Failed to fetch", text: err?.message || "Please try again." });
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [vet, page, query, speciesFilter, breedFilter, sort]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  return (
    <div className={`${poppins.className} space-y-6`}>
      <div className="rounded-3xl bg-white/80 backdrop-blur shadow ring-1 ring-black/5 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: PRIMARY }}>Patients</h1>
          <p className="text-sm text-gray-500">Access and manage your patient records</p>
        </div>
      <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 bg-white rounded-xl ring-1 ring-gray-200 p-1">
            <button onClick={() => setViewMode("grid")} className={`px-3 py-1.5 rounded-lg transition ${ viewMode === "grid" ? "bg-blue-600 text-white" : "hover:bg-gray-50" }`}>
              <RectangleStackIcon className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("table")} className={`px-3 py-1.5 rounded-lg transition ${ viewMode === "table" ? "bg-blue-600 text-white" : "hover:bg-gray-50" }`}>
              <Bars3BottomLeftIcon className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => { setPage(1); setQuery(""); setSpeciesFilter('all'); setBreedFilter('all'); }} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50 transition active:scale-[.98]">
            <ArrowPathIcon className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white ring-1 ring-gray-200 max-w-xl flex-1 shadow-sm">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-500" />
          <input value={query} onChange={(e) => { setPage(1); setQuery(e.target.value); }} placeholder="Search pet name" className="w-full outline-none text-sm bg-transparent" />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm">
          <FunnelIcon className="w-4 h-4 text-gray-500" />
          <select value={speciesFilter} onChange={(e)=>{ setPage(1); setSpeciesFilter(e.target.value); setBreedFilter("all"); }} className="text-sm bg-transparent outline-none">
            <option value="all">All species</option>
            <option value="Dog">Dog</option>
            <option value="Cat">Cat</option>
            <option value="Bird">Bird</option>
            <option value="Other">Other</option>
          </select>
          <span className="text-gray-200">|</span>
          <select value={breedFilter} onChange={(e)=>{ setPage(1); setBreedFilter(e.target.value); }} className="text-sm bg-transparent outline-none">
            <option value="all">Any breed</option>
            {/* In a full implementation, populate from species */}
            <option value="Labrador">Labrador</option>
            <option value="Persian">Persian</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm">
          <span className="text-xs text-gray-500">Sort</span>
          <select value={sort} onChange={(e)=>{ setPage(1); setSort(e.target.value); }} className="text-sm bg-transparent outline-none">
            <option value="last_visit_desc">Last visit (newest)</option>
          </select>
        </div>
      </div>

      {loading ? (
        viewMode === "grid" ? (
          <div className="grid sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100" />
                  <div className="space-y-2 w-full">
                    <div className="h-3 w-1/2 bg-gray-200 rounded" />
                    <div className="h-3 w-1/3 bg-gray-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 text-sm">Pet Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 text-sm">Species</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 text-sm">Breed</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 text-sm">Owner</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 text-sm">Last Visit</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-200 animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-28 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : items.length === 0 ? (
        <div className="p-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl grid place-items-center bg-blue-50 text-blue-700 mb-2">
            <UserGroupIcon className="w-6 h-6" />
          </div>
          <div className="text-sm text-gray-600">No patients found</div>
          <p className="text-xs text-gray-400">Search by name or check your upcoming appointments.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map(p => (
            <div key={p.id} className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 hover:shadow-md hover:-translate-y-0.5 transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 grid place-items-center font-semibold">
                  {p.name.slice(0,1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate" style={{ color: PRIMARY }}>{p.name}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-600">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">{p.species}</span>
                    {p.breed && (<span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">{p.breed}</span>)}
                  </div>
                  {p.owner && (<div className="mt-1 text-[11px] text-gray-400 truncate">Owner: {p.owner.full_name}</div>)}
                  {meta[p.id]?.last_visit && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 ring-1 ring-gray-200 text-[11px] text-gray-600 whitespace-nowrap">Last: {String(meta[p.id]?.last_visit)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async ()=>{
                      const { data: vis } = await supabase
                        .from("appointments")
                        .select("appointment_date,appointment_time,status")
                        .eq("patient_id", p.id)
                        .order("appointment_date", { ascending: false })
                        .order("appointment_time", { ascending: false })
                        .limit(5);
                      const visitsArr = (vis||[]);
                      const chip = (s:string) => {
                        const map: any = { confirmed:'#059669', pending:'#b45309', completed:'#2563eb', cancelled:'#6b7280' };
                        const bg = map[s] || '#6b7280';
                        return `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;color:white;background:${bg}">${s}</span>`;
                      };
                      const visits = visitsArr.length
                        ? visitsArr.map((v:any)=> `<li style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #f3f4f6"><span style="color:#374151">${v.appointment_date} • ${String(v.appointment_time).slice(0,5)}</span>${chip(String(v.status))}</li>`).join("")
                        : `<li style="color:#6b7280;padding:6px 0">No visits yet</li>`;
                      const owner = p.owner?.full_name || "Unknown";
                      const html = `
                        <div style="text-align:left;font-family:Poppins,ui-sans-serif">
                          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                            <div style="width:36px;height:36px;border-radius:9999px;background:#eff6ff;color:#2563eb;display:grid;place-items:center;font-weight:600">${p.name.slice(0,1)}</div>
                            <div style="min-width:0">
                              <div style="font-weight:600;color:#0B63C7">${p.name}</div>
                              <div style="font-size:12px;color:#6b7280">
                                <span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:9999px;margin-right:6px">${p.species}</span>
                                ${p.breed ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:9999px">${p.breed}</span>` : ''}
                              </div>
                            </div>
                          </div>
                          <div style="font-size:13px;color:#374151;margin:6px 0 10px"><b>Owner</b>: ${owner}</div>
                          <div style="font-size:12px;color:#6b7280;margin:6px 0">Recent visits</div>
                          <ul style="list-style:none;padding:0;margin:0">${visits}</ul>
                        </div>`;
                      const res = await Swal.fire({
                        title: undefined,
                        html,
                        showCancelButton: true,
                        showDenyButton: true,
                        confirmButtonText: 'Start consultation',
                        denyButtonText: 'View records',
                        cancelButtonText: 'Close',
                        confirmButtonColor: '#2563eb',
                      });
                      if (res.isConfirmed) {
                        window.location.href = `/veterinarian/appointments?patient=${p.id}`;
                        return;
                      }
                      if (res.isDenied) {
                        window.location.href = `/veterinarian/patients/daily?patient=${p.id}`;
                        return;
                      }
                    }}
                    className="px-3 py-1 rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-xs"
                  >
                    View details
                  </button>
                  <Link href={{ pathname: "/veterinarian/appointments", query: { patient: p.id } }} className="px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs">Start consultation</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 text-sm">Pet Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 text-sm">Species</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 text-sm">Breed</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 text-sm">Owner</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 text-sm">Last Visit</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: PRIMARY }}>{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.species}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.breed || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.owner?.full_name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{meta[p.id]?.last_visit ? String(meta[p.id]?.last_visit).slice(0, 16) : "—"}</td>
                  <td className="px-4 py-3 text-sm text-right space-x-2">
                    <button
                      onClick={async ()=>{
                        const { data: vis } = await supabase
                          .from("appointments")
                          .select("appointment_date,appointment_time,status")
                          .eq("patient_id", p.id)
                          .order("appointment_date", { ascending: false })
                          .order("appointment_time", { ascending: false })
                          .limit(5);
                        const visitsArr = (vis||[]);
                        const chip = (s:string) => {
                          const map: any = { confirmed:'#059669', pending:'#b45309', completed:'#2563eb', cancelled:'#6b7280' };
                          const bg = map[s] || '#6b7280';
                          return `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;color:white;background:${bg}">${s}</span>`;
                        };
                        const visits = visitsArr.length
                          ? visitsArr.map((v:any)=> `<li style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #f3f4f6"><span style="color:#374151">${v.appointment_date} • ${String(v.appointment_time).slice(0,5)}</span>${chip(String(v.status))}</li>`).join("")
                          : `<li style="color:#6b7280;padding:6px 0">No visits yet</li>`;
                        const owner = p.owner?.full_name || "Unknown";
                        const html = `
                          <div style="text-align:left;font-family:Poppins,ui-sans-serif">
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                              <div style="width:36px;height:36px;border-radius:9999px;background:#eff6ff;color:#2563eb;display:grid;place-items:center;font-weight:600">${p.name.slice(0,1)}</div>
                              <div style="min-width:0">
                                <div style="font-weight:600;color:#0B63C7">${p.name}</div>
                                <div style="font-size:12px;color:#6b7280">
                                  <span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:9999px;margin-right:6px">${p.species}</span>
                                  ${p.breed ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:9999px">${p.breed}</span>` : ''}
                                </div>
                              </div>
                            </div>
                            <div style="font-size:13px;color:#374151;margin:6px 0 10px"><b>Owner</b>: ${owner}</div>
                            <div style="font-size:12px;color:#6b7280;margin:6px 0">Recent visits</div>
                            <ul style="list-style:none;padding:0;margin:0">${visits}</ul>
                          </div>`;
                        const res = await Swal.fire({
                          title: undefined,
                          html,
                          showCancelButton: true,
                          showDenyButton: true,
                          confirmButtonText: 'Start consultation',
                          denyButtonText: 'View records',
                          cancelButtonText: 'Close',
                          confirmButtonColor: '#2563eb',
                        });
                        if (res.isConfirmed) {
                          window.location.href = `/veterinarian/appointments?patient=${p.id}`;
                          return;
                        }
                        if (res.isDenied) {
                          window.location.href = `/veterinarian/patients/daily?patient=${p.id}`;
                          return;
                        }
                      }}
                      className="px-3 py-1 rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-xs"
                    >
                      Details
                    </button>
                    <Link href={{ pathname: "/veterinarian/appointments", query: { patient: p.id } }} className="px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs inline-block">
                      Consult
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-500">Page {page} of {totalPages}</div>
        <div className="flex items-center gap-2">
          <button disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-1.5 rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50">Prev</button>
          <button disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))} className="px-3 py-1.5 rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
