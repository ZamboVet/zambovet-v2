"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  EllipsisHorizontalIcon,
  UserIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  EyeIcon,
  PencilSquareIcon,
  AdjustmentsHorizontalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

type Role = "pet_owner" | "veterinarian" | "admin";
type Status = "active" | "suspended";

type U = { id: string; name: string; email: string; role: Role; status: Status; created_at?: string | null };

const PRIMARY = "#2563eb";

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const [status, setStatus] = useState<Status | "all">("all");
  const [sort, setSort] = useState<"name" | "email" | "role">("name");
  const [view, setView] = useState<"Cards" | "table">("Cards");
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    (async()=>{ try { const { data } = await supabase.auth.getUser(); setAdminId(data.user?.id ?? null); } catch {} })();
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id,email,full_name,user_role,is_active,created_at")
          .order("full_name", { ascending: true });
        if (error) throw error;
        const mapped: U[] = (data || []).map((p: any) => ({
          id: p.id,
          name: p.full_name || p.email || "Unnamed",
          email: p.email,
          role: (p.user_role as Role),
          status: p.is_active ? "active" : "suspended",
          created_at: p.created_at || null,
        }));
        setUsers(mapped);
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Failed to load users", text: err?.message || "Please try again." });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const viewUser = async (u: U) => {
    const joined = u.created_at ? new Date(u.created_at).toLocaleDateString() : "-";
    const html = `
      <div class='text-left font-[Poppins]'>
        <div class='flex items-start gap-3'>
          <div class='w-11 h-11 rounded-xl bg-blue-50 text-blue-700 grid place-items-center text-sm font-semibold'>${(u.name||u.email||"?").slice(0,1).toUpperCase()}</div>
          <div class='min-w-0'>
            <div class='font-semibold' style='color:${PRIMARY}'>${u.name || u.email}</div>
            <div class='text-xs text-gray-500'>${u.email}</div>
          </div>
        </div>
        <div class='mt-3 grid grid-cols-1 gap-2 text-sm'>
          <div><b>Role</b>: <span id='vu_role_text'>${u.role}</span></div>
          <div><b>Status</b>: <span id='vu_status_text'>${u.status}</span></div>
          <div class='grid grid-cols-2 gap-2'>
            <div><b>Joined</b>: ${joined}</div>
            <div><b>Last login</b>: -</div>
          </div>
          <div><b>Status history</b>: -</div>
        </div>
        <hr class='my-3'/>
        <div class='flex flex-wrap items-center gap-2'>
          <label class='text-xs text-gray-500'>Change role</label>
          <select id='vu_role' class='px-2 py-1 rounded-full text-xs ring-1 ring-gray-200'>
            <option value='pet_owner' ${u.role==='pet_owner'?'selected':''}>Pet Owner</option>
            <option value='veterinarian' ${u.role==='veterinarian'?'selected':''}>Veterinarian</option>
            <option value='admin' ${u.role==='admin'?'selected':''}>Admin</option>
          </select>
          <button id='vu_apply_role' class='px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 text-xs'>Apply</button>
          <span class='flex-1'></span>
          <button id='vu_toggle_status' class='px-3 py-1.5 rounded-lg ${u.status==='active'?'bg-rose-50 text-rose-700 hover:bg-rose-100':'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'} text-xs'>${u.status==='active'?'Suspend':'Activate'}</button>
          <a href='mailto:${u.email}' class='px-3 py-1.5 rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-xs'>Send Email</a>
        </div>
      </div>`;
    await Swal.fire({ title: "User Details", html, width: 640, confirmButtonText: "Close", customClass: { popup: "font-[Poppins]" }, didOpen: () => {
      const roleSel = document.getElementById('vu_role') as HTMLSelectElement | null;
      const applyBtn = document.getElementById('vu_apply_role');
      const toggleBtn = document.getElementById('vu_toggle_status');
      const toast = Swal.mixin({ toast: true, position: 'top', timer: 1200, showConfirmButton: false });
      applyBtn?.addEventListener('click', async () => {
        const next = (roleSel?.value || u.role) as Role;
        if (next === u.role) { toast.fire({ icon:'info', title:'No change' }); return; }
        await setUserRole(u.id, next);
        (document.getElementById('vu_role_text') as HTMLElement | null)!.textContent = next;
      });
      toggleBtn?.addEventListener('click', async () => {
        await toggleUserStatus(u.id);
        (document.getElementById('vu_status_text') as HTMLElement | null)!.textContent = u.status === 'active' ? 'suspended' : 'active';
      });
    }});
  };

  const filtered = useMemo(() => {
    const f = users.filter(u =>
      (role === "all" || u.role === role) &&
      (status === "all" || u.status === status) &&
      (q.trim() === "" || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))
    );
    const s = [...f].sort((a,b)=>{
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "email") return a.email.localeCompare(b.email);
      return a.role.localeCompare(b.role);
    });
    return s;
  }, [q, role, status, sort, users]);

  const [tableQ, setTableQ] = useState("");
  const [tableRole, setTableRole] = useState<Role | "all">("all");
  const [tableStatus, setTableStatus] = useState<Status | "all">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [tableSort, setTableSort] = useState<"name" | "email" | "role">("name");
  const [tableSortDir, setTableSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const tableFiltered = useMemo(() => {
    const f = filtered.filter(u =>
      (tableRole === "all" || u.role === tableRole) &&
      (tableStatus === "all" || u.status === tableStatus) &&
      (tableQ.trim()==="" || u.name.toLowerCase().includes(tableQ.toLowerCase()) || u.email.toLowerCase().includes(tableQ.toLowerCase()))
    );
    const s = [...f].sort((a,b)=>{
      const dir = tableSortDir === "asc" ? 1 : -1;
      const val = tableSort === "name" ? a.name.localeCompare(b.name) : tableSort === "email" ? a.email.localeCompare(b.email) : a.role.localeCompare(b.role);
      return val * dir;
    });
    return s;
  }, [filtered, tableQ, tableRole, tableStatus, tableSort, tableSortDir]);
  const totalPages = Math.max(1, Math.ceil(tableFiltered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, tableFiltered.length);
  const pageRows = tableFiltered.slice(pageStart, pageEnd);

  const rolePill = (r: Role) => {
    if (r === "admin") return "bg-purple-100 text-purple-700";
    if (r === "veterinarian") return "bg-emerald-100 text-emerald-700";
    return "bg-blue-100 text-blue-700";
  };

  const statusPill = (s: Status) => (s === "active" ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700");
  const roleIcon = (r: Role) => r === "admin" ? <ShieldCheckIcon className="w-3.5 h-3.5"/> : r === "veterinarian" ? <AcademicCapIcon className="w-3.5 h-3.5"/> : <UserIcon className="w-3.5 h-3.5"/>;

  const setUserRole = async (id: string, r: Role) => {
    const res = await Swal.fire({ icon: "question", title: "Change role?", text: "This will update the user's role.", showCancelButton: true, confirmButtonText: "Update" });
    if (!res.isConfirmed) return;
    const { error } = await supabase.from("profiles").update({ user_role: r }).eq("id", id);
    if (error) { await Swal.fire({ icon: "error", title: "Update failed", text: error.message }); return; }
    setUsers(us => us.map(u => u.id===id?{...u, role: r}:u));
    try { await supabase.from('notifications').insert({ title: 'User role updated', message: `User #${id} role set to ${r}`, notification_type: 'admin', user_id: adminId }); } catch {}
    await Swal.fire({ icon: "success", title: "Role updated" });
  };
  const toggleUserStatus = async (id: string) => {
    const target = users.find(u=>u.id===id);
    if (!target) return;
    const next = target.status === 'active' ? false : true;
    const res = await Swal.fire({ icon: "warning", title: target.status==='active'?"Suspend user?":"Activate user?", showCancelButton: true, confirmButtonText: "Confirm" });
    if (!res.isConfirmed) return;
    const { error } = await supabase.from("profiles").update({ is_active: next }).eq("id", id);
    if (error) { await Swal.fire({ icon: "error", title: "Update failed", text: error.message }); return; }
    setUsers(us => us.map(u => u.id===id?{...u, status: next?"active":"suspended"}:u));
    try { await supabase.from('notifications').insert({ title: 'User status updated', message: `User #${id} ${next?'activated':'suspended'}`, notification_type: 'admin', user_id: adminId }); } catch {}
    await Swal.fire({ icon: "success", title: "Status updated" });
  };

  const editUser = async (user: U) => {
    const html = `
      <div class='text-left font-[Poppins] space-y-3'>
        <div>
          <label class='text-xs text-gray-500'>Full name</label>
          <input id='eu_fullname' type='text' class='w-full mt-1 px-3 py-2 bg-white ring-1 ring-gray-200 rounded-lg text-sm' value='${(user.name || '').replace(/'/g, "&#39;")}' />
        </div>
        <div>
          <label class='text-xs text-gray-500'>Email</label>
          <input id='eu_email' type='email' class='w-full mt-1 px-3 py-2 bg-white ring-1 ring-gray-200 rounded-lg text-sm' value='${(user.email || '').replace(/'/g, "&#39;")}' />
        </div>
        <p class='text-[11px] text-gray-500'>Role and status can be changed from quick actions.</p>
      </div>`;
    const res = await Swal.fire({
      title: 'Edit User',
      html,
      width: 560,
      showCancelButton: true,
      confirmButtonText: 'Save',
      customClass: { popup: 'font-[Poppins]' },
      preConfirm: () => {
        const fullName = (document.getElementById('eu_fullname') as HTMLInputElement | null)?.value?.trim() || '';
        const email = (document.getElementById('eu_email') as HTMLInputElement | null)?.value?.trim() || '';
        if (!email) {
          Swal.showValidationMessage('Email is required');
          return;
        }
        return { fullName, email };
      }
    });
    if (!res.isConfirmed) return;
    const { fullName, email } = res.value as { fullName: string; email: string };
    const { error } = await supabase.from('profiles').update({ full_name: fullName || null, email }).eq('id', user.id);
    if (error) { await Swal.fire({ icon: 'error', title: 'Save failed', text: error.message }); return; }
    setUsers(us => us.map(u => u.id===user.id ? { ...u, name: fullName || email, email } : u));
    try { await supabase.from('notifications').insert({ title: 'User profile updated', message: `User #${user.id} profile updated`, notification_type: 'admin', user_id: adminId }); } catch {}
    await Swal.fire({ icon: 'success', title: 'Saved' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>User Management</h1>
          <p className="text-sm text-gray-500">Manage roles, access, and account states</p>
        </div>
        <div className="flex items-center gap-2">
          {view === "Cards" && (
            <>
              {/* Search bar removed */}
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-white ring-1 ring-black/5 px-3 py-2">
                <span className="text-xs text-gray-500">Sort</span>
                <select value={sort} onChange={(e)=>setSort(e.target.value as 'name' | 'email' | 'role')} className="text-sm bg-transparent outline-none">
                  <option value="name">Name</option>
                  <option value="email">Email</option>
                  <option value="role">Role</option>
                </select>
              </div>
            </>
          )}
          {/* Add User button removed */}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-xl font-bold" style={{ color: PRIMARY }}>{users.length}</div>
          </div>
          <span className="w-9 h-9 rounded-xl grid place-items-center bg-blue-50 text-blue-700">
            <UsersIcon className="w-5 h-5" />
          </span>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Owners</div>
            <div className="text-xl font-bold" style={{ color: PRIMARY }}>{users.filter(u=>u.role==='pet_owner').length}</div>
          </div>
          <span className="w-9 h-9 rounded-xl grid place-items-center bg-indigo-50 text-indigo-700">
            <UserIcon className="w-5 h-5" />
          </span>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Vets</div>
            <div className="text-xl font-bold" style={{ color: PRIMARY }}>{users.filter(u=>u.role==='veterinarian').length}</div>
          </div>
          <span className="w-9 h-9 rounded-xl grid place-items-center bg-emerald-50 text-emerald-700">
            <AcademicCapIcon className="w-5 h-5" />
          </span>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Admins</div>
            <div className="text-xl font-bold" style={{ color: PRIMARY }}>{users.filter(u=>u.role==='admin').length}</div>
          </div>
          <span className="w-9 h-9 rounded-xl grid place-items-center bg-purple-50 text-purple-700">
            <ShieldCheckIcon className="w-5 h-5" />
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-white ring-1 ring-black/5 overflow-hidden">
          {(["all","pet_owner","veterinarian","admin"] as const).map(r => (
            <button key={r} onClick={()=>setRole(r as Role|"all")} className={`px-3 py-1.5 text-sm ${role===r?"bg-blue-600 text-white":"text-gray-700 hover:bg-blue-50"}`}>{r === "all" ? "All" : r.toUpperCase()}</button>
          ))}
        </div>
        <div className="inline-flex rounded-full bg-white ring-1 ring-black/5 overflow-hidden">
          {(["all","active","suspended"] as const).map(s => (
            <button key={s} onClick={()=>setStatus(s as Status|"all")} className={`px-3 py-1.5 text-sm ${status===s?"bg-emerald-600 text-white":"text-gray-700 hover:bg-emerald-50"}`}>{s === "all" ? "All Status" : s}</button>
          ))}
        </div>
        <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white ring-1 ring-black/5 text-sm hover:bg-gray-50">
          <FunnelIcon className="w-4 h-4 text-gray-500" />
          Filters
        </button>
        <div className="ml-auto inline-flex rounded-full bg-white ring-1 ring-black/5 overflow-hidden">
          {(["Cards","table"] as const).map(v => (
            <button key={v} onClick={()=>setView(v)} className={`px-3 py-1.5 text-sm ${view===v?"bg-gray-900 text-white":"text-gray-700 hover:bg-gray-100"}`}>{v}</button>
          ))}
        </div>
      </div>

      {view === "Cards" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(loading ? Array.from({length:8}).map((_,i)=>({id:`sk${i}`,name:"",email:"",role:"pet_owner" as Role,status:"active" as Status})) : filtered).map((u, i) => (
            <div key={u.id} className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 hover:shadow-md hover:-translate-y-0.5 transition" style={{ transitionDelay: `${i*30}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 grid place-items-center text-sm font-semibold ring-1 ring-black/5 transition-transform group-hover:scale-105">
                    {u.name ? u.name.split(" ")[0][0] : "?"}
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2" style={{ color: PRIMARY }}>
                      {u.name || "Loading"}
                      {!loading && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${rolePill(u.role)} inline-flex items-center gap-1`}>{roleIcon(u.role)} {u.role.toUpperCase()}</span>}
                    </div>
                    <div className="text-xs text-gray-500 inline-flex items-center gap-1"><EnvelopeIcon className="w-3.5 h-3.5" />{u.email || ""}</div>
                  </div>
                </div>
                {/* kebab removed (no actions) */}
              </div>
              <div className="mt-3 flex items-center gap-2">
                {!loading && (
                  <>
                    <select value={u.role} onChange={e=>setUserRole(u.id, e.target.value as Role)} className={`px-2 py-1 rounded-full text-xs font-medium ${rolePill(u.role)} bg-transparent`}> 
                      <option value="pet_owner">PET OWNER</option>
                      <option value="veterinarian">VETERINARIAN</option>
                      <option value="admin">ADMIN</option>
                    </select>
                    <button onClick={()=>toggleUserStatus(u.id)} className={`px-2 py-1 rounded-full text-xs font-medium ${statusPill(u.status)} inline-flex items-center gap-1 transition-colors`}>
                      <span className={`w-2 h-2 rounded-full ${u.status==='active'?'bg-green-500 animate-pulse':'bg-rose-500'}`} />
                      {u.status}
                    </button>
                  </>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button onClick={()=>viewUser(u)} className="px-3 py-2 rounded-xl bg-gray-50 text-sm hover:bg-blue-50 active:scale-[.98] transition inline-flex items-center gap-2" style={{ color: PRIMARY }}>
                  <EyeIcon className="w-4 h-4" /> 
                </button>
                <button onClick={()=>editUser(u)} className="px-3 py-2 rounded-xl bg-gray-50 text-sm hover:bg-blue-50 active:scale-[.98] transition inline-flex items-center gap-2" style={{ color: PRIMARY }}>
                  <PencilSquareIcon className="w-4 h-4" /> 
                </button>
                <button className={`px-3 py-2 rounded-xl text-sm ${u.status==='active'?"bg-rose-50 text-rose-700 hover:bg-rose-100":"bg-emerald-50 text-emerald-700 hover:bg-emerald-100"} active:scale-[.98] transition`} onClick={()=>toggleUserStatus(u.id)}>
                  {u.status==='active'?"Suspend":"Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 p-4 bg-white border-b">
            {/* Table search bar removed */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-black/5 px-3 py-2">
              <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-500" />
              <select value={tableRole} onChange={e=>{ setTableRole(e.target.value as Role | 'all'); setPage(1); }} className="text-sm bg-transparent outline-none">
                <option value="all">All roles</option>
                <option value="pet_owner">Owner</option>
                <option value="veterinarian">Vet</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-black/5 px-3 py-2">
              <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-500" />
              <select value={tableStatus} onChange={e=>{ setTableStatus(e.target.value as Status | 'all'); setPage(1); }} className="text-sm bg-transparent outline-none">
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="ml-auto inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-black/5 px-3 py-2">
              <span className="text-xs text-gray-500">Rows</span>
              <select value={pageSize} onChange={e=>{ setPageSize(parseInt(e.target.value,10)); setPage(1); }} className="text-sm bg-transparent outline-none">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            <div className="grid gap-2 px-4 py-3 text-xs font-medium text-gray-600 bg-gray-50/80 sticky top-0 z-10 backdrop-blur"
                 style={{ gridTemplateColumns: "3fr 3fr 2fr 2fr 1fr" }}>
              <button className="text-left inline-flex items-center gap-1" onClick={()=>{ setTableSort(s=> s==='name'?'name':'name'); setTableSortDir(d=> tableSort==='name' ? (d==='asc'?'desc':'asc') : 'asc'); }}>
                User {tableSort==='name' ? (tableSortDir==='asc'?'▲':'▼') : ''}
              </button>
              <button className="text-left inline-flex items-center gap-1" onClick={()=>{ setTableSort('email'); setTableSortDir(d=> tableSort==='email' ? (d==='asc'?'desc':'asc') : 'asc'); }}>
                Email {tableSort==='email' ? (tableSortDir==='asc'?'▲':'▼') : ''}
              </button>
              <button className="text-left inline-flex items-center gap-1" onClick={()=>{ setTableSort('role'); setTableSortDir(d=> tableSort==='role' ? (d==='asc'?'desc':'asc') : 'asc'); }}>
                Role {tableSort==='role' ? (tableSortDir==='asc'?'▲':'▼') : ''}
              </button>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
          {loading ? (
            Array.from({length: Math.min(6, pageSize)}).map((_,i)=>(
              <div key={`sk${i}`} className="grid gap-2 px-4 py-3 items-center border-t text-sm animate-pulse" style={{ gridTemplateColumns: "3fr 3fr 2fr 2fr 1fr" }}>
                <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-gray-200"/><div className="flex-1 h-4 bg-gray-200 rounded"/></div>
                <div><div className="h-4 bg-gray-200 rounded"/></div>
                <div><div className="h-6 bg-gray-200 rounded-full"/></div>
                <div><div className="h-6 bg-gray-200 rounded-full"/></div>
                <div className="flex justify-end"><div className="w-16 h-6 bg-gray-200 rounded"/></div>
              </div>
            ))
          ) : pageRows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-600">No users found. Try adjusting filters or add a new user.</div>
          ) : (
          pageRows.map(u => (
            <div key={u.id} className="grid gap-2 px-4 py-3 items-center border-t text-sm hover:bg-blue-50/30 transition even:bg-gray-50/20"
                 style={{ gridTemplateColumns: "3fr 3fr 2fr 2fr 1fr" }} tabIndex={0}
                 onKeyDown={(e)=>{ if (e.key==='Enter' || e.key===' ') { e.preventDefault(); viewUser(u); } }}
                 onClick={()=>viewUser(u)}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 grid place-items-center text-xs font-semibold">{u.name.split(" ")[0][0]}</div>
                <div className="min-w-0">
                  <div className="font-medium truncate" style={{ color: PRIMARY }}>{u.name}</div>
                </div>
              </div>
              <div className="text-gray-600 truncate min-w-0" title={u.email}>{u.email}</div>
              <div>
                <select onClick={(e)=>e.stopPropagation()} value={u.role} onChange={e=>setUserRole(u.id, e.target.value as Role)} className={`px-2 py-1 rounded-full text-xs font-medium ${rolePill(u.role)} bg-transparent`}>
                  <option value="pet_owner">PET OWNER</option>
                  <option value="veterinarian">VETERINARIAN</option>
                  <option value="admin">ADMIN</option>
                </select>
              </div>
              <div>
                <button onClick={()=>toggleUserStatus(u.id)} className={`px-2 py-1 rounded-full text-xs font-medium ${statusPill(u.status)} inline-flex items-center gap-1 transition-colors`}>
                  <span className={`w-2 h-2 rounded-full ${u.status==='active'?'bg-green-500 animate-pulse':'bg-rose-500'}`} />
                  {u.status}
                </button>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={(e)=>{ e.stopPropagation(); editUser(u); }} className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-blue-50 text-xs inline-flex items-center gap-1" style={{ color: PRIMARY }}>
                  <PencilSquareIcon className="w-4 h-4" /> Edit
                </button>
              </div>
            </div>
          )))}
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-white">
            <div className="text-xs text-gray-500">Showing {tableFiltered.length === 0 ? 0 : pageStart + 1}–{pageEnd} of {tableFiltered.length}</div>
            <div className="inline-flex items-center gap-2">
              <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 disabled:opacity-50 inline-flex items-center gap-1" style={{ color: PRIMARY }}>
                <ChevronLeftIcon className="w-4 h-4" /> Prev
              </button>
              <div className="text-xs text-gray-600">Page {page} / {totalPages}</div>
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 disabled:opacity-50 inline-flex items-center gap-1" style={{ color: PRIMARY }}>
                Next <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
