"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { getCurrentVet } from "../../../lib/utils/currentVet";
import { Poppins } from "next/font/google";
import { CheckCircleIcon, XCircleIcon, EyeIcon, FunnelIcon } from "@heroicons/react/24/outline";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const PRIMARY = "#2563eb";

type Profile = { id: string; email: string; full_name: string | null; user_role: string };
type Vet = { id: number; user_id: string; full_name: string };

type Review = {
  id: number;
  pet_owner_id: number | null;
  appointment_id: number | null;
  veterinarian_id: number | null;
  clinic_id: number | null;
  rating: number;
  title: string | null;
  comment: string | null;
  service_rating: number | null;
  is_approved: boolean;
  created_at: string;
  owner_name?: string;
  clinic_name?: string;
};

const PAGE_SIZE = 10;

export default function VetReviewsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vet, setVet] = useState<Vet | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState<"all" | "approved">("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const init = async () => {
      try {
        const { profile, vet } = await getCurrentVet();
        setProfile(profile as any);
        if (!vet) {
          setVet(null);
          setReviews([]);
          setLoading(false);
          return;
        }
        setVet({ id: vet.id, user_id: vet.user_id, full_name: vet.full_name });
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Failed to load", text: err?.message || "Please try again." });
        window.location.href = "/login";
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!vet) return;
      setLoading(true);
      try {
        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        let q = supabase
          .from("reviews")
          .select(
            "id,pet_owner_id,appointment_id,veterinarian_id,clinic_id,rating,title,comment,service_rating,is_approved,created_at",
            { count: "exact" }
          )
          .eq("veterinarian_id", vet.id)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (filterStatus === "approved") {
          q = q.eq("is_approved", true);
        }

        const { data, error, count } = await q;
        if (error) throw error;

        const enrichedReviews = await Promise.all(
          (data || []).map(async (review: any) => {
            let ownerName = "Unknown Owner";
            let clinicName = "Unknown Clinic";

            if (review.pet_owner_id) {
              const { data: owner } = await supabase
                .from("pet_owner_profiles")
                .select("full_name")
                .eq("id", review.pet_owner_id)
                .maybeSingle();
              ownerName = (owner as any)?.full_name || "Unknown Owner";
            }

            if (review.clinic_id) {
              const { data: clinic } = await supabase
                .from("clinics")
                .select("name")
                .eq("id", review.clinic_id)
                .maybeSingle();
              clinicName = (clinic as any)?.name || "Unknown Clinic";
            }

            return {
              ...review,
              owner_name: ownerName,
              clinic_name: clinicName,
            };
          })
        );

        setReviews(enrichedReviews);
        setTotal(count || 0);
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Failed to fetch reviews", text: err?.message || "Please try again." });
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [vet, filterStatus, page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const stats = useMemo(() => {
    const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : "0";
    const approvedCount = reviews.filter((r) => r.is_approved).length;
    return { avgRating, approvedCount, totalCount: reviews.length };
  }, [reviews]);

  const toggleApproval = async (reviewId: number, currentStatus: boolean) => {
    const action = currentStatus ? "unapprove" : "approve";
    const res = await Swal.fire({
      icon: "question",
      title: `${currentStatus ? "Remove approval" : "Approve"} this review?`,
      showCancelButton: true,
      confirmButtonText: action.charAt(0).toUpperCase() + action.slice(1),
    });
    if (!res.isConfirmed) return;

    try {
      const { error } = await supabase
        .from("reviews")
        .update({ is_approved: !currentStatus })
        .eq("id", reviewId);
      if (error) throw error;
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, is_approved: !currentStatus } : r)));
      await Swal.fire({
        icon: "success",
        title: `Review ${currentStatus ? "unapproved" : "approved"}`,
      });
    } catch (err: any) {
      await Swal.fire({
        icon: "error",
        title: "Update failed",
        text: err?.message || "Please try again.",
      });
    }
  };

  const viewDetails = async (review: Review) => {
    const html = `<div style="text-align:left;display:grid;gap:12px">
      <div style="display:grid;gap:6px">
        <div style="font-size:12px;color:#6b7280">Owner</div>
        <div style="font-size:14px;font-weight:600;color:#1f2937">${review.owner_name || "Unknown"}</div>
      </div>
      <div style="display:grid;gap:6px">
        <div style="font-size:12px;color:#6b7280">Clinic</div>
        <div style="font-size:14px;font-weight:600;color:#1f2937">${review.clinic_name || "Unknown"}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="display:grid;gap:6px">
        <div style=\"font-size:12px;color:#6b7280\">Rating</div>
          <div style=\"font-size:14px;color:#111827;font-weight:600\">${review.rating} / 5</div>
        </div>
        <div style="display:grid;gap:6px">
        <div style=\"font-size:12px;color:#6b7280\">Service Rating</div>
          <div style=\"font-size:14px;color:#111827;font-weight:600\">${review.service_rating ? `${review.service_rating} / 5` : "N/A"}</div>
        </div>
      </div>
      <div style="display:grid;gap:6px">
        <div style="font-size:12px;color:#6b7280">Title</div>
        <div style="font-size:14px;color:#1f2937">${review.title || "(No title)"}</div>
      </div>
      <div style="display:grid;gap:6px">
        <div style="font-size:12px;color:#6b7280">Comment</div>
        <div style="padding:10px;border-radius:8px;background:#f3f4f6;font-size:13px;color:#374151;line-height:1.5">${review.comment || "(No comment)"}</div>
      </div>
      <div style="display:grid;gap:6px">
        ${review.is_approved ? `<div style=\"font-size:12px;color:#6b7280\">Status</div><div style=\"display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#059669\">Approved</div>` : ''}
          Approved
        </div>
      </div>
      <div style="display:grid;gap:6px">
        <div style="font-size:12px;color:#6b7280">Posted</div>
        <div style="font-size:13px;color:#6b7280">${new Date(review.created_at).toLocaleString()}</div>
      </div>
    </div>`;
    await Swal.fire({ title: "Review Details", html, showCloseButton: true, confirmButtonText: "Close", width: 500 });
  };

  if (!mounted) return null;

  return (
    <div className={`${poppins.className} space-y-6`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
            Patient Reviews
          </h1>
          <p className="text-sm text-gray-500">Manage and review patient feedback</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white/70 backdrop-blur shadow ring-1 ring-gray-100 p-6 text-center">
          <div className="text-4xl font-bold" style={{ color: PRIMARY }}>
            {stats.avgRating}
          </div>
          <div className="text-sm text-gray-600 mt-1">Average Rating</div>
          <div className="text-xs mt-2 text-gray-500">Average across reviews</div>
        </div>
        <div className="rounded-2xl bg-white/70 backdrop-blur shadow ring-1 ring-gray-100 p-6 text-center">
          <div className="text-4xl font-bold text-emerald-600">{stats.approvedCount}</div>
          <div className="text-sm text-gray-600 mt-1">Approved</div>
          <div className="text-2xl mt-2">✓</div>
        </div>
        <div className="rounded-2xl bg-white/70 backdrop-blur shadow ring-1 ring-gray-100 p-6 text-center">
          <div className="text-4xl font-bold text-blue-600">{total}</div>
          <div className="text-sm text-gray-600 mt-1">Total Reviews</div>
          <div className="text-xs mt-2 text-gray-500">Count based on current filter</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 ring-1 ring-gray-100">
          <FunnelIcon className="w-4 h-4 text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => {
              setPage(1);
              setFilterStatus(e.target.value as any);
            }}
            className="text-sm outline-none bg-transparent"
          >
            <option value="all">All Reviews</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl bg-white/70 backdrop-blur shadow ring-1 ring-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-sm">Loading reviews...</div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-sm text-gray-400 mb-2">No icon</div>
            <div className="text-sm text-gray-600">No reviews found</div>
            <p className="text-xs text-gray-400 mt-1">Patient reviews will appear here</p>
          </div>
        ) : (
          <div className="divide-y">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 sm:p-6 hover:bg-gray-50/50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold text-gray-900">{review.owner_name}</span>
                      <span className="text-xs bg-blue-50 text-blue-700 ring-1 ring-blue-200 px-2 py-0.5 rounded-full">
                        {review.clinic_name}
                      </span>
                      {review.is_approved && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Approved</span>
                      )}
                    </div>
                    {review.title && <div className="font-medium text-gray-900 mb-1">{review.title}</div>}
                    {review.comment && <div className="text-sm text-gray-700 mb-2 line-clamp-2">{review.comment}</div>}
                    <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                        <span className="flex items-center gap-1">
                          <span>Rating:</span>
                          <span className="font-semibold">{review.rating}/5</span>
                        </span>
                      {review.service_rating && (
                        <span className="flex items-center gap-1">
                          <span>Service:</span>
                          <span className="font-semibold">{review.service_rating}/5</span>
                        </span>
                      )}
                      <span>{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      title="View details"
                      onClick={() => viewDetails(review)}
                      className="p-2 rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-50 transition"
                    >
                      <EyeIcon className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      title={review.is_approved ? "Remove approval" : "Approve review"}
                      onClick={() => toggleApproval(review.id, review.is_approved)}
                      className={`p-2 rounded-lg transition ${
                        review.is_approved
                          ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 ring-1 ring-emerald-200"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100 ring-1 ring-gray-200"
                      }`}
                    >
                      {review.is_approved ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-500">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg border bg-white disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded-lg border bg-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
