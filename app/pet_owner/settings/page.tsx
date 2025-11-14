"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { swalConfirmColor } from "../../../lib/ui/tokens";
import { CheckCircleIcon, IdentificationIcon, BellAlertIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

export default function OwnerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // pet_owner_profiles
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // auth user metadata preferences
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefPush, setPrefPush] = useState(true);
  const [prefReminders, setPrefReminders] = useState(true);
  const [prefMarketing, setPrefMarketing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          await Swal.fire({ icon: "warning", title: "Sign in required", confirmButtonColor: swalConfirmColor });
          return;
        }
        const { data: owner } = await supabase
          .from("pet_owner_profiles")
          .select("id,full_name,phone,address,profile_picture_url")
          .eq("user_id", user.id)
          .maybeSingle();
        if (owner) {
          setOwnerId(owner.id as unknown as number);
          setFullName((owner as any).full_name || "");
          setPhone((owner as any).phone || "");
          setAddress((owner as any).address || "");
          setAvatarUrl((owner as any).profile_picture_url || null);
          try { if ((owner as any).profile_picture_url) localStorage.setItem("po_avatar_url", (owner as any).profile_picture_url); } catch {}
        }
        const md = (user.user_metadata || {}) as any;
        setPrefEmail(md.notifications_email !== false);
        setPrefPush(md.notifications_push !== false);
        setPrefReminders(md.reminders_enabled !== false);
        setPrefMarketing(md.marketing_opt_in === true);
      } catch (e: any) {
        await Swal.fire({ icon: "error", title: "Failed to load", text: e?.message, confirmButtonColor: swalConfirmColor });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveProfile = async () => {
    if (!ownerId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("pet_owner_profiles")
        .update({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ownerId);
      if (error) throw error;
      await Swal.fire({ icon: "success", title: "Profile updated", confirmButtonColor: swalConfirmColor });
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "Update failed", text: e?.message, confirmButtonColor: swalConfirmColor });
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!ownerId) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `owners/${ownerId}/${Date.now()}.${ext}`;
    try {
      const { error: upErr } = await supabase.storage.from('profile-images').upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('profile-images').getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase.from('pet_owner_profiles').update({ profile_picture_url: url, updated_at: new Date().toISOString() }).eq('id', ownerId);
      if (updErr) throw updErr;
      setAvatarUrl(url);
      try { localStorage.setItem('po_avatar_url', url); } catch {}
      try { window.dispatchEvent(new CustomEvent('po_avatar_updated', { detail: url })); } catch {}
      await Swal.fire({ icon: 'success', title: 'Profile picture updated', confirmButtonColor: swalConfirmColor });
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Upload failed', text: e?.message, confirmButtonColor: swalConfirmColor });
    }
  };

  const removeAvatar = async () => {
    if (!ownerId) return;
    const res = await Swal.fire({ icon: 'warning', title: 'Remove profile picture?', showCancelButton: true, confirmButtonColor: swalConfirmColor });
    if (!res.isConfirmed) return;
    try {
      const { error } = await supabase.from('pet_owner_profiles').update({ profile_picture_url: null, updated_at: new Date().toISOString() }).eq('id', ownerId);
      if (error) throw error;
      setAvatarUrl(null);
      try { localStorage.removeItem('po_avatar_url'); } catch {}
      try { window.dispatchEvent(new CustomEvent('po_avatar_updated', { detail: null })); } catch {}
      await Swal.fire({ icon: 'success', title: 'Removed', confirmButtonColor: swalConfirmColor });
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Failed', text: e?.message, confirmButtonColor: swalConfirmColor });
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          notifications_email: prefEmail,
          notifications_push: prefPush,
          reminders_enabled: prefReminders,
          marketing_opt_in: prefMarketing,
        },
      });
      if (error) throw error;
      await Swal.fire({ icon: "success", title: "Preferences saved", confirmButtonColor: swalConfirmColor });
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "Save failed", text: e?.message, confirmButtonColor: swalConfirmColor });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    const res = await Swal.fire({
      title: "Change Password",
      input: "password",
      inputLabel: "New password",
      inputAttributes: { autocapitalize: "off", autocomplete: "new-password" },
      showCancelButton: true,
      confirmButtonColor: swalConfirmColor,
    });
    if (!res.isConfirmed || !res.value) return;
    try {
      const { error } = await supabase.auth.updateUser({ password: res.value });
      if (error) throw error;
      await Swal.fire({ icon: "success", title: "Password updated", confirmButtonColor: swalConfirmColor });
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "Failed to update password", text: e?.message, confirmButtonColor: swalConfirmColor });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white grid place-items-center">
            <IdentificationIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-semibold text-neutral-900">Owner Settings</div>
            <div className="text-sm text-neutral-500">Manage profile, notifications and security</div>
          </div>
        </div>
        <div className="hidden sm:block text-xs text-neutral-500 inline-flex items-center gap-1">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600" /> Secure & synced
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Avatar */}
        <section className="rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-900">Profile Picture</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-2xl overflow-hidden ring-1 ring-neutral-200 bg-neutral-100 grid place-items-center text-neutral-600">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-sm">No photo</span>}
            </div>
            <div className="space-x-2">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-sm cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return; if (f.size > 5 * 1024 * 1024) { Swal.fire({ icon: 'error', title: 'Max 5MB', confirmButtonColor: swalConfirmColor }); return; }
                  uploadAvatar(f);
                }} />
                Upload
              </label>
              {avatarUrl && (
                <button onClick={removeAvatar} className="px-4 py-2 rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-sm">Remove</button>
              )}
            </div>
          </div>
        </section>
        {/* Profile */}
        <section className="rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <IdentificationIcon className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-neutral-900">Profile</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-neutral-600 mb-1">Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button disabled={saving || loading} onClick={saveProfile} className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-60">Save Profile</button>
          </div>
        </section>

        {/* Security */}
        <section className="rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-neutral-900">Security</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={changePassword} className="px-4 py-2 rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-sm">Change password</button>
            <button onClick={async () => {
              const res = await Swal.fire({ title: "Sign out of all sessions?", icon: "warning", showCancelButton: true, confirmButtonColor: swalConfirmColor });
              if (!res.isConfirmed) return;
              try {
                const { error } = await supabase.auth.signOut({ scope: "global" as any });
                if (error) throw error;
                await Swal.fire({ icon: "success", title: "Signed out everywhere", confirmButtonColor: swalConfirmColor });
              } catch (e: any) {
                await Swal.fire({ icon: "error", title: "Failed", text: e?.message, confirmButtonColor: swalConfirmColor });
              }
            }} className="px-4 py-2 rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-sm">Sign out all sessions</button>
            <button onClick={async () => {
              const res = await Swal.fire({
                title: 'Delete account?',
                html: "<div style='text-align:left'>This permanently deletes your account and owner profile. Type <b>DELETE</b> to confirm.</div>",
                input: 'text',
                inputPlaceholder: 'Type DELETE',
                showCancelButton: true,
                confirmButtonColor: swalConfirmColor,
              });
              if (!res.isConfirmed || String(res.value).trim().toUpperCase() !== 'DELETE') return;
              try {
                const { data: sess } = await supabase.auth.getSession();
                const token = sess.session?.access_token;
                const userId = sess.session?.user.id;
                if (!token || !userId) { await Swal.fire({ icon:'error', title:'Not signed in' }); return; }
                const resp = await fetch('/api/delete-account', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ user_id: userId }) });
                if (!resp.ok) {
                  const text = await resp.text();
                  throw new Error(text || `HTTP ${resp.status}`);
                }
                await Swal.fire({ icon:'success', title:'Account deleted' });
                window.location.href = '/';
              } catch (e:any) {
                await Swal.fire({ icon:'error', title:'Deletion failed', text: e?.message || 'Please try again.' });
              }
            }} className="px-4 py-2 rounded-xl bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100 text-sm">Delete account</button>
          </div>
        </section>
      </div>
    </div>
  );
}
