"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import { supabase } from "../../../../../lib/supabaseClient";
import { swalConfirmColor } from "../../../../../lib/ui/tokens";
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  HeartIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";

type DiaryEntry = {
  id: number;
  patient_id: number;
  entry_date: string;
  title: string | null;
  content: string | null;
  mood: string | null;
  activity_level: string | null;
  appetite: string | null;
  weight: number | null;
  temperature: number | null;
  tags: string[] | null;
  photos: string[] | null;
  entry_type: string;
  is_favorite: boolean;
  medication_given: any;
  feeding_notes: string | null;
  health_observations: string | null;
  symptoms: string | null;
  behavior_notes: string | null;
  patient_name?: string;
};

export default function DiaryEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) {
          await Swal.fire({ icon: "warning", title: "Sign in required", confirmButtonColor: swalConfirmColor });
          router.replace("/login");
          return;
        }
        const { data: ownerRow } = await supabase
          .from("pet_owner_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        const oid = ownerRow?.id ?? null;
        setOwnerId(oid);
        if (!oid) return;

        const { data, error } = await supabase
          .from("pet_diary_entries")
          .select("*,patients(name)")
          .eq("id", Number(id))
          .eq("pet_owner_id", oid)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          await Swal.fire({ icon: "error", title: "Entry not found", confirmButtonColor: swalConfirmColor });
          router.replace("/pet_owner/my-pets/diary");
          return;
        }
        setEntry({ ...data, patient_name: (data as any).patients?.name || "Unknown" } as any);
      } catch (e: any) {
        await Swal.fire({ icon: "error", title: "Failed to load", text: e?.message, confirmButtonColor: swalConfirmColor });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, router]);

  const toggleFavorite = async () => {
    if (!entry) return;
    try {
      const { error } = await supabase
        .from("pet_diary_entries")
        .update({ is_favorite: !entry.is_favorite })
        .eq("id", entry.id);
      if (error) throw error;
      setEntry({ ...entry, is_favorite: !entry.is_favorite });
      await Swal.fire({
        icon: "success",
        title: entry.is_favorite ? "Removed from favorites" : "Added to favorites",
        confirmButtonColor: swalConfirmColor,
      });
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "Failed to update", text: e?.message, confirmButtonColor: swalConfirmColor });
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    const res = await Swal.fire({
      icon: "warning",
      title: "Delete this entry?",
      text: "This action cannot be undone",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#ef4444",
    });
    if (!res.isConfirmed) return;
    try {
      const { error } = await supabase.from("pet_diary_entries").delete().eq("id", entry.id);
      if (error) throw error;
      await Swal.fire({ icon: "success", title: "Entry deleted", confirmButtonColor: swalConfirmColor });
      router.push("/pet_owner/my-pets/diary");
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "Failed to delete", text: e?.message, confirmButtonColor: swalConfirmColor });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-5 h-20 animate-pulse" />
        <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-5 h-96 animate-pulse" />
      </div>
    );
  }

  if (!entry) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/pet_owner/my-pets/diary"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-sm"
          >
            <ArrowLeftIcon className="w-4 h-4" /> Back
          </Link>
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white grid place-items-center">
            <DocumentTextIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-semibold text-neutral-900">Diary Entry</div>
            <div className="text-sm text-neutral-500">{new Date(entry.entry_date).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFavorite}
            className={`px-3 py-2 rounded-xl text-sm ${
              entry.is_favorite ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" : "bg-white ring-1 ring-neutral-200 hover:bg-neutral-50"
            }`}
          >
            {entry.is_favorite ? "⭐ Favorited" : "☆ Favorite"}
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-2 rounded-xl bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100 text-sm"
          >
            <TrashIcon className="w-4 h-4 inline mr-1" /> Delete
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-6 space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-neutral-200">
          <HeartIcon className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-neutral-900">{entry.patient_name}</span>
          <span className="px-2 py-1 rounded-full text-xs bg-white ring-1 ring-neutral-200 text-neutral-600">
            {entry.entry_type}
          </span>
        </div>

        {entry.title && (
          <div>
            <div className="text-sm font-medium text-neutral-500 mb-1">Title</div>
            <div className="text-lg font-semibold text-neutral-900">{entry.title}</div>
          </div>
        )}

        {entry.content && (
          <div>
            <div className="text-sm font-medium text-neutral-500 mb-1">Notes</div>
            <div className="text-neutral-700 whitespace-pre-wrap">{entry.content}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {entry.mood && (
            <div>
              <div className="text-sm font-medium text-neutral-500 mb-1">Mood</div>
              <div className="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-sm">
                {entry.mood}
              </div>
            </div>
          )}
          {entry.activity_level && (
            <div>
              <div className="text-sm font-medium text-neutral-500 mb-1">Activity Level</div>
              <div className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-sm">
                {entry.activity_level.replace("_", " ")}
              </div>
            </div>
          )}
          {entry.appetite && (
            <div>
              <div className="text-sm font-medium text-neutral-500 mb-1">Appetite</div>
              <div className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-200 text-sm">
                {entry.appetite.replace("_", " ")}
              </div>
            </div>
          )}
        </div>

        {(entry.weight || entry.temperature) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entry.weight && (
              <div>
                <div className="text-sm font-medium text-neutral-500 mb-1">Weight</div>
                <div className="text-neutral-900">{entry.weight} kg</div>
              </div>
            )}
            {entry.temperature && (
              <div>
                <div className="text-sm font-medium text-neutral-500 mb-1">Temperature</div>
                <div className="text-neutral-900">{entry.temperature} °C</div>
              </div>
            )}
          </div>
        )}

        {entry.health_observations && (
          <div>
            <div className="text-sm font-medium text-neutral-500 mb-1">Health Observations</div>
            <div className="text-neutral-700 whitespace-pre-wrap">{entry.health_observations}</div>
          </div>
        )}

        {entry.symptoms && (
          <div>
            <div className="text-sm font-medium text-neutral-500 mb-1">Symptoms</div>
            <div className="text-neutral-700 whitespace-pre-wrap">{entry.symptoms}</div>
          </div>
        )}

        {entry.behavior_notes && (
          <div>
            <div className="text-sm font-medium text-neutral-500 mb-1">Behavior Notes</div>
            <div className="text-neutral-700 whitespace-pre-wrap">{entry.behavior_notes}</div>
          </div>
        )}

        {entry.feeding_notes && (
          <div>
            <div className="text-sm font-medium text-neutral-500 mb-1">Feeding Notes</div>
            <div className="text-neutral-700 whitespace-pre-wrap">{entry.feeding_notes}</div>
          </div>
        )}

        {entry.medication_given && (
          <div>
            <div className="text-sm font-medium text-neutral-500 mb-1">Medication</div>
            <div className="px-3 py-2 rounded-xl bg-neutral-50 text-neutral-700 font-mono text-xs">
              {JSON.stringify(entry.medication_given, null, 2)}
            </div>
          </div>
        )}

        {entry.tags && entry.tags.length > 0 && (
          <div>
            <div className="text-sm font-medium text-neutral-500 mb-2">Tags</div>
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs bg-white ring-1 ring-neutral-200 text-neutral-600"
                >
                  {tag.replace("_", " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {entry.photos && entry.photos.length > 0 && (
          <div>
            <div className="text-sm font-medium text-neutral-500 mb-2">Photos</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {entry.photos.map((photo, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden ring-1 ring-neutral-200 aspect-square bg-neutral-100">
                  <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
