"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import { supabase } from "../../../../lib/supabaseClient";
import { swalConfirmColor } from "../../../../lib/ui/tokens";
import {
  CalendarIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TagIcon,
  ArrowLeftIcon,
  HeartIcon,
  PhotoIcon,
  DocumentTextIcon,
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
  patient_name?: string;
};

type Pet = {
  id: number;
  name: string;
};

export default function PetDiaryPage() {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "timeline">("timeline");
  const [selectedPet, setSelectedPet] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const allTags = ["health", "medication", "feeding", "exercise", "mood", "symptom", "vet_visit", "milestone"];

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

        const { data: petsData } = await supabase
          .from("patients")
          .select("id,name")
          .eq("owner_id", oid)
          .eq("is_active", true)
          .order("name");
        setPets((petsData || []) as Pet[]);

        await loadEntries(oid, null, [], "");
      } catch (e: any) {
        await Swal.fire({ icon: "error", title: "Failed to load", text: e?.message, confirmButtonColor: swalConfirmColor });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const loadEntries = async (oid: number, petId: number | null, tags: string[], query: string) => {
    try {
      let q = supabase
        .from("pet_diary_entries")
        .select("id,patient_id,entry_date,title,content,mood,activity_level,appetite,weight,temperature,tags,photos,entry_type,is_favorite,patients(name)")
        .eq("pet_owner_id", oid)
        .order("entry_date", { ascending: false });
      if (petId) q = q.eq("patient_id", petId);
      if (tags.length > 0) q = q.contains("tags", tags);
      if (query.trim()) q = q.or(`title.ilike.%${query.trim()}%,content.ilike.%${query.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      const mapped = (data || []).map((e: any) => ({
        ...e,
        patient_name: e.patients?.name || "Unknown",
      }));
      setEntries(mapped as any);
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "Failed to fetch", text: e?.message, confirmButtonColor: swalConfirmColor });
    }
  };

  useEffect(() => {
    if (ownerId) loadEntries(ownerId, selectedPet, selectedTags, searchQuery);
  }, [ownerId, selectedPet, selectedTags, searchQuery]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const filteredEntries = useMemo(() => {
    if (viewMode === "timeline") return entries;
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    return entries.filter((e) => {
      const d = new Date(e.entry_date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [entries, viewMode, selectedMonth]);

  const calendarDays = useMemo(() => {
    if (viewMode !== "calendar") return [];
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Array<{ day: number | null; entries: DiaryEntry[] }> = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: null, entries: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayEntries = filteredEntries.filter((e) => e.entry_date === dateStr);
      days.push({ day: d, entries: dayEntries });
    }
    return days;
  }, [viewMode, selectedMonth, filteredEntries]);

  const prevMonth = () => setSelectedMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setSelectedMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/pet_owner/my-pets"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-sm"
          >
            <ArrowLeftIcon className="w-4 h-4" /> Back
          </Link>
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white grid place-items-center">
            <DocumentTextIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-semibold text-neutral-900">Pet Health Diary</div>
            <div className="text-sm text-neutral-500">Track daily health, mood, and activities</div>
          </div>
        </div>
        <button
          onClick={() => router.push("/pet_owner/my-pets/diary/new")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
        >
          <PlusIcon className="w-4 h-4" /> New Entry
        </button>
      </div>

      <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-neutral-200 flex-1 min-w-[220px]">
            <MagnifyingGlassIcon className="w-4 h-4 text-neutral-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries..."
              className="outline-none text-sm bg-transparent flex-1"
            />
          </div>
          <select
            value={selectedPet || ""}
            onChange={(e) => setSelectedPet(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 rounded-xl bg-white ring-1 ring-neutral-200 text-sm outline-none"
          >
            <option value="">All Pets</option>
            {pets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-white ring-1 ring-neutral-200">
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 rounded-lg text-sm ${viewMode === "timeline" ? "bg-blue-600 text-white" : "hover:bg-neutral-50"}`}
            >
              <ListBulletIcon className="w-4 h-4 inline mr-1" /> Timeline
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 rounded-lg text-sm ${viewMode === "calendar" ? "bg-blue-600 text-white" : "hover:bg-neutral-50"}`}
            >
              <CalendarIcon className="w-4 h-4 inline mr-1" /> Calendar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TagIcon className="w-4 h-4 text-neutral-500" />
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs ${
                selectedTags.includes(tag)
                  ? "bg-blue-600 text-white"
                  : "bg-white ring-1 ring-neutral-200 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {tag.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "calendar" && (
        <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="px-3 py-2 rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-sm">
              ← Prev
            </button>
            <div className="text-lg font-semibold">
              {selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
            <button onClick={nextMonth} className="px-3 py-2 rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-sm">
              Next →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-neutral-500 py-2">
                {d}
              </div>
            ))}
            {calendarDays.map((cell, idx) => (
              <div
                key={idx}
                className={`min-h-[80px] p-2 rounded-xl border ${
                  cell.day ? "bg-white border-neutral-200" : "bg-neutral-50 border-transparent"
                }`}
              >
                {cell.day && (
                  <>
                    <div className="text-sm font-medium text-neutral-700 mb-1">{cell.day}</div>
                    {cell.entries.length > 0 && (
                      <div className="space-y-1">
                        {cell.entries.slice(0, 2).map((e) => (
                          <div
                            key={e.id}
                            onClick={() => router.push(`/pet_owner/my-pets/diary/${e.id}`)}
                            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 truncate cursor-pointer hover:bg-blue-100"
                          >
                            {e.title || "Entry"}
                          </div>
                        ))}
                        {cell.entries.length > 2 && (
                          <div className="text-xs text-neutral-500 text-center">+{cell.entries.length - 2} more</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === "timeline" && (
        <div className="space-y-4">
          {loading && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200 p-4 animate-pulse h-32" />
              ))}
            </>
          )}
          {!loading && filteredEntries.length === 0 && (
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200 p-10 text-center">
              <DocumentTextIcon className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
              <p className="text-neutral-700 font-medium">No diary entries yet</p>
              <p className="text-neutral-500 text-sm">Start tracking your pet's health and activities</p>
            </div>
          )}
          {!loading &&
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => router.push(`/pet_owner/my-pets/diary/${entry.id}`)}
                className="rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200 p-4 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <HeartIcon className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-neutral-900">{entry.patient_name}</span>
                      <span className="text-xs text-neutral-500">{new Date(entry.entry_date).toLocaleDateString()}</span>
                      {entry.is_favorite && <span className="text-xs">⭐</span>}
                    </div>
                    {entry.title && <div className="font-semibold text-neutral-800 mb-1">{entry.title}</div>}
                    {entry.content && (
                      <div className="text-sm text-neutral-600 line-clamp-2 mb-2">{entry.content}</div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.mood && (
                        <span className="px-2 py-1 rounded-full text-xs bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                          Mood: {entry.mood}
                        </span>
                      )}
                      {entry.activity_level && (
                        <span className="px-2 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                          Activity: {entry.activity_level}
                        </span>
                      )}
                      {entry.appetite && (
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                          Appetite: {entry.appetite}
                        </span>
                      )}
                      {entry.photos && entry.photos.length > 0 && (
                        <span className="px-2 py-1 rounded-full text-xs bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200">
                          <PhotoIcon className="w-3 h-3 inline mr-1" />
                          {entry.photos.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-full bg-white ring-1 ring-neutral-200 text-neutral-600">
                    {entry.entry_type}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
