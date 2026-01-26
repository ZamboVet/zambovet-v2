-- Migration: Add multi-pet appointment support
-- Purpose: Allow multiple pets per appointment via junction table
-- Date: 2026-01-27

-- Create junction table for appointment-patient relationships
CREATE TABLE IF NOT EXISTS public.appointment_patients (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_id bigint NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id bigint NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(appointment_id, patient_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointment_patients_appointment_id ON public.appointment_patients(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_patients_patient_id ON public.appointment_patients(patient_id);

-- Add comments for documentation
COMMENT ON TABLE public.appointment_patients IS 'Junction table linking appointments to multiple patients (pets)';
COMMENT ON COLUMN public.appointment_patients.appointment_id IS 'Reference to the appointment';
COMMENT ON COLUMN public.appointment_patients.patient_id IS 'Reference to the patient (pet)';

-- Migrate existing single-pet appointments to junction table
INSERT INTO public.appointment_patients (appointment_id, patient_id)
SELECT id, patient_id
FROM public.appointments
WHERE patient_id IS NOT NULL
ON CONFLICT (appointment_id, patient_id) DO NOTHING;

-- Note: We keep the patient_id column in appointments table for backward compatibility
-- It will be deprecated in future but maintained for now to avoid breaking existing queries
COMMENT ON COLUMN public.appointments.patient_id IS 'DEPRECATED: Use appointment_patients junction table for multi-pet support. Kept for backward compatibility.';
