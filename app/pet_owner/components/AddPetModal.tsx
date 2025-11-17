"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { XMarkIcon, HeartIcon, PhotoIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";
import { supabase } from "../../../lib/supabaseClient";

export type AddPetModalProps = {
  ownerId: number;
  open: boolean;
  onClose: () => void;
  onCreated: (pet: any) => void;
};

const speciesOptions = ["Dog", "Cat", "Bird", "Rabbit", "Hamster", "Other"];
const genderOptions = ["male", "female"];
const speciesBreeds: Record<string, string[]> = {
  Dog: [
    "Beagle",
    "Labrador Retriever",
    "German Shepherd",
    "Golden Retriever",
    "Bulldog",
    "Poodle",
    "Shih Tzu",
    "Pug",
    "Dachshund",
    "Mixed",
  ],
  Cat: [
    "Domestic Shorthair",
    "Persian",
    "Siamese",
    "Maine Coon",
    "Ragdoll",
    "British Shorthair",
    "Bengal",
    "Mixed",
  ],
  Bird: [
    "Parakeet (Budgie)",
    "Cockatiel",
    "Parrot",
    "Canary",
    "Finch",
    "Lovebird",
    "Mixed",
  ],
  Rabbit: [
    "Holland Lop",
    "Netherland Dwarf",
    "Mini Rex",
    "Lionhead",
    "Flemish Giant",
    "Mixed",
  ],
  Hamster: [
    "Syrian",
    "Dwarf Campbell",
    "Winter White",
    "Roborovski",
    "Chinese",
    "Mixed",
  ],
};

export default function AddPetModal({ ownerId, open, onClose, onCreated }: AddPetModalProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [customBreed, setCustomBreed] = useState(false);
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [weight, setWeight] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setName("");
      setSpecies("");
      setBreed("");
      setCustomBreed(false);
      setGender("");
      setDob("");
      setWeight("");
      setFile(null);
      setPreviewUrl(null);
      setShowCropModal(false);
      setTempImageUrl(null);
      if (cropperRef.current) {
        cropperRef.current.destroy();
        cropperRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    return () => {
      try {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (tempImageUrl) URL.revokeObjectURL(tempImageUrl);
      } catch {}
    };
  }, [previewUrl, tempImageUrl]);

  useEffect(() => {
    if (!open) return;
    const root = modalRef.current;
    if (!root) return;
    const selectors = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getNodes = () => Array.from(root.querySelectorAll<HTMLElement>(selectors)).filter(el => !el.hasAttribute('disabled'));
    const nodes = getNodes();
    nodes[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = getNodes();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const chooseFile = () => fileRef.current?.click();

  const applyCrop = () => {
    if (!cropperRef.current || !cropImageRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    cropperRef.current.getCroppedCanvas().toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], file?.name || 'pet-photo.jpg', { type: 'image/jpeg' });
        setFile(croppedFile);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
      setShowCropModal(false);
      setTempImageUrl(null);
      if (cropperRef.current) {
        cropperRef.current.destroy();
        cropperRef.current = null;
      }
    }, 'image/jpeg', 0.95);
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setTempImageUrl(null);
    if (cropperRef.current) {
      cropperRef.current.destroy();
      cropperRef.current = null;
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !species.trim()) {
      Swal.fire({ icon: "warning", title: "Missing info", text: "Please provide pet name and species.", confirmButtonColor: "#2563eb" });
      return;
    }

    setSubmitting(true);
    let profileUrl: string | null = null;
    try {
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `pet-profiles/${ownerId}/${Date.now()}.${ext}`;
        const { data: uploaded, error: upErr } = await supabase.storage.from("pet-images").upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) {
          // If bucket missing or upload fails, continue without image
        } else {
          const { data: pub } = supabase.storage.from("pet-images").getPublicUrl(uploaded?.path || path);
          profileUrl = pub?.publicUrl || null;
        }
      }

      const payload: any = {
        owner_id: ownerId,
        name: name.trim(),
        species: species.trim(),
        breed: breed.trim() || null,
        gender: gender || null,
        date_of_birth: dob || null,
        weight: weight ? Number(weight) : null,
        profile_picture_url: profileUrl,
        is_active: true,
      };

      const { data, error } = await supabase.from("patients").insert(payload).select("*").single();
      if (error) throw error;
      try {
        await supabase.from('notifications').insert({
          title: 'Pet added',
          message: `${data.name} (${data.species || 'Pet'}) has been registered`,
          notification_type: 'system',
          user_id: null,
        });
      } catch {}

      Swal.fire({ icon: "success", title: "Pet added", timer: 1300, showConfirmButton: false });
      onCreated(data);
      onClose();
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Failed to add pet", text: e?.message || "Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div ref={modalRef} className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl" role="dialog" aria-modal="true">
        <div className="absolute -inset-[1px] rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 opacity-80" />
        <div className="relative rounded-2xl sm:rounded-3xl bg-white">
          {/* Header */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-emerald-500 text-white grid place-items-center flex-shrink-0">
                <HeartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-semibold truncate">Add New Pet</div>
                <div className="text-xs text-neutral-500 hidden sm:block">Register your beloved companion</div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 sm:p-2 rounded-lg hover:bg-neutral-100 flex-shrink-0">
              <XMarkIcon className="h-5 w-5 sm:h-5 sm:w-5" />
            </button>
          </div>

          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Pet Name */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-1.5">Pet Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Buddy, Luna" className="w-full rounded-lg sm:rounded-xl border border-neutral-200 px-2.5 sm:px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              {/* Species */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-1.5">Species</label>
                <select
                  value={species}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSpecies(v);
                    setBreed("");
                    setCustomBreed(false);
                  }}
                  className="w-full rounded-lg sm:rounded-xl border border-neutral-200 px-2.5 sm:px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="" disabled>Select species</option>
                  {speciesOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {/* Photo */}
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-1.5">Pet Photo (Optional)</label>
                <div className="rounded-lg sm:rounded-2xl border-2 border-dashed border-neutral-300 p-3 sm:p-5 grid place-items-center text-neutral-500">
                  {previewUrl ? (
                    <img src={previewUrl} alt="preview" className="w-full max-w-xs aspect-square object-cover rounded-lg" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <PhotoIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                      <div className="text-xs sm:text-sm">Upload photo</div>
                    </div>
                  )}
                </div>
                <div className="mt-2 sm:mt-3 flex flex-col gap-2">
                  {!previewUrl ? (
                    <button onClick={chooseFile} className="inline-flex items-center gap-2 rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-700 px-3 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-emerald-200">+ Choose Photo</button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={chooseFile} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-700 px-3 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-emerald-200">Change Photo</button>
                      <button onClick={() => { setFile(null); setPreviewUrl(null); }} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-red-100 text-red-700 px-3 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-red-200">Remove</button>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f) {
                        try {
                          const url = URL.createObjectURL(f);
                          setTempImageUrl(url);
                          setShowCropModal(true);
                        } catch {
                          setTempImageUrl(null);
                        }
                      }
                    }}
                  />
                  <div className="text-xs text-neutral-500 mt-1.5 sm:mt-2">Supported: JPG, PNG, GIF. Max 5MB.</div>
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-1.5">Breed</label>
                {species && speciesBreeds[species] && !customBreed ? (
                  <>
                    <select
                      value={breed}
                      onChange={(e) => setBreed(e.target.value)}
                      className="w-full rounded-lg sm:rounded-xl border border-neutral-200 px-2.5 sm:px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select a breed</option>
                      {speciesBreeds[species].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setBreed(""); setCustomBreed(true); }}
                      className="mt-1.5 text-emerald-700 text-xs sm:text-sm font-medium hover:underline"
                    >
                      Or type a custom breed
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      value={breed}
                      onChange={(e) => setBreed(e.target.value)}
                      placeholder={species && speciesBreeds[species] ? "Type a custom breed" : "e.g., Golden Retriever"}
                      className="w-full rounded-lg sm:rounded-xl border border-neutral-200 px-2.5 sm:px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {species && speciesBreeds[species] && (
                      <button
                        type="button"
                        onClick={() => { setBreed(""); setCustomBreed(false); }}
                        className="mt-1.5 text-emerald-700 text-xs sm:text-sm font-medium hover:underline"
                      >
                        Choose from popular breeds
                      </button>
                    )}
                  </>
                )}
              </div>
              {/* Gender */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-1.5">Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-lg sm:rounded-xl border border-neutral-200 px-2.5 sm:px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="" disabled>Select gender</option>
                  {genderOptions.map((g) => (
                    <option key={g} value={g}>{g[0].toUpperCase() + g.slice(1)}</option>
                  ))}
                </select>
              </div>
              {/* DOB */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-1.5">Date of Birth</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full rounded-lg sm:rounded-xl border border-neutral-200 px-2.5 sm:px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              {/* Weight */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-1.5">Weight (kg)</label>
                <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g., 5.2" className="w-full rounded-lg sm:rounded-xl border border-neutral-200 px-2.5 sm:px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>

            <div className="mt-4 sm:mt-6 flex items-center justify-end gap-2 sm:gap-3">
              <button onClick={onClose} className="flex-1 sm:flex-none rounded-lg sm:rounded-xl border border-neutral-200 px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-neutral-50">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-emerald-600 text-white px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {submitting ? "Saving…" : "Add Pet"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Crop Modal with Cropper.js */}
      {showCropModal && tempImageUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCropCancel} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold">Crop Photo</h3>
              <button onClick={handleCropCancel} className="p-1.5 hover:bg-neutral-100 rounded-lg flex-shrink-0">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4 max-h-[500px] overflow-auto">
              <img
                ref={cropImageRef}
                src={tempImageUrl}
                alt="crop"
                style={{ maxWidth: '100%', maxHeight: '500px' }}
              />
            </div>

            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleCropCancel}
                className="flex-1 px-4 py-2 rounded-lg border border-neutral-200 text-xs sm:text-sm hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={applyCrop}
                className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm font-medium hover:bg-emerald-700"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initialize Cropper.js when modal shows */}
      {showCropModal && tempImageUrl && (
        <CropperInitializer imageRef={cropImageRef} cropperRef={cropperRef} />
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function CropperInitializer({
  imageRef,
  cropperRef,
}: {
  imageRef: React.RefObject<HTMLImageElement | null>;
  cropperRef: React.MutableRefObject<Cropper | null>;
}) {
  useEffect(() => {
    if (!imageRef.current) return;
    if (cropperRef.current) {
      cropperRef.current.destroy();
    }
    cropperRef.current = new Cropper(imageRef.current, {
      aspectRatio: NaN,
      autoCropArea: 0.8,
      responsive: true,
      restore: true,
      guides: true,
      center: true,
      highlight: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: true,
    });
    return () => {
      if (cropperRef.current) {
        cropperRef.current.destroy();
        cropperRef.current = null;
      }
    };
  }, [imageRef, cropperRef]);
  return null;
}
