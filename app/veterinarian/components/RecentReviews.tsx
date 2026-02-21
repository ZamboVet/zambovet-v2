"use client";
import { StarIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import Link from "next/link";

type Review = { id: number; rating: number; title: string | null; comment: string | null; created_at: string | null };

type Props = { reviews: Review[]; loading: boolean; primary: string };

export default function RecentReviews({ reviews, loading, primary }: Props) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr.slice(0, 10);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 h-full flex flex-col">
      <div className="px-4 py-3 border-b border-neutral-200">
        <h2 className="font-semibold text-neutral-900">Recent Reviews</h2>
      </div>
      
      <div className="flex-1 divide-y divide-neutral-100">
        {loading ? (
          <div className="p-4 text-sm text-neutral-500">Loading...</div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center">
            <StarIcon className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">No reviews yet</p>
          </div>
        ) : (
          reviews.slice(0, 4).map((r) => (
            <div key={r.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarSolid 
                      key={star} 
                      className={`w-3.5 h-3.5 ${star <= r.rating ? 'text-amber-400' : 'text-neutral-200'}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-neutral-400">{formatDate(r.created_at)}</span>
              </div>
              {r.title && <p className="font-medium text-sm text-neutral-900">{r.title}</p>}
              <p className="text-sm text-neutral-500 line-clamp-2">{r.comment || "No comment"}</p>
            </div>
          ))
        )}
      </div>
      
      {reviews.length > 0 && (
        <div className="px-4 py-3 border-t border-neutral-200">
          <Link href="/veterinarian/reviews" className="text-sm text-blue-600 hover:underline">
            View all reviews
          </Link>
        </div>
      )}
    </div>
  );
}
