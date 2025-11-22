"use client";
import { AcademicCapIcon, StarIcon } from "@heroicons/react/24/outline";

type Review = { id: number; rating: number; title: string | null; comment: string | null; created_at: string | null };

type Props = { reviews: Review[]; loading: boolean; primary: string };

export default function RecentReviews({ reviews, loading, primary }: Props) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow ring-1 ring-black/5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold" style={{ color: primary }}>Recent Reviews</h2>
        <AcademicCapIcon className="w-5 h-5 text-indigo-600" />
      </div>
      <ul className="space-y-3">
        {loading ? (
          <li className="text-sm text-gray-500">Loading…</li>
        ) : reviews.length === 0 ? (
          <li className="py-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <StarIcon className="w-10 h-10 text-amber-400" />
              <div className="text-sm text-gray-600">No reviews yet</div>
            </div>
          </li>
        ) : (
          reviews.map(r => (
            <li key={r.id} className="rounded-xl p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-yellow-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} className={`w-4 h-4 ${i < r.rating ? "fill-yellow-400" : ""}`} />
                  ))}
                </div>
                <span className="text-xs text-gray-400">{r.created_at?.slice(0,10) || ""}</span>
              </div>
              <div className="mt-1 text-sm font-medium" style={{ color: primary }}>{r.title || "Review"}</div>
              <div className="text-sm text-gray-600 break-words">{r.comment || ""}</div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
