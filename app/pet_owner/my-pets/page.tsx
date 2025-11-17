"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { HeartIcon, PlusIcon, PencilSquareIcon, TrashIcon, CalendarDaysIcon, MagnifyingGlassIcon, FunnelIcon, ArrowsUpDownIcon, Squares2X2Icon, Bars3BottomLeftIcon, DocumentTextIcon, EyeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import AddPetModal from "../components/AddPetModal";
import EditPetModal from "../components/EditPetModal";
import ViewPetModal from "../components/ViewPetModal";

type Pet = {
  id: number;
  owner_id: number;
  name: string;
  species: string;
  breed: string | null;
  date_of_birth: string | null;
  profile_picture_url: string | null;
  gender?: string | null;
  weight?: number | null;
};

function ageFrom(dob: string | null) {
  if (!dob) return "-";
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return "-";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
  if (years === 0 && months === 0) {
    const d = Math.max(days, 0);
    parts.push(`${d} day${d !== 1 ? 's' : ''}`);
  }
  return parts.join(", ") || "0 days";
}

export default function MyPetsPage() {
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [query, setQuery] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState<string>("All");
  const [sort, setSort] = useState<string>("Newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Pet | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<Pet | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) {
          setLoading(false);
          return;
        }
        const { data: ownerRow } = await supabase
          .from("pet_owner_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        const oid = ownerRow?.id ?? null;
        setOwnerId(oid);
        if (!oid) {
          setLoading(false);
          return;
        }
        const { data } = await supabase
          .from("patients")
          .select("id,owner_id,name,species,breed,date_of_birth,profile_picture_url,gender,weight")
          .eq("owner_id", oid)
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        setPets((data as any as Pet[]) ?? []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onAdd = () => setModalOpen(true);
  const onEdit = (p: Pet) => {
    setEditing(p);
    setEditOpen(true);
  };
  const onDelete = async (p: Pet) => {
    const res = await Swal.fire({ title: `Remove ${p.name}?`, text: "This will deactivate the pet profile.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444" });
    if (res.isConfirmed) {
      await supabase.from("patients").update({ is_active: false }).eq("id", p.id);
      setPets((prev) => prev.filter((x) => x.id !== p.id));
      try { await supabase.from('notifications').insert({ title: 'Pet removed', message: `${p.name} has been deactivated`, notification_type:'system' }); } catch {}
      Swal.fire({ title: "Removed", icon: "success", timer: 1200, showConfirmButton: false });
    }
  };

  const speciesOptions = useMemo(() => {
    const set = new Set<string>();
    pets.forEach((p) => set.add(p.species));
    return ["All", ...Array.from(set.values()).sort((a, b) => a.localeCompare(b))];
  }, [pets]);

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = pets.filter((p) => {
      const qok = q ? `${p.name} ${p.species} ${p.breed ?? ""}`.toLowerCase().includes(q) : true;
      const sok = speciesFilter === "All" ? true : p.species === speciesFilter;
      return qok && sok;
    });
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "Name A-Z") return a.name.localeCompare(b.name);
      if (sort === "Name Z-A") return b.name.localeCompare(a.name);
      return 0; // Newest handled by DB order
    });
    return sorted;
  }, [pets, query, speciesFilter, sort]);

  return (
    <div className="min-h-dvh bg-neutral-50">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-5 md:pt-6">
        <div className="rounded-lg sm:rounded-2xl bg-white/70 backdrop-blur ring-1 ring-neutral-200 shadow-sm px-3 sm:px-4 md:px-5 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center flex-shrink-0">
              <HeartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-semibold text-neutral-900 truncate">My Pets</h1>
              <p className="text-[10px] sm:text-xs md:text-sm text-neutral-500 truncate">Manage your pet profiles</p>
            </div>
          </div>
          <Link
            href="/pet_owner/my-pets/diary"
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs sm:text-sm font-medium active:scale-95 whitespace-nowrap"
          >
            <DocumentTextIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span>Pet Diary</span>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6">
        <div className="mb-3 sm:mb-4 sticky top-2 z-10">
          <div className="rounded-lg sm:rounded-2xl bg-white/80 backdrop-blur ring-1 ring-neutral-200 p-2.5 sm:p-3 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 items-stretch lg:items-center">
              <div className="flex-1 inline-flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-sm">
                <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-400 flex-shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pets..."
                  className="w-full outline-none bg-transparent text-xs sm:text-sm"
                />
              </div>
              <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-sm">
                <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-400 flex-shrink-0" />
                <select value={speciesFilter} onChange={(e) => setSpeciesFilter(e.target.value)} className="bg-transparent text-xs sm:text-sm outline-none flex-1 min-w-0">
                  {speciesOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-sm">
                <ArrowsUpDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-400 flex-shrink-0" />
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent text-xs sm:text-sm outline-none flex-1 min-w-0">
                  {['Newest','Name A-Z','Name Z-A'].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="inline-flex items-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 px-2 sm:px-2.5 py-1.5 sm:py-2 shadow-sm">
                <button onClick={() => setView("grid")} className={`p-1 sm:p-1.5 rounded-lg active:scale-95 ${view==='grid' ? 'bg-neutral-100' : ''}`} aria-label="Grid view">
                  <Squares2X2Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <button onClick={() => setView("list")} className={`p-1 sm:p-1.5 rounded-lg active:scale-95 ${view==='list' ? 'bg-neutral-100' : ''}`} aria-label="List view">
                  <Bars3BottomLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <button onClick={onAdd} className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium hover:bg-blue-700 shadow-sm active:scale-95">
                <PlusIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Add Pet</span>
              </button>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`sk-${i}`} className="rounded-lg sm:rounded-xl border border-neutral-200 bg-white p-3 sm:p-4 shadow-sm animate-pulse">
                <div className="h-32 sm:h-40 w-full bg-neutral-200 rounded mb-2 sm:mb-3" />
                <div className="h-3 w-32 sm:w-40 bg-neutral-200 rounded mb-1.5 sm:mb-2" />
                <div className="h-2.5 sm:h-3 w-20 sm:w-24 bg-neutral-200 rounded" />
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-lg sm:rounded-2xl border border-dashed border-neutral-300 bg-white shadow-sm p-6 sm:p-8 md:p-10 text-center">
            <div className="mx-auto mb-2 sm:mb-3 h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 grid place-items-center">
              <HeartIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <p className="text-sm sm:text-base text-neutral-700 font-medium mb-1">No pets found</p>
            <p className="text-xs sm:text-sm text-neutral-500 mb-3 sm:mb-4">Try adjusting your search or add a new pet.</p>
            <button onClick={onAdd} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-blue-600 text-white text-xs sm:text-sm hover:bg-blue-700 active:scale-95">Add a pet</button>
          </div>
        ) : (
          <div className={`${view==='grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5' : 'space-y-2 sm:space-y-3'}`}>
            {displayed.map((p) => (
              <div key={p.id} className={`group rounded-lg sm:rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 ${view==='list' ? 'flex flex-col sm:flex-row' : ''}`}>
                <div className={`relative ${view==='list' ? 'h-32 sm:h-44 sm:w-44' : 'h-40 sm:h-44'} w-full bg-neutral-100 flex-shrink-0`}>
                  {p.profile_picture_url ? (
                    <img src={p.profile_picture_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-neutral-400 text-xs sm:text-sm">No photo</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent opacity-80" />
                  <div className="absolute left-2 sm:left-3 top-2 sm:top-3 flex flex-wrap gap-1.5 sm:gap-2">
                    <span className="inline-flex items-center rounded-full bg-white/95 backdrop-blur px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-blue-700 ring-1 ring-blue-200 shadow-sm">{p.species}</span>
                    {p.breed && (
                      <span className="inline-flex items-center rounded-full bg-white/95 backdrop-blur px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-purple-700 ring-1 ring-purple-200 shadow-sm">{p.breed}</span>
                    )}
                  </div>
                </div>
                <div className="p-3 sm:p-4 flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-neutral-900 tracking-tight truncate">{p.name}</p>
                      <p className="text-[10px] sm:text-xs text-neutral-500">Age {ageFrom(p.date_of_birth)}</p>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                      <button onClick={() => onEdit(p)} className="p-1.5 sm:p-2 rounded-lg text-blue-600 hover:bg-blue-50 active:scale-95 transition" title="Edit">
                        <PencilSquareIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                      <button onClick={() => onDelete(p)} className="p-1.5 sm:p-2 rounded-lg text-red-600 hover:bg-red-50 active:scale-95 transition" title="Delete">
                        <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                      <button onClick={() => Swal.fire({ title: "Book visit", text: `Booking flow for ${p.name} coming soon.`, icon: "info", confirmButtonColor: "#2563eb" })} className="p-1.5 sm:p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 active:scale-95 transition" title="Book Visit">
                        <CalendarDaysIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2 sm:mt-0">
                    <button
                      onClick={() => { setViewing(p); setViewOpen(true); }}
                      className="p-1.5 sm:p-2 rounded-lg text-neutral-700 hover:bg-neutral-100 active:scale-95 transition"
                      title="View"
                      aria-label="View"
                    >
                      <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-full bg-neutral-50 text-neutral-600 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] ring-1 ring-neutral-200 whitespace-nowrap">ID #{p.id}</span>
                      {p.gender && (
                        <span className={`inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] capitalize ring-1 shadow-sm whitespace-nowrap ${p.gender === 'male' ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-pink-50 text-pink-700 ring-pink-200'}`}>{p.gender}</span>
                      )}
                      {typeof p.weight === 'number' && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] ring-1 ring-emerald-200 whitespace-nowrap">{p.weight} kg</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {ownerId && (
        <AddPetModal
          ownerId={ownerId}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={(pet: Pet) => {
            setPets((prev) => [pet, ...prev]);
          }}
        />
      )}
      {editing && (
        <EditPetModal
          open={editOpen}
          pet={editing as any}
          onClose={() => setEditOpen(false)}
          onUpdated={(updated: Pet) => {
            setPets((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setEditing(updated);
            setEditOpen(false);
            try { supabase.from('notifications').insert({ title:'Pet updated', message:`${updated.name} profile was updated`, notification_type:'system' }); } catch {}
          }}
        />
      )}
      {viewing && (
        <ViewPetModal
          open={viewOpen}
          pet={viewing as any}
          onClose={() => setViewOpen(false)}
        />
      )}
    </div>
  );
}
