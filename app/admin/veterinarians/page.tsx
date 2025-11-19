"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { MagnifyingGlassIcon, AcademicCapIcon, ChevronLeftIcon, ChevronRightIcon, EnvelopeIcon, IdentificationIcon, CheckCircleIcon, XCircleIcon, EyeIcon, BellIcon } from "@heroicons/react/24/outline";

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

export default function AdminVetsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<VetApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [reviewerId, setReviewerId] = useState<string | null>(null);
  const [approvalNotifications, setApprovalNotifications] = useState<any[]>([]);

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

  useEffect(() => {
    const fetchApprovalNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("id,title,message,notification_type,user_id")
          .eq("title", "Veterinarian Approval Request")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setApprovalNotifications((data || []) as any[]);
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Failed to load approval notifications", text: err?.message || "Please try again." });
      }
    };
    fetchApprovalNotifications();
  }, []);

  const filtered = useMemo(() => rows, [rows]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const approve = async (app: VetApplication) => {
    const { value: notes, isConfirmed } = await Swal.fire({
      title: "Approve application",
      html: `<div style='text-align:left'>
        <div style='font-size:13px;color:#64748b;margin-bottom:8px;'>You are approving the following applicant:</div>
        <div style='display:flex;align-items:center;gap:10px;margin-bottom:12px'>
          <div style='width:40px;height:40px;border-radius:12px;background:#ecfdf5;color:#047857;display:grid;place-items:center;font-weight:700;'>${(app.full_name||'?').charAt(0)}</div>
          <div>
            <div style='font-weight:600;color:#0B63C7;'>${app.full_name}</div>
            <div style='font-size:12px;color:#64748b;'>${app.email}</div>
          </div>
        </div>
        <label style='display:block;font-size:12px;color:#334155;margin-bottom:6px;'>Notes (optional)</label>
        <textarea id='approve_notes' placeholder='Enter approval notes...' style='width:100%;min-height:88px;border:1px solid #e5e7eb;border-radius:10px;padding:8px;font-size:13px;outline:none'></textarea>
      </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Approve",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#94a3b8",
      width: 600,
      showCloseButton: true,
      preConfirm: () => (document.getElementById('approve_notes') as HTMLTextAreaElement)?.value || "",
      customClass: { popup: "rounded-2xl", confirmButton: "rounded-lg", cancelButton: "rounded-lg" },
    });
    if (!isConfirmed) return;
    try {
      const updates: any = { status: "approved", reviewed_at: new Date().toISOString(), review_notes: notes || null };
      if (reviewerId) updates.reviewed_by = reviewerId;
      const { error } = await supabase.from("veterinarian_applications").update(updates).eq("id", app.id);
      if (error) throw error;
      await supabase.from("profiles").update({ verification_status: "approved", user_role: "veterinarian" }).eq("email", app.email);
      // Ensure a veterinarians row exists for scheduling/visibility
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('email', app.email).maybeSingle();
        const uid = (prof as any)?.id as string | undefined;
        if (uid) {
          const { data: existingVet } = await supabase.from('veterinarians').select('id').eq('user_id', uid).maybeSingle();
          if (!existingVet) {
            await supabase.from('veterinarians').insert({ user_id: uid, full_name: app.full_name || 'Veterinarian' });
          }
        }
      } catch {}
      setRows(rs => rs.map(r => r.id === app.id ? { ...r, status: "approved", reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), review_notes: notes || null } : r));
      try { await supabase.from('notifications').insert({ title: 'Vet application approved', message: `${app.full_name} approved`, notification_type: 'admin', user_id: reviewerId }); } catch {}
      await Swal.fire({ icon: "success", title: "Application approved" });
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Approval failed", text: err?.message || "Please try again." });
    }
  };

  const reject = async (app: VetApplication) => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "Reject application",
      html: `<div style='text-align:left'>
        <div style='font-size:13px;color:#64748b;margin-bottom:8px;'>Provide a reason for rejection:</div>
        <textarea id='reject_reason' placeholder='Enter reason...' style='width:100%;min-height:88px;border:1px solid #fee2e2;border-radius:10px;padding:8px;font-size:13px;outline:none'></textarea>
      </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Reject",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      width: 600,
      showCloseButton: true,
      preConfirm: () => {
        const v = (document.getElementById('reject_reason') as HTMLTextAreaElement)?.value?.trim();
        if (!v) {
          Swal.showValidationMessage('Reason is required');
        }
        return v;
      },
      customClass: { popup: "rounded-2xl", confirmButton: "rounded-lg", cancelButton: "rounded-lg" },
    });
    if (!isConfirmed) return;
    try {
      const updates: any = { status: "rejected", reviewed_at: new Date().toISOString(), rejection_reason: reason };
      if (reviewerId) updates.reviewed_by = reviewerId;
      const { error } = await supabase.from("veterinarian_applications").update(updates).eq("id", app.id);
      if (error) throw error;
      await supabase.from("profiles").update({ verification_status: "rejected" }).eq("email", app.email);
      setRows(rs => rs.map(r => r.id === app.id ? { ...r, status: "rejected", reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), rejection_reason: reason } : r));
      try { await supabase.from('notifications').insert({ title: 'Vet application rejected', message: `${app.full_name} rejected`, notification_type: 'admin', user_id: reviewerId }); } catch {}
      await Swal.fire({ icon: "success", title: "Application rejected" });
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Rejection failed", text: err?.message || "Please try again." });
    }
  };

  const viewDocs = async (app: VetApplication) => {
    const parseBucketAndPath = (u: string | null): { bucket: string; path: string } | null => {
      if (!u) return null;
      try {
        // Case 1: full public URL https://.../object/public/<bucket>/<path>
        const pubMarker = "/object/public/";
        const pubIdx = u.indexOf(pubMarker);
        if (pubIdx !== -1) {
          const after = u.substring(pubIdx + pubMarker.length); // <bucket>/<path>
          const slash = after.indexOf("/");
          if (slash !== -1) return { bucket: after.substring(0, slash), path: after.substring(slash + 1) };
        }
        // Case 2: already a signed URL for a bucket (treat as ready to use)
        if (/[/]object[/]sign\//.test(u) && /token=/.test(u)) {
          return { bucket: "", path: u }; // signal: don't re-sign
        }
        // Case 3: looks like '<bucket>/<path>'
        if (/^[^/]+\//.test(u)) {
          const slash = u.indexOf("/");
          return { bucket: u.substring(0, slash), path: u.substring(slash + 1) };
        }
        // Case 4: raw path only -> default to current bucket
        return { bucket: "veterinarian-documents", path: u };
      } catch {
        return { bucket: "veterinarian-documents", path: u } as any;
      }
    };
    const sign = async (u: string | null) => {
      if (!u) return null;
      const parsed = parseBucketAndPath(u);
      if (!parsed) return null;
      // If it's already a signed URL, return as-is
      if (!parsed.bucket) return parsed.path as any;
      const { bucket, path } = parsed;
      try {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
        if (error) return u; // fallback to original
        return data.signedUrl;
      } catch {
        return u;
      }
    };
    const [proSigned, bizSigned, govSigned] = await Promise.all([
      sign(app.professional_license_url),
      sign(app.business_permit_url),
      sign(app.government_id_url),
    ]);

    const card = (label: string, url: string | null, bg: string) => {
      const isPdf = !!url && /\.pdf(\?|$)/i.test(url);
      const preview = url
        ? isPdf
          ? `<embed src='${url}#toolbar=0' type='application/pdf' style='height:200px;width:100%;border:1px dashed #e5e7eb;border-radius:8px;margin-bottom:8px' />`
          : `<img src='${url}' alt='${label}' style='max-height:200px;width:100%;object-fit:contain;border-radius:8px;border:1px dashed #e5e7eb;margin-bottom:8px'/>`
        : `<div style='height:200px;border:1px dashed #e5e7eb;border-radius:8px;display:grid;place-items:center;color:#9ca3af'>No preview</div>`;
      const badge = isPdf ? "PDF" : url ? "Image" : "";
      return `
        <div style='border:1px solid #e5e7eb;border-radius:12px;overflow:hidden'>
          <div style='padding:8px 10px;font-size:12px;color:#64748b;background:${bg};display:flex;align-items:center;justify-content:space-between;'>
            <span>${label}</span>
            ${badge?`<span style='background:#e5e7eb;color:#334155;font-size:10px;padding:2px 6px;border-radius:999px;'>${badge}</span>`:""}
          </div>
          <div style='padding:10px'>
            ${preview}
            <a ${url?`href='${url}' target='_blank' rel='noreferrer'`:''} style='display:inline-block;padding:8px 10px;border-radius:10px;background:#0B63C7;color:#fff;font-size:12px;text-decoration:none;${url?'':'pointer-events:none;opacity:.5'}'>Open</a>
          </div>
        </div>`;
    };
    const html = `
      <div style='text-align:left'>
        <div style='display:flex;align-items:center;gap:10px;margin-bottom:12px'>
          <div style='width:40px;height:40px;border-radius:12px;background:#eff6ff;color:#1d4ed8;display:grid;place-items:center;font-weight:700;'>${(app.full_name||'?').charAt(0)}</div>
          <div>
            <div style='font-weight:600;color:#0B63C7;'>${app.full_name}</div>
            <div style='font-size:12px;color:#64748b;'>${app.email}${app.phone?` • ${app.phone}`:''}</div>
            <div style='font-size:12px;color:#94a3b8;'>${app.specialization || 'General Practice'} • License # ${app.license_number}</div>
          </div>
        </div>
        <div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;'>
          ${card('Professional License', proSigned, '#f0fdf4')}
          ${card('Business Permit', bizSigned, '#eff6ff')}
          ${card('Government ID', govSigned, '#fff7ed')}
        </div>
      </div>`;
    await Swal.fire({ title: "Application Details", html, confirmButtonText: "Close", width: 720, showCloseButton: true, customClass: { popup: "rounded-2xl", confirmButton: "rounded-lg" } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>Veterinarian Applications</h1>
          <p className="text-sm text-gray-500">Review, approve, or reject vet registrations</p>
        </div>
        {/* Search bar removed */}
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2">
        <div className="inline-flex rounded-full bg-white ring-1 ring-black/5 overflow-hidden">
          {( ["all","pending","approved","rejected"] as const).map(s => (
            <button key={s} onClick={()=>{ setStatus(s); setPage(1); }} className={`px-3 py-1.5 text-sm ${status===s?"bg-blue-600 text-white":"text-gray-700 hover:bg-blue-50"}`}>{s.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        {/* Mobile list */}
        <div className="sm:hidden divide-y">
          {(loading ? Array.from({length: Math.min(8, pageSize)}).map((_,i)=>({id:i,full_name:"",email:"",specialization:"",license_number:"",status:"pending",phone:""})) : pageRows).map((a:any)=> (
            <div key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate" style={{ color: PRIMARY }}>{a.full_name || "Loading"}</div>
                  <div className="text-xs text-gray-500 truncate" title={a.email}>{a.email || "-"}</div>
                  <div className="text-xs text-gray-500 truncate">{a.specialization || "General Practice"}</div>
                  <div className="text-xs text-gray-500 truncate">Lic #{a.license_number || "-"}</div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[11px] font-medium whitespace-nowrap ${a.status==="approved"?"bg-green-100 text-green-700":a.status==="rejected"?"bg-rose-100 text-rose-700":"bg-amber-100 text-amber-700"}`}>{a.status}</span>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button onClick={()=>viewDocs(a)} className="px-2 py-1 rounded-lg bg-gray-50 text-xs hover:bg-blue-50" style={{ color: PRIMARY }}>Docs</button>
                {a.status !== "approved" && (
                  <button onClick={()=>approve(a)} className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs">Approve</button>
                )}
                {a.status !== "rejected" && (
                  <button onClick={()=>reject(a)} className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs">Reject</button>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Desktop/tablet table */}
        <div className="hidden sm:block">
          <div className="grid gap-2 px-4 py-3 text-xs font-medium text-gray-600 bg-gray-50/80 sticky top-0 z-10 backdrop-blur"
               style={{ gridTemplateColumns: "2fr 2fr 2fr 1.5fr 1fr 1.5fr" }}>
            <div>Name</div>
            <div>Email</div>
            <div>Specialization</div>
            <div>License #</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>
          {(loading ? Array.from({length: Math.min(8, pageSize)}).map((_,i)=>({id:i,full_name:"",email:"",specialization:"",license_number:"",status:"pending",phone:""})) : pageRows).map((a:any) => (
            <div key={a.id} className="grid gap-2 px-4 py-3 items-center border-t text-sm hover:bg-blue-50/30 transition"
                 style={{ gridTemplateColumns: "2fr 2fr 2fr 1.5fr 1fr 1.5fr" }}>
              <div className="min-w-0">
                <div className="font-medium truncate" style={{ color: PRIMARY }}>{a.full_name || "Loading"}</div>
              </div>
              <div className="text-gray-600 truncate min-w-0" title={a.email}>{a.email || "-"}</div>
              <div className="text-gray-600 truncate min-w-0">{a.specialization || "General Practice"}</div>
              <div className="text-gray-600 truncate min-w-0">{a.license_number || "-"}</div>
              <div>
                <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${a.status==="approved"?"bg-green-100 text-green-700":a.status==="rejected"?"bg-rose-100 text-rose-700":"bg-amber-100 text-amber-700"}`}>{a.status}</span>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={()=>viewDocs(a)} className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-blue-50 text-xs inline-flex items-center gap-1" style={{ color: PRIMARY }}>
                  <EyeIcon className="w-4 h-4" /> Docs
                </button>
                {a.status !== "approved" && (
                  <button onClick={()=>approve(a)} className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs inline-flex items-center gap-1">
                    <CheckCircleIcon className="w-4 h-4" /> Approve
                  </button>
                )}
                {a.status !== "rejected" && (
                  <button onClick={()=>reject(a)} className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs inline-flex items-center gap-1">
                    <XCircleIcon className="w-4 h-4" /> Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
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
