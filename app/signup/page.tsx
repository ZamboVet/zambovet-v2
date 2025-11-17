"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Swal from "sweetalert2";
import { supabase } from "../../lib/supabaseClient";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import TermsAndConditionsModal from "../components/TermsAndConditionsModal";

const PRIMARY = "#0032A0";
const SECONDARY = "#b3c7e6";

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<"pet_owner" | "veterinarian" | "">("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vetLicenseFile, setVetLicenseFile] = useState<File | null>(null);
  const [businessPermitFile, setBusinessPermitFile] = useState<File | null>(null);
  const [governmentIdFile, setGovernmentIdFile] = useState<File | null>(null);
  const [vetLicensePreview, setVetLicensePreview] = useState<string | null>(null);
  const [businessPermitPreview, setBusinessPermitPreview] = useState<string | null>(null);
  const [governmentIdPreview, setGovernmentIdPreview] = useState<string | null>(null);
  const [licenseInputKey, setLicenseInputKey] = useState(0);
  const [permitInputKey, setPermitInputKey] = useState(0);
  const [idInputKey, setIdInputKey] = useState(0);
  const [vetLicenseNumber, setVetLicenseNumber] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

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

  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const isImage = (f: File) => /^image\//.test(f.type);
  const isAllowed = (f: File) => isImage(f) || f.type === "application/pdf";
  const formatSize = (n: number) => (n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(2)} MB` : `${Math.ceil(n / 1024)} KB`);
  const onPick = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (u: string | null) => void
  ) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!isAllowed(f)) {
      Swal.fire({ icon: "warning", title: "Unsupported file", text: "Only images or PDF are allowed." });
      e.target.value = "";
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      Swal.fire({ icon: "warning", title: "File too large", text: "Max file size is 5 MB." });
      e.target.value = "";
      return;
    }
    setFile(f);
    setPreview(isImage(f) ? URL.createObjectURL(f) : null);
  };
  const clearPick = (
    setFile: (f: File | null) => void,
    setPreview: (u: string | null) => void,
    bumpKey: (n: any) => void
  ) => {
    setFile(null);
    setPreview(null);
    bumpKey((k: any) => (typeof k === "number" ? k + 1 : 0));
  };

  const sendOtp = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'https://zambovet-v2.vercel.app',
      },
    });
    if (error) {
      await Swal.fire({ icon: 'error', title: 'OTP error', text: error.message || 'Please try again.' });
      throw error;
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (step === 1) {
      if (!role) {
        Swal.fire({ icon: "warning", title: "Role required", text: "Please select a role." });
        return;
      }
      if (!email || !password || !confirm) {
        Swal.fire({ icon: "warning", title: "Incomplete", text: "Please complete all fields." });
        return;
      }
      if (password.length < 8) {
        Swal.fire({ icon: "warning", title: "Weak password", text: "Password must be at least 8 characters." });
        return;
      }
      if (password !== confirm) {
        Swal.fire({ icon: "error", title: "Mismatch", text: "Passwords do not match." });
        return;
      }
      if (!termsAccepted) {
        setTermsError("You must accept the Terms & Conditions to continue.");
        Swal.fire({ icon: "warning", title: "Terms Required", text: "Please accept the Terms & Conditions to proceed." });
        return;
      }
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', email.trim())
        .maybeSingle();
      if (existingProfile) {
        await Swal.fire({ icon: 'error', title: 'Email already in use', text: 'Please sign in to your existing account.' });
        return;
      }
      setTermsError(null);
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!fullName) {
        Swal.fire({ icon: "warning", title: "Name required", text: "Please enter your full name." });
        return;
      }
      setStep(3);
      return;
    }
    // Step 3: submit
    try {
      // Double-check documents BEFORE sending OTP or creating account
      if (role === "veterinarian") {
        if (!vetLicenseFile) {
          await Swal.fire({ icon: "warning", title: "Professional License required", text: "Please upload your professional license." });
          return;
        }
        if (!businessPermitFile) {
          await Swal.fire({ icon: "warning", title: "Business Permit required", text: "Please upload your business permit." });
          return;
        }
        if (!governmentIdFile) {
          await Swal.fire({ icon: "warning", title: "Government ID required", text: "Please upload your government ID." });
          return;
        }
        if (!vetLicenseNumber.trim()) {
          await Swal.fire({ icon: "warning", title: "License number required", text: "Please enter your professional license number." });
          return;
        }
      }
      
      const confirmResult = await Swal.fire({
        icon: "question",
        title: "Create account?",
        text: role === "veterinarian" ? "Your account will be pending until an admin reviews your documents." : "Proceed to create your account?",
        showCancelButton: true,
        confirmButtonText: "Yes, continue",
        cancelButtonText: "Cancel",
      });
      if (!confirmResult.isConfirmed) return;
      setLoading(true);
      // Do NOT call signUp(); it triggers Supabase's confirmation email. We'll verify OTP to create a session,
      // then set the password on that session's user.
      let user: any = null;
      let hasSession = false;
      if (!otpVerified) {
        // Do NOT auto-resend; first ask user for the code they already received.
        let verified = false;
        let attempts = 0;
        while (!verified && attempts < 3) {
          attempts++;
          const res = await Swal.fire({
            icon: 'info',
            title: 'Verify your email',
            html: 'Enter the 6-digit code sent to your email. If you did not receive it, click <b>Resend code</b>.',
            input: 'text',
            inputAttributes: { maxlength: '6', inputmode: 'numeric' },
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Verify',
            denyButtonText: 'Resend code',
          });
          if (res.isDenied) {
            setLoading(true);
            const { error } = await supabase.auth.signInWithOtp({
              email,
              options: { shouldCreateUser: true, emailRedirectTo: 'https://zambovet-v2.vercel.app' },
            });
            if (error) {
              if ((error as any).status === 429) {
                await Swal.fire({ icon: 'warning', title: 'OTP rate limited', text: error.message || 'Please wait and try again.' });
              } else {
                await Swal.fire({ icon: 'error', title: 'Failed to send code', text: error.message || 'Try again.' });
              }
            } else {
              await Swal.fire({ icon: 'success', title: 'Code sent', text: 'Check your email for the new code.' });
            }
            continue; // loop back to prompt
          }
          if (!res.isConfirmed || !res.value) {
            setLoading(false);
            return;
          }
          const clean = String(res.value).replace(/\D/g, '').slice(0,6);
          const { data: vdata, error: verr } = await supabase.auth.verifyOtp({ email, token: clean, type: 'email' });
          if (verr || !vdata?.session) {
            await Swal.fire({ icon: 'error', title: 'Invalid or expired code', text: verr?.message || 'Please try again or resend a new code.' });
            continue; // allow retry or resend
          }
          setOtpVerified(true);
          verified = true;
        }
        if (!verified) {
          setLoading(false);
          return;
        }
      }
      // Ensure we have an active session from OTP verification
      const { data: sessData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !sessData?.session || !sessData.session.user) {
        await Swal.fire({ icon: 'error', title: 'Session error', text: sessErr?.message || 'Please try again.' });
        setLoading(false);
        return;
      }
      // Set password + metadata now that session exists
      const baseUser = sessData.session.user;
      const { data: upd, error: updErr } = await supabase.auth.updateUser({
        password,
        data: { role, full_name: fullName, phone },
      });
      if (updErr) {
        await Swal.fire({ icon: 'error', title: 'Failed to set password', text: updErr.message || 'Please try again.' });
        setLoading(false);
        return;
      }
      user = upd?.user || baseUser;
      hasSession = true;
      // If we already have a session, upsert into profiles now (FK requires auth.users row to be visible)
      if (hasSession) {
        const payload = { id: user.id, email, full_name: fullName, phone, user_role: role, verification_status: role === "veterinarian" ? "pending" : "approved" };
        let attempt = 0;
        let lastErr: any = null;
        while (attempt < 5) {
          const { error: upErr } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
          if (!upErr) { lastErr = null; break; }
          lastErr = upErr;
          if (!/profiles_id_fkey/i.test(upErr.message || "")) break;
          await new Promise(r => setTimeout(r, 400));
          attempt++;
        }
        if (lastErr) throw lastErr;
      } else {
        // No session: require email verification before creating dependent rows
        if (role === "pet_owner") {
          await Swal.fire({ icon: "success", title: "Verify your email", text: "Please verify your email, then sign in to complete your profile." });
          setLoading(false);
          return;
        }
      }
      // NOTE: For veterinarians without a session (email confirmation flow), we skip creating the profile now
      // and only insert a minimal application (handled below). We'll create/update profile after sign-in.
      if (role === "pet_owner") {
        const { data: existingPO } = await supabase.from("pet_owner_profiles").select("id").eq("user_id", user.id).maybeSingle();
        if (!existingPO) {
          const { error: poErr } = await supabase.from("pet_owner_profiles").insert({ user_id: user.id, full_name: fullName });
          if (poErr) throw poErr;
        }
        await Swal.fire({ icon: "success", title: "Account created" });
        window.location.href = "/login";
        return;
      }
      // If role is veterinarian and there's no active session yet, we'll still try to upload documents.
      // If storage policies require an authenticated session and uploads fail, we will fall back to
      // creating the application without URLs and instruct the user to verify email then sign in to upload docs.

      // Object keys are relative to the bucket root. We'll use your existing bucket and folder structure
      const uid = user.id; // used to namespace files per user
      const up = async (file: File, name: string) => {
        const path = name; // full relative path provided by caller
        const { data, error } = await supabase.storage.from("veterinarian-documents").upload(path, file, { upsert: false });
        if (error) {
          // Common cause: bucket does not exist or not public
          const msg = (error as any)?.message || "Upload failed";
          const status = (error as any)?.status;
          const bucketMissing = status === 404 || /No such bucket|bucket/i.test(msg);
          if (bucketMissing) {
            throw new Error("BUCKET_MISSING: The 'veterinarian-documents' storage bucket was not found");
          }
          throw error;
        }
        const { data: url } = supabase.storage.from("veterinarian-documents").getPublicUrl(data.path);
        return url.publicUrl;
      };
      // Check if license number already exists
      const { data: existingApp } = await supabase
        .from("veterinarian_applications")
        .select("id, email, status")
        .eq("license_number", vetLicenseNumber.trim())
        .maybeSingle();
      
      if (existingApp) {
        throw new Error("LICENSE_EXISTS: This license number has already been used in a veterinarian application. Please contact support if you believe this is an error.");
      }

      // Also check if email already exists in applications (schema has UNIQUE constraint on email)
      const { data: existingEmailApp } = await supabase
        .from("veterinarian_applications")
        .select("id, status")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();
      
      if (existingEmailApp) {
        throw new Error("EMAIL_APPLICATION_EXISTS: An application with this email address already exists. Please contact support if you need to update your application.");
      }

      const professional_license_url = await up(vetLicenseFile!, `professional-license/${uid}/${Date.now()}-${vetLicenseFile!.name}`);
      const business_permit_url = await up(businessPermitFile!, `business-permits/${uid}/${Date.now()}-${businessPermitFile!.name}`);
      const government_id_url = await up(governmentIdFile!, `government-ids/${uid}/${Date.now()}-${governmentIdFile!.name}`);
      const { error: appErr } = await supabase.from("veterinarian_applications").insert({
        email,
        full_name: fullName,
        phone,
        license_number: vetLicenseNumber.trim(),
        business_permit_url,
        professional_license_url,
        government_id_url,
        status: "pending",
      });
      if (appErr) {
        // Handle duplicate key errors more gracefully
        if (appErr.message?.includes("license_number") || appErr.code === "23505") {
          throw new Error("LICENSE_EXISTS: This license number has already been used. Please contact support if you believe this is an error.");
        }
        if (appErr.message?.includes("email") || appErr.message?.includes("veterinarian_applications_email")) {
          throw new Error("EMAIL_APPLICATION_EXISTS: An application with this email address already exists. Please contact support if you need to update your application.");
        }
        throw appErr;
      }
      await Swal.fire({ icon: "success", title: "Application submitted", text: "We will notify you once the admin verifies your documents." });
      window.location.href = "/login";
    } catch (err: any) {
      const msg = err?.message || "Please try again.";
      const status = err?.status;
      if (msg?.startsWith?.("BUCKET_MISSING")) {
        await Swal.fire({
          icon: "warning",
          title: "Storage bucket missing",
          html: "The 'veterinarian-documents' bucket is not configured in Supabase Storage. Please create a bucket named <b>veterinarian-documents</b> and set it to Public in the Supabase dashboard, then retry.",
        });
      } else if (msg?.startsWith?.("EMAIL_IN_USE")) {
        await Swal.fire({ icon: "error", title: "Email already in use", text: "Please use a different email or sign in to the existing account." });
      } else if (msg?.startsWith?.("LICENSE_EXISTS")) {
        const detailMsg = msg.replace("LICENSE_EXISTS: ", "");
        await Swal.fire({ 
          icon: "error", 
          title: "License number already registered", 
          text: detailMsg || "This license number has already been used in a veterinarian application. Please contact support if you believe this is an error.",
          footer: '<a href="/login">Try signing in instead</a>'
        });
      } else if (msg?.startsWith?.("EMAIL_APPLICATION_EXISTS")) {
        const detailMsg = msg.replace("EMAIL_APPLICATION_EXISTS: ", "");
        await Swal.fire({ 
          icon: "warning", 
          title: "Application already exists", 
          text: detailMsg || "An application with this email address already exists. Please contact support if you need to update your application.",
          footer: '<a href="/login">Try signing in instead</a>'
        });
      } else if (status === 429) {
        await Swal.fire({ icon: "warning", title: "Too many requests", text: "Please wait a minute and try again." });
      } else {
        await Swal.fire({ icon: "error", title: "Signup failed", text: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  // OTP sender is defined above using supabase.auth.signInWithOtp; duplicate removed.

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://zambovet-v2.vercel.app/login',
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

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left image panel */}
      <div className="relative hidden lg:block">
        <Image src="/vetbg.jpg" alt="Veterinary care" fill priority className="object-cover w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent" />
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-10" style={{ background: `linear-gradient(135deg, ${SECONDARY}, white, ${PRIMARY})` }}>
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto w-24 h-24 rounded-xl flex items-center justify-center overflow-visible bg-transparent">
              <Image src="/vetlogo.png" alt="ZamboVet" width={80} height={80} className="w-20 h-20 object-contain drop-shadow" />
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold" style={{ color: PRIMARY }}>Create Account</h1>
            <p className="text-black/70">Join thousands of pet parents who trust ZamboVet</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-3 mb-6 text-sm">
            {(() => {
              const steps = role === "veterinarian" ? ["Account", "Profile", "Documents"] : ["Account", "Profile"];
              return steps.map((label, i) => {
                const idx = (i + 1) as 1 | 2 | 3;
                const active = step === idx;
                const done = step > idx;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs ${done ? "bg-green-500" : active ? "bg-blue-600" : "bg-blue-300"}`}
                    >
                      {idx}
                    </div>
                    <span className={`hidden sm:block font-medium ${active ? "text-blue-700" : "text-black/60"}`}>{label}</span>
                    {idx !== steps.length && <div className="w-8 h-[2px] bg-blue-200" />}
                  </div>
                );
              });
            })()}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {step === 1 && (
              <div className="space-y-4">
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
                <div>
                  <div className="text-sm font-medium mb-2" style={{ color: PRIMARY }}>I want to register as:</div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("pet_owner")}
                      className={`rounded-xl border p-3 text-left ${role === "pet_owner" ? "ring-2 ring-blue-600" : ""}`}
                      style={{ borderColor: SECONDARY }}
                    >
                      <div className="font-semibold" style={{ color: PRIMARY }}>Pet Owner</div>
                      <div className="text-xs text-black/70">Book appointments for pets</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("veterinarian")}
                      className={`rounded-xl border p-3 text-left ${role === "veterinarian" ? "ring-2 ring-blue-600" : ""}`}
                      style={{ borderColor: SECONDARY }}
                    >
                      <div className="font-semibold" style={{ color: PRIMARY }}>Veterinarian</div>
                      <div className="text-xs text-black/70">Provide veterinary services</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: PRIMARY }}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none"
                    style={{ borderColor: SECONDARY }}
                    placeholder="Enter your email"
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
                      placeholder="Create a password"
                      required
                    />
                    <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute inset-y-0 right-0 px-3 text-sm text-blue-700/80 hover:text-blue-800">
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
                  <label className="block text-sm font-medium mb-1" style={{ color: PRIMARY }}>Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showPwd2 ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none pr-12"
                      style={{ borderColor: SECONDARY }}
                      placeholder="Confirm your password"
                      required
                    />
                    <button type="button" onClick={() => setShowPwd2((s) => !s)} className="absolute inset-y-0 right-0 px-3 text-sm text-blue-700/80 hover:text-blue-800">
                      {showPwd2 ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked);
                        setTermsError(null);
                      }}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      style={{ accentColor: PRIMARY }}
                    />
                    <label htmlFor="terms" className="text-sm text-black/70 cursor-pointer">
                      I agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setTermsModalOpen(true)}
                        className="text-blue-700 hover:underline font-medium"
                        style={{ color: PRIMARY }}
                      >
                        Terms & Conditions
                      </button>
                    </label>
                  </div>
                  {termsError && (
                    <div className="text-sm text-red-600 ml-6">{termsError}</div>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: PRIMARY }}>Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none"
                    style={{ borderColor: SECONDARY }}
                    placeholder="Juan Dela Cruz"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: PRIMARY }}>Phone (optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none"
                    style={{ borderColor: SECONDARY }}
                    placeholder="e.g. +63 900 000 0000"
                  />
                </div>
                {role === "veterinarian" && (
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: PRIMARY }}>Professional License Number</label>
                    <input
                      type="text"
                      value={vetLicenseNumber}
                      onChange={(e) => setVetLicenseNumber(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none"
                      style={{ borderColor: SECONDARY }}
                      placeholder="Enter your license number"
                      required={role === "veterinarian"}
                    />
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                {role === "veterinarian" && (
                  <>
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="text-lg font-semibold text-blue-800 mb-2">Document Requirements</h3>
                      <p className="text-sm text-blue-600">All documents must be uploaded before you can create your veterinarian account</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className={`border rounded-lg p-3 text-sm ${vetLicenseFile ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="font-medium" style={{ color: vetLicenseFile ? '#059669' : '#dc2626' }}>Professional License</div>
                          {vetLicenseFile ? (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">✓ Uploaded</span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">Required</span>
                          )}
                        </div>
                        <label className="mt-3 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-opacity-5 transition" style={{ borderColor: PRIMARY }}>
                          <ArrowUpTrayIcon className="w-8 h-5 mb--15" style={{ color: PRIMARY }} />
                          <span className="text-sm font-medium" style={{ color: PRIMARY }}>Choose File</span>
                          <span className="text-xs text-gray-500 mt-1">or drag and drop</span>
                          <input key={licenseInputKey} type="file" accept="image/*,application/pdf" onChange={(e) => onPick(e, setVetLicenseFile, setVetLicensePreview)} className="hidden" />
                        </label>
                        {vetLicenseFile && (
                          <div className="mt-2 flex items-center gap-3">
                            {vetLicensePreview && <img src={vetLicensePreview} alt="preview" className="w-10 h-10 rounded object-cover" />}
                            <div className="flex-1 truncate">
                              <div className="text-black/80 truncate">{vetLicenseFile.name}</div>
                              <div className="text-xs text-black/60">{formatSize(vetLicenseFile.size)}</div>
                            </div>
                            <button type="button" className="px-2 py-1 text-xs rounded border" style={{ borderColor: SECONDARY, color: PRIMARY }} onClick={() => clearPick(setVetLicenseFile, setVetLicensePreview, setLicenseInputKey)}>Clear</button>
                          </div>
                        )}
                      </div>
                      <div className={`border rounded-lg p-3 text-sm ${businessPermitFile ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="font-medium" style={{ color: businessPermitFile ? '#059669' : '#dc2626' }}>Business Permit</div>
                          {businessPermitFile ? (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">✓ Uploaded</span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">Required</span>
                          )}
                        </div>
                        <label className="mt-3 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-opacity-5 transition" style={{ borderColor: PRIMARY }}>
                          <ArrowUpTrayIcon className="w-8 h-5 mb--15" style={{ color: PRIMARY }} />
                          <span className="text-sm font-medium" style={{ color: PRIMARY }}>Choose File</span>
                          <span className="text-xs text-gray-500 mt-1">or drag and drop</span>
                          <input key={permitInputKey} type="file" accept="image/*,application/pdf" onChange={(e) => onPick(e, setBusinessPermitFile, setBusinessPermitPreview)} className="hidden" />
                        </label>
                        {businessPermitFile && (
                          <div className="mt-2 flex items-center gap-3">
                            {businessPermitPreview && <img src={businessPermitPreview} alt="preview" className="w-10 h-10 rounded object-cover" />}
                            <div className="flex-1 truncate">
                              <div className="text-black/80 truncate">{businessPermitFile.name}</div>
                              <div className="text-xs text-black/60">{formatSize(businessPermitFile.size)}</div>
                            </div>
                            <button type="button" className="px-2 py-1 text-xs rounded border" style={{ borderColor: SECONDARY, color: PRIMARY }} onClick={() => clearPick(setBusinessPermitFile, setBusinessPermitPreview, setPermitInputKey)}>Clear</button>
                          </div>
                        )}
                      </div>
                      <div className={`border rounded-lg p-3 text-sm ${governmentIdFile ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="font-medium" style={{ color: governmentIdFile ? '#059669' : '#dc2626' }}>Government ID</div>
                          {governmentIdFile ? (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">✓ Uploaded</span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">Required</span>
                          )}
                        </div>
                        <label className="mt-3 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-opacity-5 transition" style={{ borderColor: PRIMARY }}>
                          <ArrowUpTrayIcon className="w-8 h-5 mb--15" style={{ color: PRIMARY }} />
                          <span className="text-sm font-medium" style={{ color: PRIMARY }}>Choose File</span>
                          <span className="text-xs text-gray-500 mt-1">or drag and drop</span>
                          <input key={idInputKey} type="file" accept="image/*,application/pdf" onChange={(e) => onPick(e, setGovernmentIdFile, setGovernmentIdPreview)} className="hidden" />
                        </label>
                        {governmentIdFile && (
                          <div className="mt-2 flex items-center gap-3">
                            {governmentIdPreview && <img src={governmentIdPreview} alt="preview" className="w-10 h-10 rounded object-cover" />}
                            <div className="flex-1 truncate">
                              <div className="text-black/80 truncate">{governmentIdFile.name}</div>
                              <div className="text-xs text-black/60">{formatSize(governmentIdFile.size)}</div>
                            </div>
                            <button type="button" className="px-2 py-1 text-xs rounded border" style={{ borderColor: SECONDARY, color: PRIMARY }} onClick={() => clearPick(setGovernmentIdFile, setGovernmentIdPreview, setIdInputKey)}>Clear</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex items-center gap-3 pt-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((prev) => (prev === 2 ? 1 : 2))}
                  className="px-5 py-3 rounded-lg font-semibold border"
                  style={{ borderColor: SECONDARY, color: PRIMARY }}
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading || (step === 3 && role === "veterinarian" && (!vetLicenseFile || !businessPermitFile || !governmentIdFile || !vetLicenseNumber.trim()))}
                className="flex-1 rounded-lg px-5 py-3 font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: PRIMARY }}
                title={step === 3 && role === "veterinarian" && (!vetLicenseFile || !businessPermitFile || !governmentIdFile || !vetLicenseNumber.trim()) ? "Please upload all required documents" : ""}
              >
                {step === 3 ? (loading ? "Creating account…" : "Continue") : "Continue"}
              </button>
            </div>
          </form>

          <div className="mt-4 flex items-center justify-center text-sm">
            <span className="text-black/70 mr-1">Already have an account?</span>
            <Link href="/login" className="text-blue-700 hover:underline">Sign in</Link>
          </div>
        </div>
      </div>

      <TermsAndConditionsModal
        open={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
      />
    </div>
  );
}
