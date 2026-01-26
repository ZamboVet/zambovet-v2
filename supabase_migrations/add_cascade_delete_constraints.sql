-- Migration: Add CASCADE DELETE constraints to prevent orphaned records
-- Purpose: Ensure that when a user/profile is deleted, all related records are automatically cleaned up
-- This prevents "dead data" accumulation in the database

-- ============================================================================
-- STEP 1: Drop existing foreign key constraints (without CASCADE)
-- ============================================================================

-- Patients table
ALTER TABLE public.patients
DROP CONSTRAINT IF EXISTS patients_owner_id_fkey;

-- Pet Owner Profiles table
ALTER TABLE public.pet_owner_profiles
DROP CONSTRAINT IF EXISTS pet_owner_profiles_user_id_fkey;

-- Appointments table
ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS appointments_pet_owner_id_fkey,
DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;

-- Pet Diary Entries table
ALTER TABLE public.pet_diary_entries
DROP CONSTRAINT IF EXISTS pet_diary_entries_patient_id_fkey,
DROP CONSTRAINT IF EXISTS pet_diary_entries_pet_owner_id_fkey,
DROP CONSTRAINT IF EXISTS pet_diary_entries_appointment_id_fkey;

-- Pet Diary Photos table
ALTER TABLE public.pet_diary_photos
DROP CONSTRAINT IF EXISTS pet_diary_photos_diary_entry_id_fkey;

-- Pet Health Metrics table
ALTER TABLE public.pet_health_metrics
DROP CONSTRAINT IF EXISTS pet_health_metrics_patient_id_fkey;

-- Pet Medication Schedule table
ALTER TABLE public.pet_medication_schedule
DROP CONSTRAINT IF EXISTS pet_medication_schedule_patient_id_fkey;

-- Pet Posts table
ALTER TABLE public.pet_posts
DROP CONSTRAINT IF EXISTS pet_posts_pet_owner_id_fkey,
DROP CONSTRAINT IF EXISTS pet_posts_patient_id_fkey;

-- Pet Post Comments table
ALTER TABLE public.pet_post_comments
DROP CONSTRAINT IF EXISTS pet_post_comments_post_id_fkey,
DROP CONSTRAINT IF EXISTS pet_post_comments_pet_owner_id_fkey,
DROP CONSTRAINT IF EXISTS pet_post_comments_parent_id_fkey;

-- Pet Post Media table
ALTER TABLE public.pet_post_media
DROP CONSTRAINT IF EXISTS pet_post_media_post_id_fkey;

-- Pet Post Reactions table
ALTER TABLE public.pet_post_reactions
DROP CONSTRAINT IF EXISTS pet_post_reactions_post_id_fkey,
DROP CONSTRAINT IF EXISTS pet_post_reactions_pet_owner_id_fkey;

-- Owner Follows table
ALTER TABLE public.owner_follows
DROP CONSTRAINT IF EXISTS owner_follows_follower_owner_id_fkey,
DROP CONSTRAINT IF EXISTS owner_follows_following_owner_id_fkey;

-- Reviews table
ALTER TABLE public.reviews
DROP CONSTRAINT IF EXISTS reviews_pet_owner_id_fkey,
DROP CONSTRAINT IF EXISTS reviews_appointment_id_fkey;

-- Consultations table
ALTER TABLE public.consultations
DROP CONSTRAINT IF EXISTS consultations_appointment_id_fkey,
DROP CONSTRAINT IF EXISTS consultations_patient_id_fkey;

-- Consultation Attachments table
ALTER TABLE public.consultation_attachments
DROP CONSTRAINT IF EXISTS consultation_attachments_consultation_id_fkey;

-- Consultation Diagnoses table
ALTER TABLE public.consultation_diagnoses
DROP CONSTRAINT IF EXISTS consultation_diagnoses_consultation_id_fkey;

-- Consultation Labs table
ALTER TABLE public.consultation_labs
DROP CONSTRAINT IF EXISTS consultation_labs_consultation_id_fkey;

-- Consultation Prescriptions table
ALTER TABLE public.consultation_prescriptions
DROP CONSTRAINT IF EXISTS consultation_prescriptions_consultation_id_fkey;

-- Consultation Vitals table
ALTER TABLE public.consultation_vitals
DROP CONSTRAINT IF EXISTS consultation_vitals_consultation_id_fkey;

-- Notifications table
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
DROP CONSTRAINT IF EXISTS notifications_related_appointment_id_fkey;

-- ============================================================================
-- STEP 2: Add new foreign key constraints WITH CASCADE DELETE
-- ============================================================================

-- Pet Owner Profiles -> Profiles (CASCADE: delete owner profile when user deleted)
ALTER TABLE public.pet_owner_profiles
ADD CONSTRAINT pet_owner_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Patients -> Pet Owner Profiles (CASCADE: delete pets when owner deleted)
ALTER TABLE public.patients
ADD CONSTRAINT patients_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES public.pet_owner_profiles(id) ON DELETE CASCADE;

-- Appointments -> Pet Owner Profiles (CASCADE: delete appointments when owner deleted)
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_pet_owner_id_fkey 
FOREIGN KEY (pet_owner_id) REFERENCES public.pet_owner_profiles(id) ON DELETE CASCADE;

-- Appointments -> Patients (CASCADE: delete appointments when pet deleted)
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

-- Pet Diary Entries -> Patients (CASCADE: delete diary when pet deleted)
ALTER TABLE public.pet_diary_entries
ADD CONSTRAINT pet_diary_entries_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

-- Pet Diary Entries -> Pet Owner Profiles (CASCADE: delete diary when owner deleted)
ALTER TABLE public.pet_diary_entries
ADD CONSTRAINT pet_diary_entries_pet_owner_id_fkey 
FOREIGN KEY (pet_owner_id) REFERENCES public.pet_owner_profiles(id) ON DELETE CASCADE;

-- Pet Diary Entries -> Appointments (SET NULL: keep diary entry if appointment deleted)
ALTER TABLE public.pet_diary_entries
ADD CONSTRAINT pet_diary_entries_appointment_id_fkey 
FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;

-- Pet Diary Photos -> Pet Diary Entries (CASCADE: delete photos when diary entry deleted)
ALTER TABLE public.pet_diary_photos
ADD CONSTRAINT pet_diary_photos_diary_entry_id_fkey 
FOREIGN KEY (diary_entry_id) REFERENCES public.pet_diary_entries(id) ON DELETE CASCADE;

-- Pet Health Metrics -> Patients (CASCADE: delete metrics when pet deleted)
ALTER TABLE public.pet_health_metrics
ADD CONSTRAINT pet_health_metrics_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

-- Pet Medication Schedule -> Patients (CASCADE: delete schedule when pet deleted)
ALTER TABLE public.pet_medication_schedule
ADD CONSTRAINT pet_medication_schedule_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

-- Pet Posts -> Pet Owner Profiles (CASCADE: delete posts when owner deleted)
ALTER TABLE public.pet_posts
ADD CONSTRAINT pet_posts_pet_owner_id_fkey 
FOREIGN KEY (pet_owner_id) REFERENCES public.pet_owner_profiles(id) ON DELETE CASCADE;

-- Pet Posts -> Patients (SET NULL: keep post if pet deleted, just remove pet reference)
ALTER TABLE public.pet_posts
ADD CONSTRAINT pet_posts_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;

-- Pet Post Comments -> Pet Posts (CASCADE: delete comments when post deleted)
ALTER TABLE public.pet_post_comments
ADD CONSTRAINT pet_post_comments_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES public.pet_posts(id) ON DELETE CASCADE;

-- Pet Post Comments -> Pet Owner Profiles (CASCADE: delete comments when owner deleted)
ALTER TABLE public.pet_post_comments
ADD CONSTRAINT pet_post_comments_pet_owner_id_fkey 
FOREIGN KEY (pet_owner_id) REFERENCES public.pet_owner_profiles(id) ON DELETE CASCADE;

-- Pet Post Comments -> Pet Post Comments (CASCADE: delete replies when parent comment deleted)
ALTER TABLE public.pet_post_comments
ADD CONSTRAINT pet_post_comments_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES public.pet_post_comments(id) ON DELETE CASCADE;

-- Pet Post Media -> Pet Posts (CASCADE: delete media when post deleted)
ALTER TABLE public.pet_post_media
ADD CONSTRAINT pet_post_media_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES public.pet_posts(id) ON DELETE CASCADE;

-- Pet Post Reactions -> Pet Posts (CASCADE: delete reactions when post deleted)
ALTER TABLE public.pet_post_reactions
ADD CONSTRAINT pet_post_reactions_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES public.pet_posts(id) ON DELETE CASCADE;

-- Pet Post Reactions -> Pet Owner Profiles (CASCADE: delete reactions when owner deleted)
ALTER TABLE public.pet_post_reactions
ADD CONSTRAINT pet_post_reactions_pet_owner_id_fkey 
FOREIGN KEY (pet_owner_id) REFERENCES public.pet_owner_profiles(id) ON DELETE CASCADE;

-- Owner Follows -> Pet Owner Profiles (CASCADE: delete follows when either owner deleted)
ALTER TABLE public.owner_follows
ADD CONSTRAINT owner_follows_follower_owner_id_fkey 
FOREIGN KEY (follower_owner_id) REFERENCES public.pet_owner_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.owner_follows
ADD CONSTRAINT owner_follows_following_owner_id_fkey 
FOREIGN KEY (following_owner_id) REFERENCES public.pet_owner_profiles(id) ON DELETE CASCADE;

-- Reviews -> Pet Owner Profiles (CASCADE: delete reviews when owner deleted)
ALTER TABLE public.reviews
ADD CONSTRAINT reviews_pet_owner_id_fkey 
FOREIGN KEY (pet_owner_id) REFERENCES public.pet_owner_profiles(id) ON DELETE CASCADE;

-- Reviews -> Appointments (SET NULL: keep review if appointment deleted)
ALTER TABLE public.reviews
ADD CONSTRAINT reviews_appointment_id_fkey 
FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;

-- Consultations -> Appointments (CASCADE: delete consultation when appointment deleted)
ALTER TABLE public.consultations
ADD CONSTRAINT consultations_appointment_id_fkey 
FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;

-- Consultations -> Patients (CASCADE: delete consultation when pet deleted)
ALTER TABLE public.consultations
ADD CONSTRAINT consultations_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

-- Consultation Attachments -> Consultations (CASCADE: delete attachments when consultation deleted)
ALTER TABLE public.consultation_attachments
ADD CONSTRAINT consultation_attachments_consultation_id_fkey 
FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE CASCADE;

-- Consultation Diagnoses -> Consultations (CASCADE: delete diagnoses when consultation deleted)
ALTER TABLE public.consultation_diagnoses
ADD CONSTRAINT consultation_diagnoses_consultation_id_fkey 
FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE CASCADE;

-- Consultation Labs -> Consultations (CASCADE: delete labs when consultation deleted)
ALTER TABLE public.consultation_labs
ADD CONSTRAINT consultation_labs_consultation_id_fkey 
FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE CASCADE;

-- Consultation Prescriptions -> Consultations (CASCADE: delete prescriptions when consultation deleted)
ALTER TABLE public.consultation_prescriptions
ADD CONSTRAINT consultation_prescriptions_consultation_id_fkey 
FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE CASCADE;

-- Consultation Vitals -> Consultations (CASCADE: delete vitals when consultation deleted)
ALTER TABLE public.consultation_vitals
ADD CONSTRAINT consultation_vitals_consultation_id_fkey 
FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE CASCADE;

-- Notifications -> Profiles (CASCADE: delete notifications when user deleted)
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Notifications -> Appointments (SET NULL: keep notification if appointment deleted)
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_related_appointment_id_fkey 
FOREIGN KEY (related_appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 3: Add comments explaining the cascade behavior
-- ============================================================================

COMMENT ON CONSTRAINT pet_owner_profiles_user_id_fkey ON public.pet_owner_profiles IS 
'CASCADE DELETE: When a user profile is deleted, automatically delete the pet owner profile';

COMMENT ON CONSTRAINT patients_owner_id_fkey ON public.patients IS 
'CASCADE DELETE: When a pet owner is deleted, automatically delete all their pets';

COMMENT ON CONSTRAINT appointments_pet_owner_id_fkey ON public.appointments IS 
'CASCADE DELETE: When a pet owner is deleted, automatically delete all their appointments';

COMMENT ON CONSTRAINT appointments_patient_id_fkey ON public.appointments IS 
'CASCADE DELETE: When a pet is deleted, automatically delete all its appointments';

COMMENT ON CONSTRAINT pet_diary_entries_patient_id_fkey ON public.pet_diary_entries IS 
'CASCADE DELETE: When a pet is deleted, automatically delete all its diary entries';

COMMENT ON CONSTRAINT pet_health_metrics_patient_id_fkey ON public.pet_health_metrics IS 
'CASCADE DELETE: When a pet is deleted, automatically delete all its health metrics';

COMMENT ON CONSTRAINT consultations_appointment_id_fkey ON public.consultations IS 
'CASCADE DELETE: When an appointment is deleted, automatically delete its consultation record';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries after migration to verify cascade delete is working:

-- 1. Check all foreign keys have proper ON DELETE actions
-- SELECT 
--   tc.table_name, 
--   kcu.column_name, 
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name,
--   rc.delete_rule
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- JOIN information_schema.referential_constraints AS rc
--   ON tc.constraint_name = rc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_schema = 'public'
--   AND tc.table_name IN ('patients', 'appointments', 'pet_diary_entries', 'consultations')
-- ORDER BY tc.table_name, kcu.column_name;

-- 2. Test cascade delete (in a transaction, rollback after testing)
-- BEGIN;
-- -- Create test user and records
-- -- Delete user
-- -- Verify all related records are gone
-- ROLLBACK;
