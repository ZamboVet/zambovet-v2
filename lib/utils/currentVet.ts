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
  if (!vet && p.verification_status === "approved") {
    // Create a placeholder vet record for approved profiles
    const displayName = p.full_name || p.email || "Veterinarian";
    console.log(`[getCurrentVet] Creating vet record for approved profile: ${p.id}`);
    
    // Try insert first; if unique violation occurs, fetch existing row
    const { data: created, error: cErr } = await supabase
      .from("veterinarians")
      .insert({ user_id: p.id, full_name: displayName, is_available: false })
      .select("id,user_id,full_name,specialization,clinic_id,is_available,license_number,average_rating")
      .maybeSingle();
    
    if (cErr) {
      // 23505 = unique violation (another process created it); fetch latest
      if ((cErr as any).code === '23505') {
        console.log(`[getCurrentVet] Unique constraint violation, fetching existing record for user: ${p.id}`);
        const { data: existing, error: fErr } = await supabase
          .from("veterinarians")
          .select("id,user_id,full_name,specialization,clinic_id,is_available,license_number,average_rating")
          .eq("user_id", p.id)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (fErr) {
          console.error(`[getCurrentVet] Error fetching existing vet after conflict: ${fErr.message}`);
          throw fErr;
        }
        vet = existing as Vet;
        console.log(`[getCurrentVet] Successfully fetched existing vet record: ${vet?.id}`);
      } else {
        // If insertion failed due to any other reason, log and rethrow
        console.error(`[getCurrentVet] Unexpected error creating vet: ${cErr.message}`);
        throw cErr;
      }
    } else {
      vet = created as Vet;
      console.log(`[getCurrentVet] Successfully created new vet record: ${vet?.id}`);
    }
  }

  return { userId: user.id, profile: p as Profile, vet };
}
