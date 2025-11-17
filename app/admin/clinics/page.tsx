"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, XCircleIcon, PlusIcon } from "@heroicons/react/24/outline";

type Clinic = {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  operating_hours: any | null;
  is_active: boolean | null;
  created_at: string | null;
};

const PRIMARY = "#0B63C7";

export default function AdminClinicsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [sort, setSort] = useState<"name" | "created_at">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [rows, setRows] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{name:string; email:string; phone:string}>({ name: "", email: "", phone: "" });
  const [widths, setWidths] = useState<{select:number; clinic:number; contact:number; address:number; status:number}>({ select: 4, clinic: 30, contact: 24, address: 24, status: 18 });
  const [resizing, setResizing] = useState<{left:keyof typeof widths; right:keyof typeof widths; startX:number; leftStart:number; rightStart:number} | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    const fetchClinics = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("clinics")
          .select("id,name,address,phone,email,latitude,longitude,operating_hours,is_active,created_at");
        if (error) throw error;
        setRows((data || []) as Clinic[]);
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Failed to load clinics", text: err?.message || "Please try again." });
      } finally {
        setLoading(false);
      }
    };
    fetchClinics();
  }, []);

  useEffect(() => {
    (async () => {
      try { const { data } = await supabase.auth.getUser(); setAdminId(data.user?.id ?? null); } catch {}
    })();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = useMemo(() => {
    let list = rows.filter(r =>
      (status === "all" || (!!r.is_active ? "active" : "inactive") === status) &&
      (q.trim() === "" || r.name.toLowerCase().includes(q.toLowerCase()) || (r.address||"").toLowerCase().includes(q.toLowerCase()) || (r.email||"").toLowerCase().includes(q.toLowerCase()))
    );
    list.sort((a,b)=>{
      const dir = sortDir === "asc" ? 1 : -1;
      if (sort === "name") return ((a.name||"").localeCompare(b.name||"")) * dir;
      return ((b.created_at||"").localeCompare(a.created_at||"")) * (sortDir === "asc" ? -1 : 1);
    });
    return list;
  }, [rows, q, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const toggleSort = (field: "name" | "created_at") => {
    if (sort === field) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setSortDir("asc");
    }
  };

  const allIdsOnPage = useMemo(() => pageRows.map(r => r.id), [pageRows]);
  const allSelectedOnPage = allIdsOnPage.length>0 && allIdsOnPage.every(id => selected.has(id));
  const toggleSelect = (id: number) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleSelectAll = () => setSelected(prev => {
    const s = new Set(prev);
    if (allSelectedOnPage) { allIdsOnPage.forEach(id => s.delete(id)); } else { allIdsOnPage.forEach(id => s.add(id)); }
    return s;
  });

  const bulkSetActive = async (value: boolean) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const res = await Swal.fire({ icon: value?"question":"warning", title: value?`Activate ${ids.length} clinic(s)?`:`Deactivate ${ids.length} clinic(s)?`, showCancelButton: true, confirmButtonText: "Confirm" });
    if (!res.isConfirmed) return;
    const { error } = await supabase.from("clinics").update({ is_active: value }).in("id", ids);
    if (error) { await Swal.fire({ icon: "error", title: "Bulk update failed", text: error.message }); return; }
    setRows(rs => rs.map(r => selected.has(r.id) ? { ...r, is_active: value } : r));
    setSelected(new Set());
    try { await supabase.from('notifications').insert({ title: 'Clinics status updated', message: `${ids.length} clinic(s) ${value?'activated':'deactivated'}`, notification_type: 'admin', user_id: adminId }); } catch {}
    await Swal.fire({ icon: "success", title: "Status updated" });
  };

  const startEdit = (c: Clinic) => { setEditingId(c.id); setEditForm({ name: c.name || "", email: c.email || "", phone: c.phone || "" }); };
  const cancelEdit = () => { setEditingId(null); };
  const saveEdit = async (id: number) => {
    const payload: Partial<Clinic> = { name: editForm.name, email: editForm.email || null, phone: editForm.phone || null } as any;
    const { error } = await supabase.from("clinics").update(payload).eq("id", id);
    if (error) { await Swal.fire({ icon: "error", title: "Save failed", text: error.message }); return; }
    setRows(rs => rs.map(r => r.id === id ? { ...r, name: editForm.name, email: editForm.email || null, phone: editForm.phone || null } : r));
    setEditingId(null);
    try { await supabase.from('notifications').insert({ title: 'Clinic updated', message: `Clinic #${id} details updated`, notification_type: 'admin', user_id: adminId }); } catch {}
    await Swal.fire({ icon: "success", title: "Saved" });
  };

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - resizing.startX;
      const total = resizing.leftStart + resizing.rightStart;
      let left = Math.max(12, Math.min(total-8, resizing.leftStart + (dx/6))); // dampen dx
      let right = total - left;
      setWidths(w => ({ ...w, [resizing.left]: left, [resizing.right]: right }));
    };
    const onUp = () => setResizing(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, { once: true });
    return () => { window.removeEventListener("mousemove", onMove); };
  }, [resizing]);

  const startResize = (left: keyof typeof widths, right: keyof typeof widths) => (e: React.MouseEvent) => {
    e.preventDefault();
    setResizing({ left, right, startX: (e as any).clientX, leftStart: widths[left], rightStart: widths[right] });
  };

  

  const toggleActive = async (c: Clinic) => {
    const next = !c.is_active;
    const res = await Swal.fire({ icon: next?"question":"warning", title: next?"Activate clinic?":"Deactivate clinic?", showCancelButton: true, confirmButtonText: "Confirm" });
    if (!res.isConfirmed) return;
    const { error } = await supabase.from("clinics").update({ is_active: next }).eq("id", c.id);
    if (error) { await Swal.fire({ icon: "error", title: "Update failed", text: error.message }); return; }
    setRows(rs => rs.map(r => r.id===c.id ? { ...r, is_active: next } : r));
    try { await supabase.from('notifications').insert({ title: 'Clinic status updated', message: `${c.name || 'Clinic'} is now ${next?'Active':'Inactive'}`, notification_type: 'admin', user_id: adminId }); } catch {}
    await Swal.fire({ icon: "success", title: "Status updated" });
  };

  const viewDetails = async (c: Clinic) => {
    const osmHref = c.latitude && c.longitude
      ? `https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=17/${c.latitude}/${c.longitude}`
      : c.address
      ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(c.address)}`
      : "";

    const html = `
      <div class='text-left font-[Poppins]'>
        <div class='text-base font-semibold mb-2' style='color:${PRIMARY}'>${c.name || "Clinic"}</div>
        <div class='grid grid-cols-1 gap-2 text-sm'>
          <div class='flex items-center justify-between gap-3'>
            <div><b>Email</b>: <span id='detail_email'>${c.email || "-"}</span></div>
            <button id='copy_email' class='px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200'>Copy</button>
          </div>
          <div class='flex items-center justify-between gap-3'>
            <div><b>Phone</b>: <span id='detail_phone'>${c.phone || "-"}</span></div>
            <button id='copy_phone' class='px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200'>Copy</button>
          </div>
          <div class='flex items-start justify-between gap-3'>
            <div class='min-w-0'><b>Address</b>: <span id='detail_address' class='break-words'>${c.address || "-"}</span></div>
            ${osmHref ? `<a href='${osmHref}' target='_blank' rel='noopener' class='px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700'>Open in OSM</a>` : ""}
          </div>
          ${c.latitude && c.longitude ? (()=>{
            const lat = c.latitude as number; const lon = c.longitude as number;
            const delta = 0.01;
            const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
            const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;
            return `<div class='mt-2'><div class='h-56 rounded-lg overflow-hidden ring-1 ring-black/5'><iframe src='${src}' class='w-full h-full border-0' loading='lazy' referrerpolicy='no-referrer-when-downgrade'></iframe></div></div>`;
          })() : ""}
          <div><b>Status</b>: ${c.is_active ? "<span class='px-2 py-1 text-xs rounded-full bg-green-100 text-green-700'>Active</span>" : "<span class='px-2 py-1 text-xs rounded-full bg-rose-100 text-rose-700'>Inactive</span>"}</div>
        </div>
        <hr class='my-3'/>
        <div>
          <div class='font-medium mb-1'>Operating hours</div>
          ${(() => {
            try {
              const oh = c.operating_hours || {};
              const norm = (v:any) => (typeof v === 'string' ? v : v==null ? '' : JSON.stringify(v));
              const dayKeys = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday','mon','tue','wed','thu','fri','sat','sun'];
              let workingDays = '';
              let time = '';
              // If compact fields exist
              if (oh.working_days) workingDays = norm(oh.working_days);
              if (!workingDays && oh.days) workingDays = norm(oh.days);
              if (oh.time) time = norm(oh.time);
              if (!time && oh.hours) time = norm(oh.hours);
              if (!time && oh.open && oh.close) time = `${oh.open} - ${oh.close}`;
              // Derive from weekly map if provided
              if (!workingDays || !time) {
                const entries = Object.entries(oh || {}).filter(([k]) => dayKeys.includes(String(k).toLowerCase()));
                if (entries.length) {
                  const dayLabel = (k:string)=>({mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat',sun:'Sun'} as Record<string,string>)[k.slice(0,3)] || (k.charAt(0).toUpperCase()+k.slice(1,3));
                  const openDays: string[] = [];
                  const times: string[] = [];
                  for (const [k,v] of entries as [string, any][]) {
                    const lower = String(k).toLowerCase();
                    const label = dayLabel(lower);
                    const val:any = v as any;
                    const closed = val?.closed === true || /closed/i.test(String(val));
                    if (!closed) {
                      openDays.push(label);
                      const t = typeof val === 'string' ? val : (val?.time || (val?.open && val?.close ? `${val.open}-${val.close}` : ''));
                      if (t) times.push(String(t));
                    }
                  }
                  if (!workingDays && openDays.length) workingDays = openDays.join(', ');
                  if (!time) {
                    const uniq = Array.from(new Set(times.map(s=>s.trim())));
                    time = uniq.length === 1 ? uniq[0] : (uniq.length>1 ? 'Varies by day' : '');
                  }
                }
              }
              if (!workingDays && !time) {
                return `<div class='text-sm text-gray-500'>Not provided</div>`;
              }
              return `
                <div class='grid sm:grid-cols-2 gap-2 text-sm'>
                  <div><b>Working days</b>: ${workingDays || '-'}</div>
                  <div><b>Time</b>: ${time || '-'}</div>
                </div>
              `;
            } catch {
              return `<div class='text-sm text-gray-500'>Not provided</div>`;
            }
          })()}
        </div>
      </div>`;

    await Swal.fire({
      title: "Clinic Details",
      html,
      confirmButtonText: "Close",
      width: 640,
      customClass: { popup: "font-[Poppins]" },
      didOpen: () => {
        const toast = Swal.mixin({ toast: true, position: "top", showConfirmButton: false, timer: 1200 });
        const copy = async (id: string) => {
          const el = document.getElementById(id);
          const val = el?.textContent?.trim();
          if (!val || val === "-") return;
          try { await navigator.clipboard.writeText(val); toast.fire({ icon: "success", title: "Copied" }); } catch {}
        };
        document.getElementById("copy_email")?.addEventListener("click", () => copy("detail_email"));
        document.getElementById("copy_phone")?.addEventListener("click", () => copy("detail_phone"));
      }
    });
  };

  const addClinic = async () => {
    const { value: form } = await Swal.fire<{name:string,address:string,email:string,phone:string}>({
      title: "Add Clinic",
      html: `
        <div class='text-left grid gap-2 font-[Poppins]'>
          <label class='text-xs text-gray-500'>Name</label>
          <input id='c_name' class='swal2-input' placeholder='Name' required />
          <label class='text-xs text-gray-500 mt-1'>Email</label>
          <input id='c_email' class='swal2-input' placeholder='Email (optional)' inputmode='email' />
          <label class='text-xs text-gray-500 mt-1'>Phone</label>
          <input id='c_phone' class='swal2-input' placeholder='Phone (optional)' inputmode='tel' />
          <label class='text-xs text-gray-500 mt-1'>Address</label>
          <input id='c_address' class='swal2-input' placeholder='Address' />
        </div>
      `,
      focusConfirm: false,
      customClass: { popup: "font-[Poppins]" },
      preConfirm: () => {
        const name = (document.getElementById('c_name') as HTMLInputElement)?.value?.trim();
        const email = (document.getElementById('c_email') as HTMLInputElement)?.value?.trim();
        const phone = (document.getElementById('c_phone') as HTMLInputElement)?.value?.trim();
        const address = (document.getElementById('c_address') as HTMLInputElement)?.value?.trim();
        const emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const phoneOk = !phone || /[0-9()+\-\s]{6,}/.test(phone);
        if (!name) { Swal.showValidationMessage('Name is required'); return; }
        if (!emailOk) { Swal.showValidationMessage('Please enter a valid email'); return; }
        if (!phoneOk) { Swal.showValidationMessage('Please enter a valid phone'); return; }
        return { name, email, phone, address };
      }
    });
    if (!form || !form.name) return;
    const { data, error } = await supabase
      .from("clinics")
      .insert({ name: form.name, email: form.email || null, phone: form.phone || null, address: form.address || "" })
      .select("*")
      .single();
    if (error) { await Swal.fire({ icon: "error", title: "Create failed", text: error.message }); return; }
    setRows(rs => [data as Clinic, ...rs]);
    try { await supabase.from('notifications').insert({ title: 'Clinic created', message: `${form.name} has been added`, notification_type: 'admin', user_id: adminId }); } catch {}
    await Swal.fire({ icon: "success", title: "Clinic added" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>Clinic Management</h1>
          <p className="text-sm text-gray-500">Manage registered clinics and availability</p>
        </div>
        {/* New button removed */}
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2">
        {/* Search bar removed */}
        <div className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-black/5 px-3 py-2">
          <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-500" />
          <select value={status} onChange={e=>{ setStatus(e.target.value as any); setPage(1); }} className="text-sm bg-transparent outline-none">
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-black/5 px-3 py-2">
          <span className="text-xs text-gray-500">Sort</span>
          <select value={sort} onChange={e=>{ setSort(e.target.value as any); setPage(1); }} className="text-sm bg-transparent outline-none">
            <option value="name">Name</option>
            <option value="created_at">Newest</option>
          </select>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-blue-50 text-blue-800 ring-1 ring-blue-100">
          <div className="text-sm">{selected.size} selected</div>
          <div className="flex items-center gap-2">
            <button onClick={()=>bulkSetActive(true)} className="px-3 py-1.5 rounded-lg bg-white ring-1 ring-blue-200 hover:bg-blue-100 text-sm">Activate</button>
            <button onClick={()=>bulkSetActive(false)} className="px-3 py-1.5 rounded-lg bg-white ring-1 ring-blue-200 hover:bg-blue-100 text-sm">Deactivate</button>
            <button onClick={()=>setSelected(new Set())} className="px-3 py-1.5 rounded-lg bg-white ring-1 ring-blue-200 hover:bg-blue-100 text-sm">Clear</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        {/* Mobile list (sm:hidden) */}
        <div className="sm:hidden divide-y">
          {(loading ? Array.from({length:6}).map((_,i)=>({id:i,name:"",email:"",phone:"",address:"",is_active:true,created_at:null,latitude:null,longitude:null,operating_hours:null})) : pageRows).map((c:any)=> (
            <div key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate" style={{ color: PRIMARY }}>{c.name || "Loading"}</div>
                  <div className="text-xs text-gray-500 truncate">{c.email || "-"}{c.phone?` • ${c.phone}`:""}</div>
                  <div className="text-xs text-gray-500 truncate" title={c.address || "-"}>{c.address || "-"}</div>
                </div>
                <button onClick={()=>toggleActive(c as any)} className={`px-2 py-1 rounded-full text-[11px] font-medium ${c.is_active?"bg-green-100 text-green-700":"bg-rose-100 text-rose-700"}`}>{c.is_active?"Active":"Inactive"}</button>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button onClick={()=>startEdit(c as any)} className="px-2 py-1 rounded-lg bg-gray-50 text-xs hover:bg-blue-50">Edit</button>
                <button onClick={()=>viewDetails(c as any)} className="px-2 py-1 rounded-lg bg-gray-50 text-xs hover:bg-blue-50">Details</button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-white">
            <div className="text-xs text-gray-500">Showing {filtered.length === 0 ? 0 : pageStart + 1}–{pageEnd} of {filtered.length}</div>
            <div className="inline-flex items-center gap-2">
              <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 disabled:opacity-50 inline-flex items-center gap-1" style={{ color: PRIMARY }}>
                <ChevronLeftIcon className="w-4 h-4" /> Prev
              </button>
              <div className="text-xs text-gray-600">Page {page} / {totalPages}</div>
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 disabled:opacity-50 inline-flex items-center gap-1" style={{ color: PRIMARY }}>
                Next <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {/* Desktop/tablet resizable grid */}
        <div className="hidden sm:block max-h[70vh] overflow-auto" suppressHydrationWarning>
          <div className="grid gap-3 px-4 py-3 text-xs font-medium text-gray-600 bg-gray-50/80 sticky top-0 z-10 backdrop-blur select-none"
               style={{ gridTemplateColumns: `${widths.select}% minmax(0, ${widths.clinic}%) minmax(0, ${widths.contact}%) minmax(0, ${widths.address}%) minmax(180px, ${widths.status}%)` }}>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={allSelectedOnPage} onChange={toggleSelectAll} className="w-4 h-4" aria-label="Select all" />
            </div>
            <div className="relative flex items-center gap-2 cursor-pointer" onClick={()=>toggleSort("name")}>
              <span>Clinic</span>
              <span className="text-[10px]">{sort==="name" ? (sortDir==="asc"?"▲":"▼") : ""}</span>
              <span onMouseDown={startResize("clinic","contact")} className="absolute -right-1 top-0 h-full w-2 cursor-col-resize" />
            </div>
            <div className="relative flex items-center">Contact
              <span onMouseDown={startResize("contact","address")} className="absolute -right-1 top-0 h-full w-2 cursor-col-resize" />
            </div>
            <div className="relative flex items-center">Address
              <span onMouseDown={startResize("address","status")} className="absolute -right-1 top-0 h-full w-2 cursor-col-resize" />
            </div>
            <div className="text-right min-w-[180px] shrink-0">Status</div>
          </div>

          {!mounted ? null : !loading && pageRows.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-600">
              <div className="mx-auto max-w-sm">
                <div className="text-lg font-semibold" style={{ color: PRIMARY }}>No clinics found</div>
                <div className="mt-1">Try adjusting your filters or add a new clinic.</div>
                {/* New button removed */}
              </div>
            </div>
          ) : mounted ? (
            (loading ? Array.from({length:6}).map((_,i)=>({id:i,name:"",email:"",phone:"",address:"",is_active:true,created_at:null,latitude:null,longitude:null,operating_hours:null})) : pageRows).map((c:any, i:number) => (
              <div
                key={c.id}
                className={`grid gap-3 px-4 py-3 items-center text-sm cursor-pointer outline-none transition overflow-hidden
                  ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}
                  hover:shadow-sm hover:-translate-y-[1px]`}
                onClick={()=>{ if(!loading) viewDetails(c as Clinic); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e)=>{
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); viewDetails(c as Clinic); }
                  if (e.key === 'ArrowDown') { (e.currentTarget.nextElementSibling as HTMLElement)?.focus(); }
                  if (e.key === 'ArrowUp') { (e.currentTarget.previousElementSibling as HTMLElement)?.focus(); }
                }}
                style={{ borderLeft: `4px solid ${c.is_active ? '#10B981' : '#F43F5E'}`, gridTemplateColumns: `${widths.select}% minmax(0, ${widths.clinic}%) minmax(0, ${widths.contact}%) minmax(0, ${widths.address}%) minmax(180px, ${widths.status}%)` }}
              >
                <div className="flex items-center justify-center">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={(e)=>{ e.stopPropagation(); toggleSelect(c.id); }} className="w-4 h-4" aria-label={`Select ${c.name}`} />
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl grid place-items-center text-white ${c.is_active?"bg-green-500":"bg-rose-500"}`}>
                    {(c.name||"?").trim().slice(0,1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    {editingId === c.id ? (
                      <input value={editForm.name} onChange={(e)=>setEditForm(f=>({...f, name:e.target.value}))} onClick={(e)=>e.stopPropagation()} className="font-medium truncate outline-none border rounded px-2 py-1 text-sm" style={{ color: PRIMARY }} />
                    ) : (
                      <div className="font-medium truncate" style={{ color: PRIMARY }}>{c.name || "Loading"}</div>
                    )}
                    {!loading && <div className="text-xs text-gray-400">ID: {c.id}</div>}
                  </div>
                </div>
                <div className="text-gray-600">
                  <div className="flex items-center gap-2"><EnvelopeIcon className="w-4 h-4 text-gray-400" />{editingId===c.id ? (
                    <input value={editForm.email} onChange={(e)=>setEditForm(f=>({...f, email:e.target.value}))} onClick={(e)=>e.stopPropagation()} className="truncate outline-none border rounded px-2 py-1 text-sm w-full" />
                  ) : (
                    <span className="truncate" title={c.email || "-"}>{c.email || "-"}</span>
                  )}</div>
                  <div className="flex items-center gap-2 mt-1"><PhoneIcon className="w-4 h-4 text-gray-400" />{editingId===c.id ? (
                    <input value={editForm.phone} onChange={(e)=>setEditForm(f=>({...f, phone:e.target.value}))} onClick={(e)=>e.stopPropagation()} className="truncate outline-none border rounded px-2 py-1 text-sm w-full" />
                  ) : (
                    <span className="truncate" title={c.phone || "-"}>{c.phone || "-"}</span>
                  )}</div>
                </div>
                <div className="text-gray-600 min-w-0 pr-2 overflow-hidden">
                  <div className="flex items-start gap-2 min-w-0"><MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5" /><span className="block truncate max-w-full" title={c.address || "-"}>{c.address || "-"}</span></div>
                </div>
                <div className="flex justify-end gap-2 whitespace-nowrap pl-2 min-w-[160px] shrink-0">
                  {!loading && (
                    <button onClick={(e)=>{ e.stopPropagation(); toggleActive(c as Clinic); }} className={`px-2 py-1 rounded-full text-[11px] font-medium inline-flex items-center gap-1 ${c.is_active?"bg-green-100 text-green-700":"bg-rose-100 text-rose-700"}`}>
                      {c.is_active ? <CheckCircleIcon className="w-4 h-4"/> : <XCircleIcon className="w-4 h-4"/>}
                      {c.is_active ? "Active" : "Inactive"}
                    </button>
                  )}
                  {editingId === c.id ? (
                    <>
                      <button onClick={(e)=>{ e.stopPropagation(); saveEdit(c.id); }} className="px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs">Save</button>
                      <button onClick={(e)=>{ e.stopPropagation(); cancelEdit(); }} className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-blue-50 text-xs">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={(e)=>{ e.stopPropagation(); startEdit(c as Clinic); }} className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-blue-50 text-xs">Edit</button>
                      <button onClick={(e)=>{ e.stopPropagation(); viewDetails(c as Clinic); }} className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-blue-50 text-xs">Details</button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-white">
          <div className="text-xs text-gray-500">Showing {filtered.length === 0 ? 0 : pageStart + 1}–{pageEnd} of {filtered.length}</div>
          <div className="inline-flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 disabled:opacity-50 inline-flex items-center gap-1" style={{ color: PRIMARY }}>
              <ChevronLeftIcon className="w-4 h-4" /> Prev
            </button>
            <div className="text-xs text-gray-600">Page {page} / {totalPages}</div>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 disabled:opacity-50 inline-flex items-center gap-1" style={{ color: PRIMARY }}>
              Next <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
 
