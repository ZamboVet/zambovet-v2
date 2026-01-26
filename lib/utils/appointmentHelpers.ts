import { supabase } from "../supabaseClient";

/**
 * Fetch all pets associated with an appointment via the junction table
 */
export async function getAppointmentPets(appointmentId: number) {
  try {
    const { data, error } = await supabase
      .from("appointment_patients")
      .select(`
        patient_id,
        patients:patient_id (
          id,
          name,
          species,
          breed
        )
      `)
      .eq("appointment_id", appointmentId);

    if (error) throw error;

    return (data || []).map((item: any) => item.patients).filter(Boolean);
  } catch (err) {
    console.error("Error fetching appointment pets:", err);
    return [];
  }
}

/**
 * Fetch appointments with their associated pets
 */
export async function getAppointmentsWithPets(appointmentIds: number[]) {
  if (appointmentIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from("appointment_patients")
      .select(`
        appointment_id,
        patients:patient_id (
          id,
          name,
          species,
          breed
        )
      `)
      .in("appointment_id", appointmentIds);

    if (error) throw error;

    // Group pets by appointment_id
    const grouped: Record<number, any[]> = {};
    (data || []).forEach((item: any) => {
      if (!grouped[item.appointment_id]) {
        grouped[item.appointment_id] = [];
      }
      if (item.patients) {
        grouped[item.appointment_id].push(item.patients);
      }
    });

    return grouped;
  } catch (err) {
    console.error("Error fetching appointments with pets:", err);
    return {};
  }
}

/**
 * Format pet names for display
 */
export function formatPetNames(pets: any[]): string {
  if (!pets || pets.length === 0) return "No pets";
  if (pets.length === 1) return pets[0].name;
  if (pets.length === 2) return `${pets[0].name} & ${pets[1].name}`;
  return `${pets[0].name} & ${pets.length - 1} more`;
}

/**
 * Get pet count badge text
 */
export function getPetCountBadge(petCount: number): string {
  if (petCount <= 1) return "";
  return `${petCount} pets`;
}
