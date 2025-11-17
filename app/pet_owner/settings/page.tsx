"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { swalConfirmColor } from "../../../lib/ui/tokens";
import { CheckCircleIcon, IdentificationIcon, BellAlertIcon, ShieldCheckIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

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
          full_name: fullName.trim() || "",
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

  const restoreToDefaults = async () => {
    const res = await Swal.fire({
      title: "Restore to Default?",
      html: "<div style='text-align:left'>This will reset all your settings to their default values:<br/><br/>" +
            "• Profile information (name, phone, address) will be cleared<br/>" +
            "• Profile picture will be removed<br/>" +
            "• Notification preferences will be reset to defaults<br/><br/>" +
            "This action cannot be undone. Continue?</div>",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, restore defaults",
      cancelButtonText: "Cancel",
      confirmButtonColor: swalConfirmColor,
    });

    if (!res.isConfirmed) return;

    setSaving(true);
    try {
      // Reset profile fields to empty/null
      if (ownerId) {
        const { error: profileError } = await supabase
          .from("pet_owner_profiles")
          .update({
            full_name: "",
            phone: null,
            address: null,
            profile_picture_url: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ownerId);
        if (profileError) throw profileError;

        // Update local state
        setFullName("");
        setPhone("");
        setAddress("");
        setAvatarUrl(null);
        try {
          localStorage.removeItem("po_avatar_url");
        } catch {}
        try {
          window.dispatchEvent(new CustomEvent("po_avatar_updated", { detail: null }));
        } catch {}
      }

      // Reset notification preferences to defaults
      const { error: prefError } = await supabase.auth.updateUser({
        data: {
          notifications_email: true,
          notifications_push: true,
          reminders_enabled: true,
          marketing_opt_in: false,
        },
      });
      if (prefError) throw prefError;

      // Update local state
      setPrefEmail(true);
      setPrefPush(true);
      setPrefReminders(true);
      setPrefMarketing(false);

      await Swal.fire({
        icon: "success",
        title: "Settings Restored",
        text: "All settings have been reset to their default values.",
        confirmButtonColor: swalConfirmColor,
      });
    } catch (e: any) {
      await Swal.fire({
        icon: "error",
        title: "Restore Failed",
        text: e?.message || "Failed to restore settings. Please try again.",
        confirmButtonColor: swalConfirmColor,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      <div className="rounded-lg sm:rounded-2xl md:rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-3 sm:p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-blue-600 text-white grid place-items-center flex-shrink-0">
            <IdentificationIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-semibold text-neutral-900 truncate">Owner Settings</div>
            <div className="text-xs sm:text-sm text-neutral-500 truncate">Manage profile, notifications and security</div>
          </div>
        </div>
        <div className="hidden sm:flex text-[10px] sm:text-xs text-neutral-500 items-center gap-1">
          <CheckCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" /> <span>Secure & synced</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        {/* Avatar */}
        <section className="rounded-lg sm:rounded-2xl md:rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm sm:text-base text-neutral-900">Profile Picture</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl sm:rounded-2xl overflow-hidden ring-1 ring-neutral-200 bg-neutral-100 grid place-items-center text-neutral-600 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-xs sm:text-sm">No photo</span>}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <label className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-xs sm:text-sm cursor-pointer active:scale-95">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return; if (f.size > 5 * 1024 * 1024) { Swal.fire({ icon: 'error', title: 'Max 5MB', confirmButtonColor: swalConfirmColor }); return; }
                  uploadAvatar(f);
                }} />
                Upload
              </label>
              {avatarUrl && (
                <button onClick={removeAvatar} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-xs sm:text-sm active:scale-95">Remove</button>
              )}
            </div>
          </div>
        </section>
        {/* Profile */}
        <section className="rounded-lg sm:rounded-2xl md:rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <IdentificationIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span className="font-semibold text-sm sm:text-base text-neutral-900">Profile</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm text-neutral-600 mb-1">Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm text-neutral-600 mb-1">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm text-neutral-600 mb-1">Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <button disabled={saving || loading} onClick={saveProfile} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs sm:text-sm font-medium disabled:opacity-60 active:scale-95">Save Profile</button>
          </div>
        </section>

        {/* Security */}
        <section className="rounded-lg sm:rounded-2xl md:rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            <span className="font-semibold text-sm sm:text-base text-neutral-900">Security</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
            <button onClick={changePassword} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-xs sm:text-sm active:scale-95">Change password</button>
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
            }} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-xs sm:text-sm active:scale-95">Sign out all sessions</button>
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
            }} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100 text-xs sm:text-sm active:scale-95">Delete account</button>
          </div>
        </section>

        {/* Reset Options */}
        <section className="rounded-lg sm:rounded-2xl md:rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            <span className="font-semibold text-sm sm:text-base text-neutral-900">Reset Options</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3">
            <button
              onClick={restoreToDefaults}
              disabled={saving || loading}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 text-xs sm:text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
            >
              Restore to Default
            </button>
            <p className="text-[10px] sm:text-xs text-neutral-500 flex-1">
              Reset all profile information, preferences, and remove profile picture to default values
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
