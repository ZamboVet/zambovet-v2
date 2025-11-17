"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Swal from "sweetalert2";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";

const PRIMARY = "#0032A0";
const SECONDARY = "#b3c7e6";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      try {
        // Supabase redirects with hash parameters: #access_token=...&type=recovery&...
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        // Check URL search params as fallback
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token') || accessToken;
        const tokenType = urlParams.get('type') || type;

        if (!token || tokenType !== 'recovery') {
          setTokenValid(false);
          setError("Invalid or missing reset token. Please request a new password reset link.");
          setValidating(false);
          return;
        }

        // Supabase automatically processes hash parameters and creates a session
        // Wait a moment for Supabase to process the hash
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check if we now have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setTokenValid(false);
          setError("Failed to validate reset token. Please request a new password reset link.");
        } else if (session) {
          setTokenValid(true);
        } else {
          // Try one more time after a longer wait
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          
          if (retrySession) {
            setTokenValid(true);
          } else {
            setTokenValid(false);
            setError("Invalid or expired reset token. Please request a new password reset link.");
          }
        }
      } catch (err: any) {
        console.error('Token validation error:', err);
        setTokenValid(false);
        setError("Failed to validate reset token. Please request a new password reset link.");
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, []);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
    if (score <= 4) return { score, label: "Fair", color: "bg-yellow-500" };
    return { score, label: "Strong", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      // Ensure we have a session (Supabase should have created one from the hash)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("Invalid or expired reset token. Please request a new password reset link.");
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        if (updateError.message?.includes('expired') || updateError.message?.includes('invalid')) {
          throw new Error("This reset link has expired. Please request a new password reset link.");
        }
        throw updateError;
      }

      await Swal.fire({
        icon: "success",
        title: "Password Reset Successful",
        text: "Your password has been updated. You can now sign in with your new password.",
        confirmButtonColor: PRIMARY,
      });

      // Sign out to ensure clean state, then redirect to login
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to reset password. Please try again.";
      setError(errorMessage);
      await Swal.fire({
        icon: "error",
        title: "Reset Failed",
        text: errorMessage,
        confirmButtonColor: PRIMARY,
      });
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${SECONDARY}, white, ${PRIMARY})` }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Validating reset token...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2">
        <div className="relative hidden lg:block">
          <Image src="/vetbg.jpg" alt="Veterinary care" fill priority className="object-cover w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent" />
        </div>

        <div className="flex items-center justify-center px-4 sm:px-6 lg:px-10" style={{ background: `linear-gradient(135deg, ${SECONDARY}, white, ${PRIMARY})` }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto w-28 h-28 rounded-xl flex items-center justify-center overflow-visible bg-transparent">
                <Image src="/vetlogo.png" alt="ZamboVet" width={96} height={96} className="w-24 h-24 object-contain drop-shadow" />
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold" style={{ color: PRIMARY }}>Invalid Reset Link</h1>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error || "This password reset link is invalid or has expired."}</p>
              </div>

              <div className="space-y-3">
                <Link
                  href="/login"
                  className="block w-full text-center px-4 py-2 rounded-lg font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                >
                  Back to Sign In
                </Link>
                <button
                  onClick={() => router.push("/login")}
                  className="block w-full text-center px-4 py-2 rounded-lg font-semibold text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  Request New Reset Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <Image src="/vetbg.jpg" alt="Veterinary care" fill priority className="object-cover w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent" />
      </div>

      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-10" style={{ background: `linear-gradient(135deg, ${SECONDARY}, white, ${PRIMARY})` }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto w-28 h-28 rounded-xl flex items-center justify-center overflow-visible bg-transparent">
              <Image src="/vetlogo.png" alt="ZamboVet" width={96} height={96} className="w-24 h-24 object-contain drop-shadow" />
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold" style={{ color: PRIMARY }}>Reset Password</h1>
            <p className="text-black/70">Enter your new password</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: PRIMARY }}>New Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none pr-12"
                  style={{ borderColor: SECONDARY }}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-sm text-blue-700/80 hover:text-blue-800"
                >
                  {showPwd ? "Hide" : "Show"}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300 ease-out`}
                        style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${passwordStrength.color.replace('bg-', 'text-')}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <p className="text-xs text-black/60">
                    {passwordStrength.score === 1 && "Add uppercase, numbers, or symbols"}
                    {passwordStrength.score === 2 && "Add more variety to your password"}
                    {passwordStrength.score === 3 && "Getting better - add more complexity"}
                    {passwordStrength.score === 4 && "Good password strength"}
                    {passwordStrength.score >= 5 && "Excellent password strength"}
                  </p>
                </div>
              )}
              {!password && <p className="mt-1 text-xs text-black/60">Must be at least 8 characters long</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: PRIMARY }}>Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPwd2 ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none pr-12"
                  style={{ borderColor: SECONDARY }}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd2((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-sm text-blue-700/80 hover:text-blue-800"
                >
                  {showPwd2 ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-5 py-3 font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: PRIMARY }}
            >
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link href="/login" className="text-blue-700 hover:underline" style={{ color: PRIMARY }}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${SECONDARY}, white, ${PRIMARY})` }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
