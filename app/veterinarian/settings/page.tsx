"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { Poppins } from "next/font/google";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const PRIMARY = "#2563eb";
const SECONDARY = "#e5e7eb";

// Standardized dropdown options (PH context)
const CATEGORY_OPTIONS = [
  'Small Animal', 'Large Animal', 'Mixed Practice', 'Equine', 'Poultry', 'Swine', 'Ruminant',
  'Exotic/Wildlife', 'Aquatic', 'Laboratory Animal', 'Public Health', 'Academic/Research', 'Regulatory'
];
const SPECIALIZATION_OPTIONS = [
  'General Practice', 'Surgery', 'Internal Medicine', 'Dermatology', 'Dentistry', 'Ophthalmology',
  'Orthopedics', 'Cardiology', 'Neurology', 'Oncology', 'Emergency & Critical Care', 'Anesthesiology',
  'Radiology/Imaging', 'Theriogenology (Reproduction)', 'Nutrition', 'Behavior', 'Epidemiology',
  'Pathology', 'Pharmacology', 'Microbiology', 'Parasitology', 'Preventive Medicine', 'Zoonoses',
  'Aquaculture Health', 'Food Safety', 'Animal Welfare'
];
const CLASSIFICATION_LEVEL_OPTIONS = ['Junior', 'Associate', 'Senior', 'Consultant', 'Resident', 'Fellow'];
const LICENSE_TYPE_OPTIONS = ['PRC', 'Provisional', 'Special Temporary Permit (STP)'];

type Profile = { id: string; email: string; full_name: string | null; phone: string | null; user_role: string; verification_status: string };
type Vet = { id: number; user_id: string; full_name: string; is_available: boolean; license_number: string | null };
type VetApp = { id:number; email:string; business_permit_url:string|null; professional_license_url:string|null; government_id_url:string|null; status:string; full_name?: string | null; created_at?: string };

export default function VetSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vet, setVet] = useState<Vet | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // removed specialization
  const [available, setAvailable] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [proUrl, setProUrl] = useState<string | null>(null);
  const [bizUrl, setBizUrl] = useState<string | null>(null);
  const [govUrl, setGovUrl] = useState<string | null>(null);
  // Vet classification state
  const [vetCategory, setVetCategory] = useState("");
  const [vetSpecialization, setVetSpecialization] = useState("");
  const [classificationLevel, setClassificationLevel] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const sanitizeName = (s: string) => {
    const nf = (s || "").normalize('NFKC');
    const cleaned = nf.replace(/[^A-Za-zÀ-ÿ .\-']/g, "");
    const collapsed = cleaned.replace(/\s+/g, " ");
    return collapsed.trim().slice(0, 120);
  };
  const isNameValid = (s: string) => !!s && s.length >= 2 && /[A-Za-zÀ-ÿ]/.test(s);
  const sanitizePhone = (s: string) => {
    const raw = String(s || "");
    const keep = raw.replace(/[^0-9+]/g, "");
    const fixed = keep.replace(/(?!^)[+]/g, "");
    return fixed.slice(0, 20);
  };
  const isPhoneValid = (s: string) => {
    if (!s) return true;
    return /^(\+639\d{9}|09\d{9})$/.test(s);
  };
  const sanitizeSimple = (s: string, max = 60) => {
    const nf = (s || "").normalize('NFKC');
    const cleaned = nf.replace(/[^A-Za-z0-9 .,/\-()&+:#]/g, "");
    const collapsed = cleaned.replace(/\s+/g, " ");
    return collapsed.trim().slice(0, max);
  };
  const validateFile = (f: File | null) => {
    if (!f) return "";
    const allowed = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ];
    const max = 5 * 1024 * 1024;
    if (!allowed.includes(f.type)) return 'Only PDF or image files (PNG, JPG, WEBP) are allowed.';
    if (f.size > max) return 'File too large. Maximum size is 5MB.';
    return "";
  };

  const nameInvalid = nameTouched && !isNameValid(name);
  const phoneInvalid = phoneTouched && !!phone && !isPhoneValid(phone);
  const invalidProfile = !isNameValid(name) || (!!phone && !isPhoneValid(phone));

  useEffect(() => {
    const init = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          await Swal.fire({ icon: "warning", title: "Sign in required", text: "Please sign in to continue." });
          window.location.href = "/login";
          return;
        }
        const { data: p, error: pErr } = await supabase.from("profiles").select("id,email,full_name,phone,user_role,verification_status").eq("id", user.id).single();
        if (pErr) throw pErr;
        if (p.user_role !== "veterinarian") {
          await Swal.fire({ icon: "error", title: "Access denied", text: "Veterinarian account required." });
          window.location.href = "/";
          return;
        }
        setProfile(p as Profile);
        
        // Fetch the veterinarian profile (take most recent to guard against duplicates)
        const { data: vetData, error: vetError } = await supabase
          .from("veterinarians")
          .select("id,user_id,full_name,is_available,license_number")
          .eq("user_id", p.id)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (vetError && vetError.code !== "PGRST116") {
          console.error('Error fetching veterinarian profile:', vetError);
          throw vetError;
        }
        
        const v = vetData;
        
        if (!v) {
          console.warn('Veterinarian profile not found for user:', p.id);
          await Swal.fire({ 
            icon: "warning", 
            title: "Profile Not Found", 
            text: "Your veterinarian profile could not be loaded. Please contact support." 
          });
          setVet(null);
          setLoading(false);
          return;
        }
        
        setVet(v as Vet);
        setName((v as any)?.full_name || p.full_name || "");
        setPhone(p.phone || "");
        setAvailable(!!(v as any)?.is_available);
        // Load vet classification if exists
        try {
          if (v?.id) {
            const { data: vc } = await supabase
              .from('veterinarian_classifications')
              .select('category,specialization,classification_level,license_type')
              .eq('vet_id', v.id)
              .maybeSingle();
            
            if (vc) {
              setVetCategory((vc as any).category || "");
              setVetSpecialization((vc as any).specialization || "");
              setClassificationLevel((vc as any).classification_level || "");
              setLicenseType((vc as any).license_type || "");
            }
          }
        } catch {}
        // Load latest vet application for docs preview
        try {
          // Get the 5 most recent applications for this email
          const { data: appsRecent } = await supabase
            .from('veterinarian_applications')
            .select('id,email,business_permit_url,professional_license_url,government_id_url,status,created_at,full_name,phone')
            .ilike('email', p.email)
            .order('created_at', { ascending: false })
            .limit(5);
          const list = (appsRecent || []) as any as VetApp[];
          // Pick the newest with any document URL, else the newest
          let app = list.find(a => a.business_permit_url || a.professional_license_url || a.government_id_url) || list[0];
          const parse = (u:string|null)=>{
            if (!u) return null;
            const pub = '/object/public/';
            if (u.includes(pub)) return u; // already public URL
            if (/[/]object[/]sign\//.test(u) && /token=/.test(u)) return u; // signed
            // assume bucket/path -> sign it
            const marker = '/storage/v1/object/public/';
            return u; // leave as-is; we'll try to sign below
          };
          const signer = async (raw:string|null)=>{
            if (!raw) return null;
            if (/https?:\/\//i.test(raw) && (/[/]object[/]public\//.test(raw) || (/[/]object[/]sign\//.test(raw) && /token=/.test(raw)))) return raw;
            // treat as bucket/path
            const firstSlash = raw.indexOf('/');
            const bucket = firstSlash>0 ? raw.substring(0, firstSlash) : 'veterinarian-documents';
            const path = firstSlash>0 ? raw.substring(firstSlash+1) : raw;
            try {
              const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
              return data?.signedUrl || raw;
            } catch { return raw; }
          };
          const pro = parse(app?.professional_license_url||null);
          const biz = parse(app?.business_permit_url||null);
          const gov = parse(app?.government_id_url||null);
          const [ps, bs, gs] = await Promise.all([signer(pro), signer(biz), signer(gov)]);
          setProUrl(ps);
          setBizUrl(bs);
          setGovUrl(gs);
          if (!(v as any)?.full_name && app?.full_name) setName(app.full_name);
          // Backfill phone from application if profiles.phone is empty
          const appPhone = (app as any)?.phone as string | undefined;
          if (!p.phone && appPhone) {
            setPhone(appPhone);
            try { await supabase.from('profiles').update({ phone: appPhone }).eq('id', p.id); } catch {}
          }
        } catch {}
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Failed to load", text: err?.message || "Please try again." });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const saveProfile = async () => {
    if (!profile || !vet) return;
    const res = await Swal.fire({ icon: "question", title: "Save changes?", showCancelButton: true, confirmButtonText: "Save" });
    if (!res.isConfirmed) return;
    setSaving(true);
    try {
      const fullName = sanitizeName(name);
      const phoneSan = sanitizePhone(phone);
      if (!isNameValid(fullName)) {
        await Swal.fire({ icon: 'warning', title: 'Invalid name', text: 'Please enter your full name.' });
        setSaving(false);
        return;
      }
      if (phoneSan && !isPhoneValid(phoneSan)) {
        await Swal.fire({ icon: 'warning', title: 'Invalid phone', text: 'Please enter a valid phone number.' });
        setSaving(false);
        return;
      }
      const up1 = supabase.from("profiles").update({ full_name: fullName, phone: phoneSan || null }).eq("id", profile.id);
      const up2 = supabase.from("veterinarians").update({ full_name: fullName, is_available: available }).eq("id", vet.id);
      const [a, b] = await Promise.all([up1, up2]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
      await Swal.fire({ icon: "success", title: "Saved" });
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Save failed", text: err?.message || "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const saveClassification = async () => {
    if (!profile || !vet) return;
    const cat = sanitizeSimple(vetCategory);
    const spec = sanitizeSimple(vetSpecialization);
    const level = sanitizeSimple(classificationLevel);
    const ltype = sanitizeSimple(licenseType);
    if (!cat || !level || !ltype) {
      await Swal.fire({ icon: 'warning', title: 'Missing required fields', text: 'Please fill Category, Classification Level, and License Type.' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        vet_id: vet.id,
        category: cat,
        specialization: spec || null,
        classification_level: level,
        license_type: ltype,
        updated_at: new Date().toISOString(),
      } as any;
      const { error } = await supabase
        .from('veterinarian_classifications')
        .upsert(payload, { onConflict: 'vet_id' });
      if (error) throw error;
      await Swal.fire({ icon: 'success', title: 'Classification saved' });
    } catch (err:any) {
      await Swal.fire({ icon: 'error', title: 'Save failed', text: err?.message || 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const uploadDocs = async () => {
    if (!profile) return;
    if (!licenseFile && !permitFile && !govIdFile) {
      await Swal.fire({ icon: "info", title: "No files selected" });
      return;
    }
    const err1 = validateFile(licenseFile);
    const err2 = validateFile(permitFile);
    const err3 = validateFile(govIdFile);
    const firstErr = err1 || err2 || err3;
    if (firstErr) {
      await Swal.fire({ icon: 'warning', title: 'Invalid file', text: firstErr });
      return;
    }
    setSaving(true);
    try {
      const uid = profile.id;
      const upload = async (file: File | null, folder: string) => {
        if (!file) return null as string | null;
        const path = `${folder}/${uid}/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage.from("veterinarian-documents").upload(path, file, { upsert: false });
        if (error) throw error;
        const { data: url } = supabase.storage.from("veterinarian-documents").getPublicUrl(data.path);
        return url.publicUrl;
      };
      const [licenseUrl, permitUrl, idUrl] = await Promise.all([
        upload(licenseFile, "professional-license"),
        upload(permitFile, "business-permits"),
        upload(govIdFile, "government-ids"),
      ]);
      // Update latest vet application row with new URLs for admin visibility
      try {
        const { data: apps } = await supabase
          .from('veterinarian_applications')
          .select('id,created_at')
          .ilike('email', profile.email)
          .order('created_at', { ascending: false })
          .limit(1);
        const app = (apps||[])[0] as any as VetApp | undefined;
        if (app?.id) {
          const payload:any = {};
          if (licenseUrl) payload.professional_license_url = licenseUrl;
          if (permitUrl) payload.business_permit_url = permitUrl;
          if (idUrl) payload.government_id_url = idUrl;
          if (Object.keys(payload).length>0) await supabase.from('veterinarian_applications').update(payload).eq('id', app.id);
        }
      } catch {}
      // Reflect previews in UI
      if (licenseUrl) setProUrl(licenseUrl);
      if (permitUrl) setBizUrl(permitUrl);
      if (idUrl) setGovUrl(idUrl);
      await Swal.fire({ icon: "success", title: "Uploaded", text: "Documents uploaded successfully." });
      setLicenseFile(null);
      setPermitFile(null);
      setGovIdFile(null);
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Upload failed", text: err?.message || "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={`${poppins.className} p-6 text-sm text-gray-500`}>Loading…</div>;

  return (
    <div className={`${poppins.className} space-y-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="text-xs text-gray-500">Dashboard / Settings</div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>Settings</h1>
        </div>
        <button onClick={saveProfile} disabled={saving || invalidProfile} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 w-full sm:w-auto">
          {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
          Save Changes
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white/80 backdrop-blur-sm p-5 shadow ring-1 ring-black/5">
          <div className="text-lg font-semibold mb-4" style={{ color: PRIMARY }}>Profile</div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <input value={name} onChange={(e) => setName(sanitizeName(e.target.value))} onBlur={()=>setNameTouched(true)} aria-invalid={nameInvalid}
                     maxLength={120} className="w-full px-4 py-3 rounded-xl bg-white/90 ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 focus:outline-none" />
              {nameInvalid && (<p className="mt-1 text-xs text-red-600">Please enter your full name (min 2 letters).</p>)}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input value={phone} onChange={(e) => setPhone(sanitizePhone(e.target.value))} onBlur={()=>setPhoneTouched(true)} aria-invalid={phoneInvalid}
                     maxLength={20} inputMode="tel" placeholder="+639XXXXXXXXX or 09XXXXXXXXX" pattern="(\+639\d{9}|09\d{9})"
                     className="w-full px-4 py-3 rounded-xl bg-white/90 ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 focus:outline-none" />
              {phoneInvalid && (<p className="mt-1 text-xs text-red-600">Enter a valid PH number: +639XXXXXXXXX or 09XXXXXXXXX.</p>)}
            </div>
            <div className="flex items-center gap-3">
              <input id="availability" type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)}
                     className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400" />
              <label htmlFor="availability" className="text-sm">Available for appointments</label>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white/80 backdrop-blur-sm p-5 shadow ring-1 ring-black/5">
          <div className="text-lg font-semibold mb-4" style={{ color: PRIMARY }}>Professional Profile — Vet Classification</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vet Category<span className="text-red-500">*</span></label>
              <select value={vetCategory} onChange={(e)=>setVetCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/90 ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 focus:outline-none">
                <option value="">Select category</option>
                {CATEGORY_OPTIONS.map(o => (<option key={o} value={o}>{o}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Specialization</label>
              <select value={vetSpecialization} onChange={(e)=>setVetSpecialization(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/90 ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 focus:outline-none">
                <option value="">Select specialization (optional)</option>
                {SPECIALIZATION_OPTIONS.map(o => (<option key={o} value={o}>{o}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Classification Level<span className="text-red-500">*</span></label>
              <select value={classificationLevel} onChange={(e)=>setClassificationLevel(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/90 ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 focus:outline-none">
                <option value="">Select level</option>
                {CLASSIFICATION_LEVEL_OPTIONS.map(o => (<option key={o} value={o}>{o}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">License Type<span className="text-red-500">*</span></label>
              <select value={licenseType} onChange={(e)=>setLicenseType(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/90 ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 focus:outline-none">
                <option value="">Select license type</option>
                {LICENSE_TYPE_OPTIONS.map(o => (<option key={o} value={o}>{o}</option>))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <button onClick={saveClassification} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2">Save Classification</button>
          </div>
        </div>

        <div className="rounded-3xl bg-white/80 backdrop-blur-sm p-5 shadow ring-1 ring-black/5">
          <div className="text-lg font-semibold mb-4" style={{ color: PRIMARY }}>Documents</div>
          <div className="grid grid-cols-1 gap-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-600 mb-1">Professional License (current)</div>
                {proUrl ? (
                  /\.pdf(\?|$)/i.test(proUrl) ? (
                    <embed src={proUrl+"#toolbar=0"} type="application/pdf" className="w-full h-40 rounded border" />
                  ) : (
                    <img src={proUrl} alt="Professional License" className="w-full h-40 object-contain rounded border" />
                  )
                ) : (
                  <div className="w-full h-40 rounded border grid place-items-center text-gray-400 text-sm">No preview</div>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Business Permit (current)</div>
                {bizUrl ? (
                  /\.pdf(\?|$)/i.test(bizUrl) ? (
                    <embed src={bizUrl+"#toolbar=0"} type="application/pdf" className="w-full h-40 rounded border" />
                  ) : (
                    <img src={bizUrl} alt="Business Permit" className="w-full h-40 object-contain rounded border" />
                  )
                ) : (
                  <div className="w-full h-40 rounded border grid place-items-center text-gray-400 text-sm">No preview</div>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Government ID (current)</div>
                {govUrl ? (
                  /\.pdf(\?|$)/i.test(govUrl) ? (
                    <embed src={govUrl+"#toolbar=0"} type="application/pdf" className="w-full h-40 rounded border" />
                  ) : (
                    <img src={govUrl} alt="Government ID" className="w-full h-40 object-contain rounded border" />
                  )
                ) : (
                  <div className="w-full h-40 rounded border grid place-items-center text-gray-400 text-sm">No preview</div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Professional License</label>
              <label className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/90 ring-1 ring-gray-200 hover:bg-gray-50 cursor-pointer">
                <span className="text-sm text-gray-600 truncate">{licenseFile ? licenseFile.name : "Choose file"}</span>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setLicenseFile(e.target.files?.[0] || null)} className="hidden" />
                <span className="ml-3 inline-flex px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs">Browse</span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Business Permit</label>
              <label className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/90 ring-1 ring-gray-200 hover:bg-gray-50 cursor-pointer">
                <span className="text-sm text-gray-600 truncate">{permitFile ? permitFile.name : "Choose file"}</span>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setPermitFile(e.target.files?.[0] || null)} className="hidden" />
                <span className="ml-3 inline-flex px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs">Browse</span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Government ID</label>
              <label className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/90 ring-1 ring-gray-200 hover:bg-gray-50 cursor-pointer">
                <span className="text-sm text-gray-600 truncate">{govIdFile ? govIdFile.name : "Choose file"}</span>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setGovIdFile(e.target.files?.[0] || null)} className="hidden" />
                <span className="ml-3 inline-flex px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs">Browse</span>
              </label>
            </div>
            <button onClick={uploadDocs} disabled={saving} className="justify-self-start inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2">Upload</button>
          </div>
        </div>
      </div>

      <div className="sticky bottom-3 z-10">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white/90 backdrop-blur-sm shadow ring-1 ring-black/5 p-3 flex items-center justify-between">
          <div className="text-xs text-gray-600">Make sure your profile information and documents are accurate.</div>
          <div className="flex items-center gap-2">
            <button onClick={uploadDocs} disabled={saving} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-sm">Upload Docs</button>
            <button onClick={saveProfile} disabled={saving || invalidProfile} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
