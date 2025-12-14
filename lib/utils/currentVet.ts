import { supabase } from "../supabaseClient";

export type Profile = { id: string; email?: string | null; full_name?: string | null; phone?: string | null; user_role: string; verification_status?: string; is_active?: boolean | null };
export type Vet = { id: number; user_id: string; full_name: string; specialization?: string | null; clinic_id?: number | null; is_available?: boolean; license_number?: string | null; average_rating?: number | null };

export type CurrentVetResult = {
  userId: string;
  profile: Profile;
  vet: Vet | null;
};

// Ensures we always scope by logged-in user and avoid accidental cross-account access
export async function getCurrentVet(): Promise<CurrentVetResult> {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) throw new Error("Not authenticated");
  const user = auth.user;

  const { data: p, error: pErr } = await supabase
    .from("profiles")
    .select("id,email,full_name,phone,user_role,verification_status,is_active")
    .eq("id", user.id)
    .single();
  if (pErr) throw pErr;
  if (p.user_role !== "veterinarian") throw new Error("Veterinarian account required");

  if (p.is_active === false) {
    return { userId: user.id, profile: p as Profile, vet: null };
  }

  // Fetch most recent veterinarian row for this user
  const { data: vetData, error: vErr } = await supabase
    .from("veterinarians")
    .select("id,user_id,full_name,specialization,clinic_id,is_available,license_number,average_rating")
    .eq("user_id", p.id)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (vErr && vErr.code !== "PGRST116") throw vErr;

  let vet = vetData as Vet | null;
  
  // Auto-create vet record for approved profiles that don't have one yet
  // This handles the case where admin approved the vet but record wasn't created
  if (!vet && p.verification_status === "approved") {
    const displayName = p.full_name || p.email || "Veterinarian";
    
    // Use upsert with onConflict to handle race conditions atomically
    // If another process creates the record simultaneously, this will just return the existing one
    const { data: upserted, error: uErr } = await supabase
      .from("veterinarians")
      .upsert(
        { user_id: p.id, full_name: displayName, is_available: false },
        { onConflict: 'user_id', ignoreDuplicates: true }
      )
      .select("id,user_id,full_name,specialization,clinic_id,is_available,license_number,average_rating")
      .maybeSingle();
    
    if (uErr) {
      console.error(`[getCurrentVet] Error upserting vet record: ${uErr.message}`);
      // If upsert fails, try to fetch existing record as fallback
      const { data: existing } = await supabase
        .from("veterinarians")
        .select("id,user_id,full_name,specialization,clinic_id,is_available,license_number,average_rating")
        .eq("user_id", p.id)
        .maybeSingle();
      vet = existing as Vet | null;
    } else {
      vet = upserted as Vet | null;
    }
  }

  return { userId: user.id, profile: p as Profile, vet };
}
