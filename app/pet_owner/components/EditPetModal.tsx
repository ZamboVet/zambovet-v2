"use client";

import { useEffect, useRef, useState } from "react";
import { XMarkIcon, HeartIcon, PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";

export type EditPetModalProps = {
  open: boolean;
  pet: {
    id: number;
    owner_id: number;
    name: string;
    species: string;
    breed: string | null;
    gender: string | null;
    date_of_birth: string | null;
    weight: number | null;
    profile_picture_url: string | null;
  } | null;
  onClose: () => void;
  onUpdated: (pet: any) => void;
};

const speciesOptions = ["Dog", "Cat", "Bird", "Rabbit", "Hamster", "Other"];
const genderOptions = ["male", "female"];
const speciesBreeds: Record<string, string[]> = {
  Dog: ["Beagle","Labrador Retriever","German Shepherd","Golden Retriever","Bulldog","Poodle","Shih Tzu","Pug","Dachshund","Mixed"],
  Cat: ["Domestic Shorthair","Persian","Siamese","Maine Coon","Ragdoll","British Shorthair","Bengal","Mixed"],
  Bird: ["Parakeet (Budgie)","Cockatiel","Parrot","Canary","Finch","Lovebird","Mixed"],
  Rabbit: ["Holland Lop","Netherland Dwarf","Mini Rex","Lionhead","Flemish Giant","Mixed"],
  Hamster: ["Syrian","Dwarf Campbell","Winter White","Roborovski","Chinese","Mixed"],
};

export default function EditPetModal({ open, pet, onClose, onUpdated }: EditPetModalProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [customBreed, setCustomBreed] = useState(false);
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [weight, setWeight] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && pet) {
      setSaving(false);
      setName(pet.name || "");
      setSpecies(pet.species || "");
      setBreed(pet.breed || "");
      setCustomBreed(false);
      setGender(pet.gender || "");
      setDob(pet.date_of_birth || "");
      setWeight(pet.weight != null ? String(pet.weight) : "");
      setFile(null);
      setCurrentUrl(pet.profile_picture_url || null);
    }
    if (!open) {
      setFile(null);
    }
  }, [open, pet]);

  if (!open || !pet) return null;

  const chooseFile = () => fileRef.current?.click();

  const sanitizeText = (s: string, max: number) => s.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
  const todayLocalISO = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleSave = async () => {
    const nameS = sanitizeText(name, 80);
    const speciesS = sanitizeText(species, 40);
    const breedS = sanitizeText(breed, 120);
    const dobS = dob || "";
    let weightNum: number | null = null;
    if (weight) {
      const w = Number(weight);
      if (!isFinite(w) || w < 0 || w > 200) {
        await Swal.fire({ icon: "warning", title: "Invalid weight", text: "Weight must be between 0 and 200 kg." });
        return;
      }
      weightNum = Number(w.toFixed(1));
    }
    if (!nameS || !speciesS) {
      await Swal.fire({ icon: "warning", title: "Missing info", text: "Please provide pet name and species.", confirmButtonColor: "#2563eb" });
      return;
    }
    if (dobS) {
      const max = todayLocalISO();
      if (dobS > max) {
        await Swal.fire({ icon: "warning", title: "Invalid date", text: "Birthdate cannot be in the future." });
        return;
      }
    }

    // Duplicate check excluding current pet
    try {
      const { data: dup } = await supabase
        .from('patients')
        .select('id')
        .eq('owner_id', pet.owner_id)
        .eq('is_active', true)
        .ilike('name', nameS)
        .ilike('species', speciesS)
        .neq('id', pet.id)
        .limit(1);
      if (Array.isArray(dup) && dup.length > 0) {
        await Swal.fire({ icon: 'info', title: 'Duplicate pet', text: 'You already have an active pet with the same name and species.' });
        return;
      }
    } catch {}

    setSaving(true);
    try {
      let profileUrl = currentUrl;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `pet-profiles/${pet.owner_id}/${Date.now()}.${ext}`;
        const { data: uploaded, error: upErr } = await supabase.storage.from("pet-images").upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) {
          await Swal.fire({ icon: "error", title: "Upload failed", text: upErr.message || "Please try again." });
          setSaving(false);
          return;
        }
        const { data: pub } = supabase.storage.from("pet-images").getPublicUrl(uploaded?.path || path);
        const url = pub?.publicUrl || null;
        profileUrl = url && /^https?:\/\//i.test(url) ? url : null;
      }

      const payload: any = {
        name: nameS,
        species: speciesS,
        breed: breedS || null,
        gender: gender || null,
        date_of_birth: dobS || null,
        weight: weightNum,
        profile_picture_url: profileUrl,
      };

      const { data, error } = await supabase
        .from("patients")
        .update(payload)
        .eq("id", pet.id)
        .eq('owner_id', pet.owner_id)
        .select("*")
        .single();
      if (error) throw error;
      await Swal.fire({ icon: "success", title: "Pet updated", timer: 1200, showConfirmButton: false });
      onUpdated(data);
      onClose();
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "Update failed", text: e?.message || "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={modalRef} className="relative w-full sm:w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[95dvh] sm:max-h-[95vh] flex flex-col" role="dialog" aria-modal="true">
        <div className="absolute -inset-[1px] rounded-t-3xl sm:rounded-3xl bg-gradient-to-br from-blue-400 via-indigo-500 to-blue-600 opacity-80" />
        <div className="relative bg-white flex flex-col min-h-0 h-full">
          <div className="sticky top-0 z-10 px-4 sm:px-6 pt-[env(safe-area-inset-top)] sm:pt-6 pb-3 sm:pb-4 flex items-center justify-between bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white grid place-items-center">
                <HeartIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">Edit Pet</div>
                <div className="text-xs text-neutral-500">Update pet information</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100" aria-label="Close">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-20 sm:pb-4 overflow-y-auto flex-1 min-h-0 scroll-smooth">
            <div className="space-y-5 sm:space-y-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-2">Pet Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter pet name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-2">Species</label>
                <select
                  value={species}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSpecies(v);
                    setBreed("");
                    setCustomBreed(false);
                  }}
                  className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select species</option>
                  {speciesOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-2">Pet Photo</label>
                <div className="rounded-xl border-2 border-dashed border-neutral-300 p-4 sm:p-6 grid place-items-center text-neutral-500 bg-neutral-50 min-h-[120px]">
                  {file ? (
                    <div className="text-center">
                      <div className="text-sm font-medium text-neutral-700">{file.name}</div>
                      <div className="text-xs text-neutral-500 mt-1">Ready to upload</div>
                    </div>
                  ) : currentUrl ? (
                    <img src={currentUrl} alt="pet" className="h-28 w-28 object-cover rounded-lg" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <PhotoIcon className="h-8 w-8 text-neutral-400" />
                      <div className="text-center">
                        <div className="text-xs font-medium">Upload photo</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">JPG, PNG, GIF • Max 5MB</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={chooseFile} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 text-white px-3 py-2 text-xs sm:text-sm font-medium hover:bg-blue-700 active:scale-95 transition">+ Choose</button>
                  {currentUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await Swal.fire({ icon: "question", title: "Remove photo?", showCancelButton: true, confirmButtonText: "Remove", confirmButtonColor: "#ef4444" });
                        if (res.isConfirmed) {
                          setCurrentUrl(null);
                        }
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-red-50 text-red-700 border border-red-200 px-3 py-2 text-xs sm:text-sm font-medium hover:bg-red-100 active:scale-95 transition"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-2">Breed</label>
                {species && speciesBreeds[species] && !customBreed ? (
                  <>
                    <select value={breed} onChange={(e) => setBreed(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Select a breed</option>
                      {speciesBreeds[species].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => { setBreed(""); setCustomBreed(true); }} className="mt-2 text-blue-600 text-sm font-medium hover:underline">Or type a custom breed</button>
                  </>
                ) : (
                  <>
                    <input value={breed} onChange={(e) => setBreed(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter breed" />
                    {species && speciesBreeds[species] && (
                      <button type="button" onClick={() => { setBreed(""); setCustomBreed(false); }} className="mt-2 text-blue-600 text-sm font-medium hover:underline">Choose from popular breeds</button>
                    )}
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Select gender</option>
                    {genderOptions.map((g) => (
                      <option key={g} value={g}>{g[0].toUpperCase() + g.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">Date of Birth</label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-2">Weight (kg)</label>
                <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="0.0" />
              </div>
            </div>
          </div>
          <div className="sticky bottom-0 z-10 px-4 sm:px-6 py-3 sm:py-4 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 pb-[env(safe-area-inset-bottom)]">
            <div className="flex flex-col-reverse sm:flex-row items-center gap-3 sm:justify-between">
              <button onClick={onClose} className="w-full sm:w-auto rounded-lg border border-neutral-300 px-5 py-3 sm:py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:scale-95 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-5 py-3 sm:py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 active:scale-95 transition">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
