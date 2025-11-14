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
  const d = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  if (years < 1) return "<1y";
  return `${years}y`;
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        <div className="rounded-2xl bg-white/70 backdrop-blur ring-1 ring-neutral-200 shadow-sm px-4 sm:px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center">
              <HeartIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-neutral-900">My Pets</h1>
              <p className="text-xs sm:text-sm text-neutral-500">Manage your pet profiles</p>
            </div>
          </div>
          <Link
            href="/pet_owner/my-pets/diary"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
          >
            <DocumentTextIcon className="w-4 h-4" /> Pet Diary
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 sticky top-2 z-10">
          <div className="rounded-2xl bg-white/80 backdrop-blur ring-1 ring-neutral-200 p-3 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
              <div className="flex-1 inline-flex items-center gap-2 rounded-xl bg-white ring-1 ring-neutral-200 px-3 py-2 shadow-sm">
                <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pets by name, species, breed…"
                  className="w-full outline-none bg-transparent text-sm"
                />
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-white ring-1 ring-neutral-200 px-3 py-2 shadow-sm">
                <FunnelIcon className="h-5 w-5 text-neutral-400" />
                <select value={speciesFilter} onChange={(e) => setSpeciesFilter(e.target.value)} className="bg-transparent text-sm outline-none">
                  {speciesOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-white ring-1 ring-neutral-200 px-3 py-2 shadow-sm">
                <ArrowsUpDownIcon className="h-5 w-5 text-neutral-400" />
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent text-sm outline-none">
                  {['Newest','Name A-Z','Name Z-A'].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-white ring-1 ring-neutral-200 px-3 py-2 shadow-sm">
                <button onClick={() => setView("grid")} className={`p-1.5 rounded-lg ${view==='grid' ? 'bg-neutral-100' : ''}`} aria-label="Grid view">
                  <Squares2X2Icon className="h-5 w-5" />
                </button>
                <button onClick={() => setView("list")} className={`p-1.5 rounded-lg ${view==='list' ? 'bg-neutral-100' : ''}`} aria-label="List view">
                  <Bars3BottomLeftIcon className="h-5 w-5" />
                </button>
              </div>
              <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 shadow-sm">
                <PlusIcon className="h-4 w-4" />
                <span>Add Pet</span>
              </button>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`sk-${i}`} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm animate-pulse">
                <div className="h-32 w-full bg-neutral-200 rounded mb-3" />
                <div className="h-3 w-40 bg-neutral-200 rounded mb-2" />
                <div className="h-3 w-24 bg-neutral-200 rounded" />
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white shadow-sm p-10 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 grid place-items-center">
              <HeartIcon className="h-6 w-6" />
            </div>
            <p className="text-neutral-700 font-medium mb-1">No pets found</p>
            <p className="text-neutral-500 text-sm mb-4">Try adjusting your search or add a new pet.</p>
            <button onClick={onAdd} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700">Add a pet</button>
          </div>
        ) : (
          <div className={`${view==='grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-3'}`}>
            {displayed.map((p) => (
              <div key={p.id} className={`group rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 ${view==='list' ? 'flex' : ''}`}>
                <div className="relative h-44 w-full bg-neutral-100">
                  {p.profile_picture_url ? (
                    <img src={p.profile_picture_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-neutral-400">No photo</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent opacity-80" />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-white/95 backdrop-blur px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 shadow-sm">{p.species}</span>
                    {p.breed && (
                      <span className="inline-flex items-center rounded-full bg-white/95 backdrop-blur px-3 py-1 text-xs font-semibold text-purple-700 ring-1 ring-purple-200 shadow-sm">{p.breed}</span>
                    )}
                  </div>
                </div>
                <div className="p-4 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-neutral-900 tracking-tight">{p.name}</p>
                      <p className="text-xs text-neutral-500">Age {ageFrom(p.date_of_birth)}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={() => onEdit(p)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition" title="Edit">
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button onClick={() => onDelete(p)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition" title="Delete">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                      <button onClick={() => Swal.fire({ title: "Book visit", text: `Booking flow for ${p.name} coming soon.`, icon: "info", confirmButtonColor: "#2563eb" })} className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 transition" title="Book Visit">
                        <CalendarDaysIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => { setViewing(p); setViewOpen(true); }}
                      className="p-2 rounded-lg text-neutral-700 hover:bg-neutral-100 transition"
                      title="View"
                      aria-label="View"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="inline-flex items-center rounded-full bg-neutral-50 text-neutral-600 px-2 py-0.5 text-[11px] ring-1 ring-neutral-200">ID #{p.id}</span>
                      {p.gender && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] capitalize ring-1 shadow-sm ${p.gender === 'male' ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-pink-50 text-pink-700 ring-pink-200'}`}>{p.gender}</span>
                      )}
                      {typeof p.weight === 'number' && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] ring-1 ring-emerald-200">{p.weight} kg</span>
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
