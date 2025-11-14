"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  AcademicCapIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  IdentificationIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

const PRIMARY = "#0B63C7";

type VetApplication = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  specialization: string | null;
  license_number: string;
  clinic_id: number | null;
  business_permit_url: string | null;
  professional_license_url: string | null;
  government_id_url: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  created_at: string | null;
};

export default function AdminVeterinariansPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<VetApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [reviewerId, setReviewerId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setReviewerId(data.user?.id ?? null);
    };
    init();
  }, []);

  useEffect(() => {
    const fetchApps = async () => {
      setLoading(true);
      try {
        let qy = supabase
          .from("veterinarian_applications")
          .select("id,email,full_name,phone,specialization,license_number,clinic_id,business_permit_url,professional_license_url,government_id_url,status,reviewed_by,reviewed_at,review_notes,rejection_reason,created_at")
          .order("created_at", { ascending: false });
        if (status !== "all") qy = qy.eq("status", status);
        if (q.trim()) qy = qy.ilike("full_name", `%${q.trim()}%`);
        const { data, error } = await qy;
        if (error) throw error;
        setRows((data || []) as VetApplication[]);
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Failed to load applications", text: err?.message || "Please try again." });
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, [status, q]);

  const filtered = useMemo(() => rows, [rows]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const approve = async (app: VetApplication) => {
    const { value: notes, isConfirmed } = await Swal.fire({
      title: "Approve application?",
      input: "textarea",
      inputLabel: "Notes (optional)",
      inputPlaceholder: "Enter approval notes...",
      showCancelButton: true,
      confirmButtonText: "Approve",
    });
    if (!isConfirmed) return;
    try {
      const updates: any = { status: "approved", reviewed_at: new Date().toISOString(), review_notes: notes || null };
      if (reviewerId) updates.reviewed_by = reviewerId;
      const { error } = await supabase.from("veterinarian_applications").update(updates).eq("id", app.id);
      if (error) throw error;
      await supabase.from("profiles").update({ verification_status: "approved" }).eq("email", app.email);
      setRows(rs => rs.map(r => r.id === app.id ? { ...r, status: "approved", reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), review_notes: notes || null } : r));
      await Swal.fire({ icon: "success", title: "Application approved" });
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Approval failed", text: err?.message || "Please try again." });
    }
  };

  const reject = async (app: VetApplication) => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "Reject application?",
      input: "textarea",
      inputLabel: "Rejection reason",
      inputPlaceholder: "Enter reason...",
      inputValidator: (v) => (!v ? "Reason is required" : undefined as any),
      showCancelButton: true,
      confirmButtonText: "Reject",
    });
    if (!isConfirmed) return;
    try {
      const updates: any = { status: "rejected", reviewed_at: new Date().toISOString(), rejection_reason: reason };
      if (reviewerId) updates.reviewed_by = reviewerId;
      const { error } = await supabase.from("veterinarian_applications").update(updates).eq("id", app.id);
      if (error) throw error;
      await supabase.from("profiles").update({ verification_status: "pending" }).eq("email", app.email);
      setRows(rs => rs.map(r => r.id === app.id ? { ...r, status: "rejected", reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), rejection_reason: reason } : r));
      await Swal.fire({ icon: "success", title: "Application rejected" });
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Rejection failed", text: err?.message || "Please try again." });
    }
  };

  const viewDocs = async (app: VetApplication) => {
    const html = `<div style='text-align:left'>
      <div><b>Name</b>: ${app.full_name}</div>
      <div><b>Email</b>: ${app.email}</div>
      <div><b>Phone</b>: ${app.phone || "-"}</div>
      <div><b>Specialization</b>: ${app.specialization || "-"}</div>
      <div><b>License #</b>: ${app.license_number}</div>
      <hr/>
      <div style='display:grid;gap:8px'>
        <a href="${app.professional_license_url || "#"}" target="_blank" rel="noreferrer">Professional License</a>
        <a href="${app.business_permit_url || "#"}" target="_blank" rel="noreferrer">Business Permit</a>
        <a href="${app.government_id_url || "#"}" target="_blank" rel="noreferrer">Government ID</a>
      </div>
    </div>`;
    await Swal.fire({ title: "Application Details", html, confirmButtonText: "Close", width: 600 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>Veterinarian Applications</h1>
          <p className="text-sm text-gray-500">Review, approve, or reject vet registrations</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-2 shadow-inner">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
          <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1); }} className="bg-transparent outline-none text-sm" placeholder="Search applicants" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-white ring-1 ring-black/5 overflow-hidden">
          {(["all","pending","approved","rejected"] as const).map(s => (
            <button key={s} onClick={()=>{ setStatus(s); setPage(1); }} className={`px-3 py-1.5 text-sm ${status===s?"bg-blue-600 text-white":"text-gray-700 hover:bg-blue-50"}`}>{s.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(loading ? Array.from({length:8}).map((_,i)=>({id:i,full_name:"",email:"",specialization:"",license_number:"",status:"pending",phone:""})) : pageRows).map((a:any, i:number) => (
          <div key={a.id} className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 hover:shadow-md transition" style={{ transitionDelay: `${i*30}ms` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center ring-1 ring-black/5">
                  <AcademicCapIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold" style={{ color: PRIMARY }}>{a.full_name || "Loading"}</div>
                  <div className="text-xs text-gray-500">{a.specialization || "General Practice"}</div>
                  <div className="text-xs text-gray-500 inline-flex items-center gap-1"><EnvelopeIcon className="w-4 h-4" />{a.email || ""}</div>
                </div>
              </div>
              {!loading && (
                <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${a.status==="approved"?"bg-green-100 text-green-700":a.status==="rejected"?"bg-rose-100 text-rose-700":"bg-amber-100 text-amber-700"}`}>{a.status}</span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <IdentificationIcon className="w-4 h-4" /> {a.license_number || "No license"}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={()=>viewDocs(a)} className="px-3 py-2 rounded-xl bg-gray-50 text-sm hover:bg-blue-50 active:scale-[.98] transition inline-flex items-center gap-2" style={{ color: PRIMARY }}>
                <EyeIcon className="w-4 h-4" /> Docs
              </button>
              {a.status !== "approved" && (
                <button onClick={()=>approve(a)} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm active:scale-[.98] transition inline-flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4" /> Approve
                </button>
              )}
              {a.status !== "rejected" && (
                <button onClick={()=>reject(a)} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm active:scale-[.98] transition inline-flex items-center gap-2">
                  <XCircleIcon className="w-4 h-4" /> Reject
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
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
  );
}
