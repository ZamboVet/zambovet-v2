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

  const handleSave = async () => {
    if (!name.trim() || !species.trim()) {
      await Swal.fire({ icon: "warning", title: "Missing info", text: "Please provide pet name and species.", confirmButtonColor: "#2563eb" });
      return;
    }
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
        profileUrl = pub?.publicUrl || null;
      }

      const payload: any = {
        name: name.trim(),
        species: species.trim(),
        breed: breed.trim() || null,
        gender: gender || null,
        date_of_birth: dob || null,
        weight: weight ? Number(weight) : null,
        profile_picture_url: profileUrl,
      };

      const { data, error } = await supabase.from("patients").update(payload).eq("id", pet.id).select("*").single();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={modalRef} className="relative w-full max-w-2xl mx-4 rounded-3xl overflow-hidden" role="dialog" aria-modal="true">
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-blue-400 via-indigo-500 to-blue-600 opacity-80" />
        <div className="relative rounded-3xl bg-white">
          <div className="px-6 pt-6 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white grid place-items-center">
                <HeartIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">Edit Pet</div>
                <div className="text-xs text-neutral-500">Update pet information</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Pet Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Species</label>
                <select
                  value={species}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSpecies(v);
                    setBreed("");
                    setCustomBreed(false);
                  }}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select species</option>
                  {speciesOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Pet Photo</label>
                <div className="rounded-2xl border-2 border-dashed border-neutral-300 p-5 grid place-items-center text-neutral-500">
                  {file ? (
                    <div className="text-sm">{file.name}</div>
                  ) : currentUrl ? (
                    <img src={currentUrl} alt="pet" className="h-32 w-32 object-cover rounded-xl" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <PhotoIcon className="h-8 w-8" />
                      <div className="text-sm">Upload photo</div>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button onClick={chooseFile} className="inline-flex items-center gap-2 rounded-xl bg-blue-100 text-blue-700 px-3 py-2 text-sm hover:bg-blue-200">+ Choose Photo</button>
                  {currentUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await Swal.fire({ icon: "question", title: "Remove photo?", showCancelButton: true, confirmButtonText: "Remove", confirmButtonColor: "#ef4444" });
                        if (res.isConfirmed) {
                          setCurrentUrl(null);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-white ring-1 ring-neutral-200 px-3 py-2 text-sm"
                    >
                      <TrashIcon className="h-4 w-4" /> Remove
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </div>
                <div className="text-xs text-neutral-500 mt-2">Supported: JPG, PNG, GIF. Max 5MB.</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Breed</label>
                {species && speciesBreeds[species] && !customBreed ? (
                  <>
                    <select value={breed} onChange={(e) => setBreed(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select a breed</option>
                      {speciesBreeds[species].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => { setBreed(""); setCustomBreed(true); }} className="mt-2 text-blue-700 text-sm font-medium hover:underline">Or type a custom breed</button>
                  </>
                ) : (
                  <>
                    <input value={breed} onChange={(e) => setBreed(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                    {species && speciesBreeds[species] && (
                      <button type="button" onClick={() => { setBreed(""); setCustomBreed(false); }} className="mt-2 text-blue-700 text-sm font-medium hover:underline">Choose from popular breeds</button>
                    )}
                  </>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select gender</option>
                  {genderOptions.map((g) => (
                    <option key={g} value={g}>{g[0].toUpperCase() + g.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Date of Birth</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Weight (kg)</label>
                <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button onClick={onClose} className="w-32 rounded-xl border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
