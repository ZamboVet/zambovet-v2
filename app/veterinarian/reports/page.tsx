"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { getCurrentVet } from "../../../lib/utils/currentVet";
import Swal from "sweetalert2";
import {
  ChartBarIcon,
  CalendarDaysIcon,
  StarIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrendingUpIcon,
  DocumentChartBarIcon
} from "@heroicons/react/24/outline";
import { Poppins } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const PRIMARY = "#2563eb";

type Appointment = {
  id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason_for_visit: string | null;
  created_at: string;
};

type Review = {
  id: number;
  rating: number;
  service_rating: number | null;
  title: string | null;
  comment: string | null;
  created_at: string;
  is_approved: boolean;
};

type DateRange = "7d" | "30d" | "90d" | "all";

export default function VetReportsPage() {
  const [loading, setLoading] = useState(true);
  const [vetId, setVetId] = useState<number | null>(null);
  const [vetName, setVetName] = useState<string>("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { vet } = await getCurrentVet();
        if (!vet) {
          await Swal.fire({
            icon: "warning",
            title: "Access Denied",
            text: "Veterinarian profile required to view reports.",
          });
          window.location.href = "/veterinarian";
          return;
        }

        setVetId(vet.id);
        setVetName(vet.full_name);

        // Calculate date filter
        const now = new Date();
        let dateFilter: string | null = null;
        if (dateRange === "7d") {
          const d = new Date(now);
          d.setDate(d.getDate() - 7);
          dateFilter = d.toISOString().split("T")[0];
        } else if (dateRange === "30d") {
          const d = new Date(now);
          d.setDate(d.getDate() - 30);
          dateFilter = d.toISOString().split("T")[0];
        } else if (dateRange === "90d") {
          const d = new Date(now);
          d.setDate(d.getDate() - 90);
          dateFilter = d.toISOString().split("T")[0];
        }

        // Fetch appointments
        let apptsQuery = supabase
          .from("appointments")
          .select("id,appointment_date,appointment_time,status,reason_for_visit,created_at")
          .eq("veterinarian_id", vet.id)
          .order("appointment_date", { ascending: false });

        if (dateFilter) {
          apptsQuery = apptsQuery.gte("appointment_date", dateFilter);
        }

        const { data: apptsData, error: apptsError } = await apptsQuery;
        if (apptsError) throw apptsError;
        setAppointments((apptsData || []) as Appointment[]);

        // Fetch reviews
        let reviewsQuery = supabase
          .from("reviews")
          .select("id,rating,service_rating,title,comment,created_at,is_approved")
          .eq("veterinarian_id", vet.id)
          .order("created_at", { ascending: false });

        if (dateFilter) {
          reviewsQuery = reviewsQuery.gte("created_at", dateFilter);
        }

        const { data: reviewsData, error: reviewsError } = await reviewsQuery;
        if (reviewsError) throw reviewsError;
        setReviews((reviewsData || []) as Review[]);
      } catch (err: any) {
        await Swal.fire({
          icon: "error",
          title: "Failed to load reports",
          text: err?.message || "Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [dateRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter((a) => a.status === "completed").length;
    const cancelledAppointments = appointments.filter((a) => a.status === "cancelled").length;
    const pendingAppointments = appointments.filter((a) => a.status === "pending").length;
    const confirmedAppointments = appointments.filter((a) => a.status === "confirmed").length;

    const totalReviews = reviews.length;
    const approvedReviews = reviews.filter((r) => r.is_approved).length;
    const pendingReviews = reviews.filter((r) => !r.is_approved).length;

    const avgRating =
      approvedReviews > 0
        ? reviews.filter((r) => r.is_approved).reduce((sum, r) => sum + r.rating, 0) / approvedReviews
        : 0;

    const avgServiceRating =
      reviews.filter((r) => r.is_approved && r.service_rating).length > 0
        ? reviews
            .filter((r) => r.is_approved && r.service_rating)
            .reduce((sum, r) => sum + (r.service_rating || 0), 0) /
          reviews.filter((r) => r.is_approved && r.service_rating).length
        : 0;

    // Rating distribution
    const ratingDist = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: reviews.filter((r) => r.is_approved && r.rating === rating).length,
    }));

    // Status distribution
    const statusDist = [
      { status: "Completed", count: completedAppointments, color: "bg-emerald-500" },
      { status: "Confirmed", count: confirmedAppointments, color: "bg-blue-500" },
      { status: "Pending", count: pendingAppointments, color: "bg-amber-500" },
      { status: "Cancelled", count: cancelledAppointments, color: "bg-red-500" },
    ];

    const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

    return {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      pendingAppointments,
      confirmedAppointments,
      totalReviews,
      approvedReviews,
      pendingReviews,
      avgRating,
      avgServiceRating,
      ratingDist,
      statusDist,
      completionRate,
    };
  }, [appointments, reviews]);

  const dateRangeLabel = {
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
    all: "All Time",
  };

  return (
    <div className={`${poppins.className} min-h-screen bg-neutral-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
              <DocumentChartBarIcon className="w-4 h-4" />
              <span>Dashboard / Reports & Analytics</span>
            </div>
            <h1 className="text-3xl font-bold text-neutral-900">Performance Reports</h1>
            <p className="text-sm text-neutral-600 mt-1">
              Track your appointments, reviews, and performance metrics
            </p>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600 font-medium">Period:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-4 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white p-6 shadow-sm animate-pulse">
                <div className="h-4 bg-neutral-200 rounded w-1/2 mb-3" />
                <div className="h-8 bg-neutral-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Appointments */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 p-6 shadow-sm ring-1 ring-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-blue-600 text-white">
                    <CalendarDaysIcon className="w-6 h-6" />
                  </div>
                  <TrendingUpIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-neutral-900">{stats.totalAppointments}</div>
                <div className="text-sm text-neutral-600 mt-1">Total Appointments</div>
              </div>

              {/* Completed Appointments */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm ring-1 ring-emerald-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-emerald-600 text-white">
                    <CheckCircleIcon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                    {stats.completionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="text-3xl font-bold text-neutral-900">{stats.completedAppointments}</div>
                <div className="text-sm text-neutral-600 mt-1">Completed</div>
              </div>

              {/* Average Rating */}
              <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm ring-1 ring-amber-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-amber-600 text-white">
                    <StarIcon className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`w-3 h-3 ${
                          i < Math.round(stats.avgRating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-neutral-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-3xl font-bold text-neutral-900">{stats.avgRating.toFixed(1)}</div>
                <div className="text-sm text-neutral-600 mt-1">Average Rating</div>
              </div>

              {/* Total Reviews */}
              <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 p-6 shadow-sm ring-1 ring-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-purple-600 text-white">
                    <UserGroupIcon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-lg">
                    {stats.approvedReviews} approved
                  </span>
                </div>
                <div className="text-3xl font-bold text-neutral-900">{stats.totalReviews}</div>
                <div className="text-sm text-neutral-600 mt-1">Total Reviews</div>
              </div>
            </div>

            {/* Charts and Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointment Status Distribution */}
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <ChartBarIcon className="w-5 h-5 text-blue-600" />
                  Appointment Status
                </h3>
                <div className="space-y-4">
                  {stats.statusDist.map((item) => (
                    <div key={item.status}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-neutral-700">{item.status}</span>
                        <span className="text-sm font-semibold text-neutral-900">{item.count}</span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2.5">
                        <div
                          className={`${item.color} h-2.5 rounded-full transition-all`}
                          style={{
                            width: `${stats.totalAppointments > 0 ? (item.count / stats.totalAppointments) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <StarIcon className="w-5 h-5 text-amber-600" />
                  Rating Distribution
                </h3>
                <div className="space-y-4">
                  {stats.ratingDist.reverse().map((item) => (
                    <div key={item.rating}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-700">{item.rating}</span>
                          <StarIcon className="w-4 h-4 fill-amber-400 text-amber-400" />
                        </div>
                        <span className="text-sm font-semibold text-neutral-900">{item.count}</span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2.5">
                        <div
                          className="bg-amber-500 h-2.5 rounded-full transition-all"
                          style={{
                            width: `${stats.approvedReviews > 0 ? (item.count / stats.approvedReviews) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <ClockIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-sm font-medium text-neutral-600">Pending Appointments</div>
                </div>
                <div className="text-2xl font-bold text-neutral-900">{stats.pendingAppointments}</div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-red-100">
                    <XCircleIcon className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-sm font-medium text-neutral-600">Cancelled Appointments</div>
                </div>
                <div className="text-2xl font-bold text-neutral-900">{stats.cancelledAppointments}</div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <StarIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-sm font-medium text-neutral-600">Avg Service Rating</div>
                </div>
                <div className="text-2xl font-bold text-neutral-900">
                  {stats.avgServiceRating > 0 ? stats.avgServiceRating.toFixed(1) : "N/A"}
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 p-6 shadow-lg text-white">
              <h3 className="text-xl font-bold mb-4">Performance Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="opacity-90 mb-1">Period</div>
                  <div className="font-semibold text-lg">{dateRangeLabel[dateRange]}</div>
                </div>
                <div>
                  <div className="opacity-90 mb-1">Completion Rate</div>
                  <div className="font-semibold text-lg">{stats.completionRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="opacity-90 mb-1">Total Bookings</div>
                  <div className="font-semibold text-lg">{stats.totalAppointments}</div>
                </div>
                <div>
                  <div className="opacity-90 mb-1">Client Feedback</div>
                  <div className="font-semibold text-lg">
                    {stats.approvedReviews} reviews ({stats.avgRating.toFixed(1)} ⭐)
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
