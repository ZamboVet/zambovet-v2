"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import { supabase } from "../../../../../lib/supabaseClient";
import { swalConfirmColor } from "../../../../../lib/ui/tokens";
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type Pet = {
  id: number;
  name: string;
};

type Medication = {
  name: string;
  dosage: string;
  time: string;
};

type Template = {
  id: number;
  name: string;
  description: string | null;
  template_data: any;
  category: string | null;
};

export default function NewDiaryEntryPage() {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  const [petId, setPetId] = useState<number | null>(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [appetite, setAppetite] = useState("");
  const [weight, setWeight] = useState("");
  const [temperature, setTemperature] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [entryType, setEntryType] = useState("daily");
  const [medications, setMedications] = useState<Medication[]>([{ name: "", dosage: "", time: "" }]);
  const [feedingNotes, setFeedingNotes] = useState("");
  const [healthObservations, setHealthObservations] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [behaviorNotes, setBehaviorNotes] = useState("");

  const allTags = ["health", "medication", "feeding", "exercise", "mood", "symptom", "vet_visit", "milestone"];
  const moods = ["happy", "playful", "tired", "anxious", "calm", "energetic", "lethargic"];
  const activityLevels = ["very_low", "low", "normal", "active", "very_active"];
  const appetites = ["normal", "increased", "decreased", "no_appetite", "picky"];
  const entryTypes = ["daily", "milestone", "vet_visit", "special"];

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

        const [petsRes, templatesRes] = await Promise.all([
          supabase.from("patients").select("id,name").eq("owner_id", oid).eq("is_active", true).order("name"),
          supabase.from("pet_diary_templates").select("*").eq("is_active", true).order("name"),
        ]);
        setPets((petsRes.data || []) as Pet[]);
        setTemplates((templatesRes.data || []) as Template[]);
      } catch (e: any) {
        await Swal.fire({ icon: "error", title: "Failed to load", text: e?.message, confirmButtonColor: swalConfirmColor });
      }
    };
    init();
  }, [router]);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const applyTemplate = async (template: Template) => {
    const data = template.template_data || {};
    if (data.title) setTitle(data.title);
    if (data.content) setContent(data.content);
    if (data.mood) setMood(data.mood);
    if (data.activity_level) setActivityLevel(data.activity_level);
    if (data.appetite) setAppetite(data.appetite);
    if (data.tags) setTags(data.tags);
    if (data.entry_type) setEntryType(data.entry_type);
    await Swal.fire({ icon: "success", title: "Template applied", confirmButtonColor: swalConfirmColor });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId || !petId) {
      await Swal.fire({ icon: "warning", title: "Please select a pet", confirmButtonColor: swalConfirmColor });
      return;
    }
    setLoading(true);
    try {
      const medicationData = medications
        .map((m) => ({ name: m.name.trim(), dosage: m.dosage.trim(), time: m.time.trim() }))
        .filter((m) => m.name || m.dosage || m.time);
      const medPayload = medicationData.length > 0 ? medicationData : null;
      const { error } = await supabase.from("pet_diary_entries").insert({
        pet_owner_id: ownerId,
        patient_id: petId,
        entry_date: entryDate,
        title: title.trim() || null,
        content: content.trim() || null,
        mood: mood || null,
        activity_level: activityLevel || null,
        appetite: appetite || null,
        weight: weight ? parseFloat(weight) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        tags: tags.length > 0 ? tags : null,
        entry_type: entryType,
        medication_given: medPayload,
        feeding_notes: feedingNotes.trim() || null,
        health_observations: healthObservations.trim() || null,
        symptoms: symptoms.trim() || null,
        behavior_notes: behaviorNotes.trim() || null,
      });
      if (error) throw error;
      await Swal.fire({ icon: "success", title: "Entry saved", confirmButtonColor: swalConfirmColor });
      router.push("/pet_owner/my-pets/diary");
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "Failed to save", text: e?.message, confirmButtonColor: swalConfirmColor });
    } finally {
      setLoading(false);
    }
  };

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
            <div className="text-lg font-semibold text-neutral-900">New Diary Entry</div>
            <div className="text-sm text-neutral-500">Record your pet's health and activities</div>
          </div>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-5">
          <div className="text-sm font-semibold text-neutral-800 mb-3">Quick Templates</div>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className="px-3 py-2 rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-sm"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Pet *</label>
              <select
                value={petId || ""}
                onChange={(e) => setPetId(e.target.value ? Number(e.target.value) : null)}
                required
                className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a pet</option>
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Date *</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning walk, Vet checkup"
              className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Notes</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Describe your pet's day, behavior, or any observations..."
              className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Mood</label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select mood</option>
                {moods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Activity Level</label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select level</option>
                {activityLevels.map((a) => (
                  <option key={a} value={a}>
                    {a.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Appetite</label>
              <select
                value={appetite}
                onChange={(e) => setAppetite(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select appetite</option>
                {appetites.map((a) => (
                  <option key={a} value={a}>
                    {a.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g., 12.5"
                className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="e.g., 38.5"
                className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Health Observations</label>
            <textarea
              value={healthObservations}
              onChange={(e) => setHealthObservations(e.target.value)}
              rows={2}
              placeholder="Any health concerns or observations..."
              className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Symptoms</label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={2}
              placeholder="Any symptoms noticed..."
              className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Behavior Notes</label>
            <textarea
              value={behaviorNotes}
              onChange={(e) => setBehaviorNotes(e.target.value)}
              rows={2}
              placeholder="Any behavioral changes..."
              className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Feeding Notes</label>
            <textarea
              value={feedingNotes}
              onChange={(e) => setFeedingNotes(e.target.value)}
              rows={2}
              placeholder="What and when did your pet eat..."
              className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Medication</label>
            <div className="space-y-2">
              {medications.map((m, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    value={m.name}
                    onChange={(e) => {
                      const v = e.target.value; setMedications((prev) => prev.map((it, i) => (i === idx ? { ...it, name: v } : it)));
                    }}
                    placeholder="Medicine name"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={m.dosage}
                    onChange={(e) => {
                      const v = e.target.value; setMedications((prev) => prev.map((it, i) => (i === idx ? { ...it, dosage: v } : it)));
                    }}
                    placeholder="Dosage (e.g., 10mg)"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="time"
                    value={m.time}
                    onChange={(e) => {
                      const v = e.target.value; setMedications((prev) => prev.map((it, i) => (i === idx ? { ...it, time: v } : it)));
                    }}
                    placeholder="Time"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="md:col-span-3 flex justify-end">
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMedications((prev) => prev.filter((_, i) => i !== idx))}
                        className="mt-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMedications((prev) => [...prev, { name: "", dosage: "", time: "" }])}
                className="px-3 py-1.5 rounded-lg bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-sm inline-flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" /> Add Medication
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs ${
                    tags.includes(tag)
                      ? "bg-blue-600 text-white"
                      : "bg-white ring-1 ring-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {tag.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Entry Type</label>
            <select
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {entryTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/pet_owner/my-pets/diary"
            className="px-4 py-2 rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}
