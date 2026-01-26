/**
 * Appointment Booking Utilities
 * Handles race condition prevention and conflict detection for appointment scheduling
 */

import { supabase } from '../supabaseClient';

export interface BookingConflictCheck {
  hasConflict: boolean;
  conflictType?: 'vet_busy' | 'owner_duplicate' | 'past_time';
  message?: string;
}

/**
 * Check if a time slot is available for booking
 * This performs a final check before insertion to minimize race conditions
 * 
 * @param veterinarianId - The vet ID
 * @param appointmentDate - Date in YYYY-MM-DD format
 * @param appointmentTime - Time in HH:MM format
 * @param ownerId - Pet owner ID (optional, for duplicate check)
 * @param patientId - Patient ID (optional, for duplicate check)
 * @returns Conflict check result
 */
export async function checkAppointmentConflict(
  veterinarianId: number,
  appointmentDate: string,
  appointmentTime: string,
  ownerId?: number,
  patientId?: number
): Promise<BookingConflictCheck> {
  try {
    // Check 1: Vet availability at this exact slot
    const { data: vetConflicts, error: vetError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('veterinarian_id', veterinarianId)
      .eq('appointment_date', appointmentDate)
      .eq('appointment_time', appointmentTime)
      .neq('status', 'cancelled')
      .limit(1);

    if (vetError) throw vetError;

    if (vetConflicts && vetConflicts.length > 0) {
      return {
        hasConflict: true,
        conflictType: 'vet_busy',
        message: 'This time slot is no longer available. Please select a different time.',
      };
    }

    // Check 2: Owner duplicate on same date (if provided)
    if (ownerId && patientId) {
      const { data: ownerConflicts, error: ownerError } = await supabase
        .from('appointments')
        .select('id')
        .eq('pet_owner_id', ownerId)
        .eq('patient_id', patientId)
        .eq('appointment_date', appointmentDate)
        .neq('status', 'cancelled')
        .limit(1);

      if (ownerError) throw ownerError;

      if (ownerConflicts && ownerConflicts.length > 0) {
        return {
          hasConflict: true,
          conflictType: 'owner_duplicate',
          message: 'You already have an appointment for this pet on this date.',
        };
      }
    }

    return { hasConflict: false };
  } catch (error) {
    console.error('Error checking appointment conflict:', error);
    // On error, assume conflict to be safe
    return {
      hasConflict: true,
      message: 'Unable to verify slot availability. Please try again.',
    };
  }
}

/**
 * Handle database constraint violation errors
 * Detects unique constraint violations from race conditions
 * 
 * @param error - Supabase error object
 * @returns True if this is a constraint violation error
 */
export function isConstraintViolation(error: any): boolean {
  if (!error) return false;
  
  // PostgreSQL unique violation error code
  if (error.code === '23505') return true;
  
  // Check error message for constraint name
  if (error.message?.includes('idx_appointments_unique_slot')) return true;
  if (error.message?.includes('duplicate key')) return true;
  
  return false;
}

/**
 * Refresh available time slots after a conflict
 * Fetches current appointments to update UI
 * 
 * @param veterinarianId - The vet ID
 * @param appointmentDate - Date in YYYY-MM-DD format
 * @returns Set of booked time slots
 */
export async function refreshAvailableSlots(
  veterinarianId: number,
  appointmentDate: string
): Promise<Set<string>> {
  try {
    const { data: appointments } = await supabase
      .from('appointments')
      .select('appointment_time, status')
      .eq('veterinarian_id', veterinarianId)
      .eq('appointment_date', appointmentDate)
      .neq('status', 'cancelled');

    return new Set((appointments || []).map((a: any) => a.appointment_time));
  } catch (error) {
    console.error('Error refreshing slots:', error);
    return new Set();
  }
}
