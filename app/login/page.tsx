"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Swal from "sweetalert2";
import { supabase } from "../../lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import { getSiteUrl } from "../../lib/utils/site";

const SITE_URL = getSiteUrl();

const PRIMARY = "#0032A0";
const SECONDARY = "#b3c7e6";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  // Helpers: safe redirects and unified post-auth routing
  const getDefaultRoute = (role?: string | null) => {
    if (role === 'admin') return '/admin';
    if (role === 'veterinarian') return '/veterinarian';
    if (role === 'pet_owner') return '/pet_owner';
    return '/';
  };
  const isSafeInternalPath = (p: string) => {
    if (!p || typeof p !== 'string') return false;
    if (!p.startsWith('/')) return false;
    if (p.startsWith('//')) return false;
    if (/^https?:/i.test(p)) return false;
    return true;
  };
  const roleAllowsPath = (role: string | null | undefined, p: string) => {
    if (!role || !p) return false;
    if (role === 'admin') return p === '/admin' || p.startsWith('/admin/');
    if (role === 'veterinarian') return p === '/veterinarian' || p.startsWith('/veterinarian/');
    if (role === 'pet_owner') return p === '/pet_owner' || p.startsWith('/pet_owner/');
    return false;
  };
  const safeResolveRedirect = (role: string | null | undefined, redirectParam?: string | null) => {
    const target = (redirectParam || '').trim();
    if (isSafeInternalPath(target) && roleAllowsPath(role, target)) return target;
    return getDefaultRoute(role || undefined);
  };
  const rejectionText = (reason?: string | null) => {
    const base = 'Your application was rejected by the admin.';
    return reason ? `${base} Reason: ${String(reason)}` : base;
  };
  const handlePostAuthRoute = async (user: any, redirectParam?: string | null) => {
    // Ensure middleware-readable cookies are set for SSR-protected routes
    try {
      const { data: sess } = await supabase.auth.getSession();
      const access_token = sess?.session?.access_token || null;
      const refresh_token = sess?.session?.refresh_token || null;
      const expires_at = sess?.session?.expires_at || null; // epoch seconds
      const expires_in = expires_at ? Math.max(1, Math.floor(expires_at - Math.floor(Date.now()/1000))) : 3600;
      if (access_token && refresh_token) {
        await fetch('/api/auth/set-cookie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token, refresh_token, expires_in }),
          credentials: 'include',
        });
      }
 
    } catch {}
    // Load profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('user_role,verification_status,is_active,email,phone')
      .eq('id', user.id)
      .maybeSingle();

    // Existing, fully configured roles
    if (prof?.user_role === 'admin') { router.replace(safeResolveRedirect('admin', redirectParam)); return; }
    if (prof?.user_role === 'veterinarian') {
      if (prof.verification_status !== 'approved') {
        await Swal.fire({ icon:'info', title:'Application under review', text:'Your veterinarian account is pending admin approval.' });
        try { await supabase.auth.signOut(); } catch {}
        return;
      }
      if (prof.is_active === false) {
        await Swal.fire({ icon:'info', title:'Account inactive', text:'Your veterinarian account is inactive. Please contact the administrator.' });
        try { await supabase.auth.signOut(); } catch {}
        return;
      }
      router.replace(safeResolveRedirect('veterinarian', redirectParam));
      return;
    }
    if (prof?.user_role === 'pet_owner') { router.replace(safeResolveRedirect('pet_owner', redirectParam)); return; }

    // No role on profile – determine application state by email
    const emailToUse = (prof as any)?.email || user.email || '';
    let appStatus: string | null = null;
    let appReason: string | null = null;
    try {
      if (emailToUse) {
        const { data: apps } = await supabase
          .from('veterinarian_applications')
          .select('status,rejection_reason,created_at')
          .ilike('email', emailToUse)
          .order('created_at', { ascending: false })
          .limit(1);
        const app = Array.isArray(apps) ? apps[0] : null;
        appStatus = app?.status || null;
        appReason = (app as any)?.rejection_reason || null;
      }
    } catch {}

    if (appStatus === 'rejected') {
      await Swal.fire({ icon:'error', title:'Application rejected', text: rejectionText(appReason) });
      try { await supabase.auth.signOut(); } catch {}
      return;
    }
    if (appStatus === 'pending') {
      await Swal.fire({ icon:'info', title:'Application under review', text: 'Your veterinarian account is pending admin approval.' });
      try { await supabase.auth.signOut(); } catch {}
      return;
    }

    // Auto-provision as pet owner
    const payload = {
      id: user.id,
      email: user.email || emailToUse,
      full_name: (user.user_metadata as any)?.full_name || user.email || '',
      user_role: 'pet_owner' as const,
      verification_status: 'approved' as const,
    };
    try {
      await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      const { data: existingPO } = await supabase.from('pet_owner_profiles').select('id').eq('user_id', user.id).maybeSingle();
      if (!existingPO) {
        await supabase.from('pet_owner_profiles').insert({ user_id: user.id, full_name: payload.full_name });
      }
    } catch (err: any) {
      await Swal.fire({ icon:'error', title:'Login failed', text: err?.message || 'Unable to create your profile.' });
      return;
    }
    router.replace(safeResolveRedirect('pet_owner', redirectParam));
  };

  // If already signed in (e.g., after OAuth redirect), ensure profile and route
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Wait for Supabase to process OAuth redirect
        await new Promise(r => setTimeout(r, 500));
        if (!isMounted) return;
        
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user || !isMounted) return;
        const redirectParam = searchParams?.get('redirect');
        await handlePostAuthRoute(user, redirectParam);
      } catch (e: any) {
        if (!isMounted) return;
        const msg = (e?.message || "").toString();
        if (/Refresh Token Not Found/i.test(msg)) {
          try { await supabase.auth.signOut(); } catch {}
          await Swal.fire({ icon: "info", title: "Session expired", text: "Please sign in again." });
        }
      }
    })();
    return () => { isMounted = false; };
  }, [router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      await Swal.fire({ icon: "warning", title: "Incomplete", text: "Please enter your email and password." });
      return;
    }
    try {
      setLoading(true);
      // Clear any stale/broken session to avoid refresh token errors
      try { await supabase.auth.signOut(); } catch {}
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const user = data.user;
      if (!user) {
        await Swal.fire({ icon: "error", title: "Login failed", text: "No user returned." });
        setLoading(false);
        return;
      }
      const redirectParam = searchParams?.get('redirect');
      await handlePostAuthRoute(user, redirectParam);
      return;
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Login failed", text: err?.message || "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/login`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
      await Swal.fire({ icon: 'info', title: 'Redirecting to Google…' });
    } catch (err: any) {
      await Swal.fire({ icon: 'error', title: 'Google sign-in failed', text: err?.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div suppressHydrationWarning className="min-h-screen grid lg:grid-cols-2">
      {/* Left image panel */}
      <div className="relative hidden lg:block">
        <Image src="/vetbg.jpg" alt="Veterinary care" fill priority className="object-cover w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent" />
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-10" style={{ background: `linear-gradient(135deg, ${SECONDARY}, white, ${PRIMARY})` }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto w-28 h-28 rounded-xl flex items-center justify-center overflow-visible bg-transparent">
              <Image src="/vetlogo.png" alt="ZamboVet" width={96} height={96} className="w-24 h-24 object-contain drop-shadow" />
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold" style={{ color: PRIMARY }}>Welcome back</h1>
            <p className="text-black/70">Sign in to continue</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: PRIMARY }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none"
              style={{ borderColor: SECONDARY, boxShadow: `0 0 0 0 rgba(0,0,0,0)`, outline: "none" }}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: PRIMARY }}>Password</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none pr-12"
                style={{ borderColor: SECONDARY }}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute inset-y-0 right-0 px-3 text-sm text-blue-700/80 hover:text-blue-800"
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-5 py-3 font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
            style={{ backgroundColor: PRIMARY }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-xs text-gray-500">OR</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-gray-50"
            style={{ borderColor: SECONDARY }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.9 0 7 1.5 9.2 3.6l6.3-6.3C35.9 2.3 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.7 6c1.8-5.3 6.8-9.7 13.7-9.7z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.6 3.2-2.4 5.9-5 7.7l7.7 6c4.5-4.1 7.1-10.1 7.1-18z"/><path fill="#FBBC05" d="M10.3 27.3c-.5-1.6-.8-3.3-.8-5s.3-3.4.8-5l-7.7-6C.9 14.2 0 18 0 22.3s.9 8.1 2.6 11.9l7.7-6.9z"/><path fill="#34A853" d="M24 44.6c6.5 0 12-2.1 16-5.7l-7.7-6c-2.1 1.4-4.8 2.3-8.3 2.3-6.9 0-12-4.4-13.7-10.2l-7.7 6c3.9 7.8 12 13.6 21.4 13.6z"/></svg>
            <span>Continue with Google</span>
          </button>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link href="/signup" className="text-blue-700 hover:underline">Create an account</Link>
            <button
              type="button"
              onClick={() => setForgotPasswordOpen(true)}
              className="text-blue-700/80 hover:underline"
              style={{ color: PRIMARY }}
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        open={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
