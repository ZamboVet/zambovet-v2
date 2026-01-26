-- Migration: Add Row Level Security (RLS) Policies
-- Purpose: Prevent IDOR (Insecure Direct Object Reference) vulnerabilities
-- This ensures users can only access their own data at the database level

-- ============================================================================
-- CRITICAL: Enable RLS on all tables
-- ============================================================================

-- Patients table - pets belong to owners
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Appointments table - appointments belong to owners and vets
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Pet Owner Profiles
ALTER TABLE public.pet_owner_profiles ENABLE ROW LEVEL SECURITY;

-- Veterinarians
ALTER TABLE public.veterinarians ENABLE ROW LEVEL SECURITY;

-- Pet Diary Entries
ALTER TABLE public.pet_diary_entries ENABLE ROW LEVEL SECURITY;

-- Pet Diary Photos
ALTER TABLE public.pet_diary_photos ENABLE ROW LEVEL SECURITY;

-- Pet Health Metrics
ALTER TABLE public.pet_health_metrics ENABLE ROW LEVEL SECURITY;

-- Pet Medication Schedule
ALTER TABLE public.pet_medication_schedule ENABLE ROW LEVEL SECURITY;

-- Pet Posts (social features)
ALTER TABLE public.pet_posts ENABLE ROW LEVEL SECURITY;

-- Pet Post Comments
ALTER TABLE public.pet_post_comments ENABLE ROW LEVEL SECURITY;

-- Pet Post Media
ALTER TABLE public.pet_post_media ENABLE ROW LEVEL SECURITY;

-- Pet Post Reactions
ALTER TABLE public.pet_post_reactions ENABLE ROW LEVEL SECURITY;

-- Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Consultations
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- Consultation sub-tables
ALTER TABLE public.consultation_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_attachments ENABLE ROW LEVEL SECURITY;

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Owner Follows
ALTER TABLE public.owner_follows ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PATIENTS TABLE POLICIES
-- ============================================================================

-- Pet owners can view their own pets
CREATE POLICY "Pet owners can view own pets" ON public.patients
FOR SELECT
USING (
  owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Pet owners can insert their own pets
CREATE POLICY "Pet owners can insert own pets" ON public.patients
FOR INSERT
WITH CHECK (
  owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Pet owners can update their own pets
CREATE POLICY "Pet owners can update own pets" ON public.patients
FOR UPDATE
USING (
  owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Pet owners can delete their own pets
CREATE POLICY "Pet owners can delete own pets" ON public.patients
FOR DELETE
USING (
  owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Veterinarians can view pets they have appointments with
CREATE POLICY "Veterinarians can view patients" ON public.patients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    INNER JOIN public.veterinarians v ON v.id = a.veterinarian_id
    WHERE a.patient_id = patients.id
      AND v.user_id = auth.uid()
  )
);

-- ============================================================================
-- APPOINTMENTS TABLE POLICIES
-- ============================================================================

-- Pet owners can view their own appointments
CREATE POLICY "Pet owners can view own appointments" ON public.appointments
FOR SELECT
USING (
  pet_owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Pet owners can insert their own appointments
CREATE POLICY "Pet owners can insert own appointments" ON public.appointments
FOR INSERT
WITH CHECK (
  pet_owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Pet owners can update their own appointments
CREATE POLICY "Pet owners can update own appointments" ON public.appointments
FOR UPDATE
USING (
  pet_owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Veterinarians can view their appointments
CREATE POLICY "Veterinarians can view their appointments" ON public.appointments
FOR SELECT
USING (
  veterinarian_id IN (
    SELECT id FROM public.veterinarians 
    WHERE user_id = auth.uid()
  )
);

-- Veterinarians can update their appointments
CREATE POLICY "Veterinarians can update their appointments" ON public.appointments
FOR UPDATE
USING (
  veterinarian_id IN (
    SELECT id FROM public.veterinarians 
    WHERE user_id = auth.uid()
  )
);

-- Admins can view all appointments
CREATE POLICY "Admins can view all appointments" ON public.appointments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_role = 'admin'
  )
);

-- ============================================================================
-- PET OWNER PROFILES POLICIES
-- ============================================================================

-- Users can view their own pet owner profile
CREATE POLICY "Users can view own pet owner profile" ON public.pet_owner_profiles
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own pet owner profile
CREATE POLICY "Users can insert own pet owner profile" ON public.pet_owner_profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own pet owner profile
CREATE POLICY "Users can update own pet owner profile" ON public.pet_owner_profiles
FOR UPDATE
USING (user_id = auth.uid());

-- Veterinarians can view pet owner profiles for their patients
CREATE POLICY "Vets can view owner profiles for their patients" ON public.pet_owner_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    INNER JOIN public.veterinarians v ON v.id = a.veterinarian_id
    WHERE a.pet_owner_id = pet_owner_profiles.id
      AND v.user_id = auth.uid()
  )
);

-- ============================================================================
-- VETERINARIANS POLICIES
-- ============================================================================

-- Users can view their own veterinarian profile
CREATE POLICY "Users can view own vet profile" ON public.veterinarians
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own veterinarian profile
CREATE POLICY "Users can insert own vet profile" ON public.veterinarians
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own veterinarian profile
CREATE POLICY "Users can update own vet profile" ON public.veterinarians
FOR UPDATE
USING (user_id = auth.uid());

-- Pet owners can view veterinarians (for booking)
CREATE POLICY "Pet owners can view veterinarians" ON public.veterinarians
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_role = 'pet_owner'
  )
);

-- ============================================================================
-- PET DIARY ENTRIES POLICIES
-- ============================================================================

-- Pet owners can view their own diary entries
CREATE POLICY "Pet owners can view own diary entries" ON public.pet_diary_entries
FOR SELECT
USING (
  pet_owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Pet owners can insert their own diary entries
CREATE POLICY "Pet owners can insert own diary entries" ON public.pet_diary_entries
FOR INSERT
WITH CHECK (
  pet_owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Pet owners can update their own diary entries
CREATE POLICY "Pet owners can update own diary entries" ON public.pet_diary_entries
FOR UPDATE
USING (
  pet_owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Pet owners can delete their own diary entries
CREATE POLICY "Pet owners can delete own diary entries" ON public.pet_diary_entries
FOR DELETE
USING (
  pet_owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- PET DIARY PHOTOS POLICIES
-- ============================================================================

-- Pet owners can view photos from their diary entries
CREATE POLICY "Pet owners can view own diary photos" ON public.pet_diary_photos
FOR SELECT
USING (
  diary_entry_id IN (
    SELECT id FROM public.pet_diary_entries 
    WHERE pet_owner_id IN (
      SELECT id FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Pet owners can insert photos to their diary entries
CREATE POLICY "Pet owners can insert own diary photos" ON public.pet_diary_photos
FOR INSERT
WITH CHECK (
  diary_entry_id IN (
    SELECT id FROM public.pet_diary_entries 
    WHERE pet_owner_id IN (
      SELECT id FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Pet owners can delete their diary photos
CREATE POLICY "Pet owners can delete own diary photos" ON public.pet_diary_photos
FOR DELETE
USING (
  diary_entry_id IN (
    SELECT id FROM public.pet_diary_entries 
    WHERE pet_owner_id IN (
      SELECT id FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- PET HEALTH METRICS POLICIES
-- ============================================================================

-- Pet owners can view health metrics for their pets
CREATE POLICY "Pet owners can view own pet health metrics" ON public.pet_health_metrics
FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM public.patients 
    WHERE owner_id IN (
      SELECT id FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Pet owners can insert health metrics for their pets
CREATE POLICY "Pet owners can insert own pet health metrics" ON public.pet_health_metrics
FOR INSERT
WITH CHECK (
  patient_id IN (
    SELECT id FROM public.patients 
    WHERE owner_id IN (
      SELECT id FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Veterinarians can view health metrics for their patients
CREATE POLICY "Vets can view patient health metrics" ON public.pet_health_metrics
FOR SELECT
USING (
  patient_id IN (
    SELECT DISTINCT a.patient_id FROM public.appointments a
    INNER JOIN public.veterinarians v ON v.id = a.veterinarian_id
    WHERE v.user_id = auth.uid()
  )
);

-- ============================================================================
-- PET MEDICATION SCHEDULE POLICIES
-- ============================================================================

-- Pet owners can manage medication schedules for their pets
CREATE POLICY "Pet owners can view own pet medications" ON public.pet_medication_schedule
FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM public.patients 
    WHERE owner_id IN (
      SELECT id FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Pet owners can insert own pet medications" ON public.pet_medication_schedule
FOR INSERT
WITH CHECK (
  patient_id IN (
    SELECT id FROM public.patients 
    WHERE owner_id IN (
      SELECT id FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Pet owners can update own pet medications" ON public.pet_medication_schedule
FOR UPDATE
USING (
  patient_id IN (
    SELECT id FROM public.patients 
    WHERE owner_id IN (
      SELECT id FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- CONSULTATIONS POLICIES
-- ============================================================================

-- Veterinarians can view their consultations
CREATE POLICY "Vets can view own consultations" ON public.consultations
FOR SELECT
USING (
  veterinarian_id IN (
    SELECT id FROM public.veterinarians 
    WHERE user_id = auth.uid()
  )
);

-- Veterinarians can insert their consultations
CREATE POLICY "Vets can insert own consultations" ON public.consultations
FOR INSERT
WITH CHECK (
  veterinarian_id IN (
    SELECT id FROM public.veterinarians 
    WHERE user_id = auth.uid()
  )
);

-- Veterinarians can update their consultations
CREATE POLICY "Vets can update own consultations" ON public.consultations
FOR UPDATE
USING (
  veterinarian_id IN (
    SELECT id FROM public.veterinarians 
    WHERE user_id = auth.uid()
  )
);

-- Pet owners can view consultations for their pets
CREATE POLICY "Pet owners can view own consultations" ON public.consultations
FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM public.patients 
    WHERE owner_id IN (
      SELECT id FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- CONSULTATION SUB-TABLES POLICIES
-- ============================================================================

-- Consultation Vitals
CREATE POLICY "Vets can manage consultation vitals" ON public.consultation_vitals
FOR ALL
USING (
  consultation_id IN (
    SELECT id FROM public.consultations 
    WHERE veterinarian_id IN (
      SELECT id FROM public.veterinarians 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Pet owners can view consultation vitals" ON public.consultation_vitals
FOR SELECT
USING (
  consultation_id IN (
    SELECT c.id FROM public.consultations c
    INNER JOIN public.patients p ON p.id = c.patient_id
    WHERE p.owner_id IN (
      SELECT id FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Consultation Diagnoses
CREATE POLICY "Vets can manage consultation diagnoses" ON public.consultation_diagnoses
FOR ALL
USING (
  consultation_id IN (
    SELECT id FROM public.consultations 
    WHERE veterinarian_id IN (
      SELECT id FROM public.veterinarians 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Pet owners can view consultation diagnoses" ON public.consultation_diagnoses
FOR SELECT
USING (
  consultation_id IN (
    SELECT c.id FROM public.consultations c
    INNER JOIN public.patients p ON p.id = c.patient_id
    WHERE p.owner_id IN (
      SELECT id FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Consultation Prescriptions
CREATE POLICY "Vets can manage consultation prescriptions" ON public.consultation_prescriptions
FOR ALL
USING (
  consultation_id IN (
    SELECT id FROM public.consultations 
    WHERE veterinarian_id IN (
      SELECT id FROM public.veterinarians 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Pet owners can view consultation prescriptions" ON public.consultation_prescriptions
FOR SELECT
USING (
  consultation_id IN (
    SELECT c.id FROM public.consultations c
    INNER JOIN public.patients p ON p.id = c.patient_id
    WHERE p.owner_id IN (
      SELECT id FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Consultation Labs
CREATE POLICY "Vets can manage consultation labs" ON public.consultation_labs
FOR ALL
USING (
  consultation_id IN (
    SELECT id FROM public.consultations 
    WHERE veterinarian_id IN (
      SELECT id FROM public.veterinarians 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Pet owners can view consultation labs" ON public.consultation_labs
FOR SELECT
USING (
  consultation_id IN (
    SELECT c.id FROM public.consultations c
    INNER JOIN public.patients p ON p.id = c.patient_id
    WHERE p.owner_id IN (
      SELECT id FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Consultation Attachments
CREATE POLICY "Vets can manage consultation attachments" ON public.consultation_attachments
FOR ALL
USING (
  consultation_id IN (
    SELECT id FROM public.consultations 
    WHERE veterinarian_id IN (
      SELECT id FROM public.veterinarians 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Pet owners can view consultation attachments" ON public.consultation_attachments
FOR SELECT
USING (
  consultation_id IN (
    SELECT c.id FROM public.consultations c
    INNER JOIN public.patients p ON p.id = c.patient_id
    WHERE p.owner_id IN (
      SELECT id FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- REVIEWS POLICIES
-- ============================================================================

-- Pet owners can view and manage their own reviews
CREATE POLICY "Pet owners can manage own reviews" ON public.reviews
FOR ALL
USING (
  pet_owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Veterinarians can view reviews about them
CREATE POLICY "Vets can view reviews about them" ON public.reviews
FOR SELECT
USING (
  veterinarian_id IN (
    SELECT id FROM public.veterinarians 
    WHERE user_id = auth.uid()
  )
);

-- Public can view approved reviews
CREATE POLICY "Public can view reviews" ON public.reviews
FOR SELECT
USING (true);

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT
USING (
  user_id IN (
    SELECT id FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE
USING (
  user_id IN (
    SELECT id FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- System can insert notifications for users
CREATE POLICY "System can insert notifications" ON public.notifications
FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- PET POSTS POLICIES (Social Features)
-- ============================================================================

-- Pet owners can manage their own posts
CREATE POLICY "Pet owners can manage own posts" ON public.pet_posts
FOR ALL
USING (
  pet_owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Pet owners can view posts based on visibility
CREATE POLICY "Pet owners can view posts" ON public.pet_posts
FOR SELECT
USING (
  visibility = 'public' OR
  (visibility = 'owners_only' AND EXISTS (
    SELECT 1 FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )) OR
  pet_owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- PET POST COMMENTS POLICIES
-- ============================================================================

-- Pet owners can manage their own comments
CREATE POLICY "Pet owners can manage own comments" ON public.pet_post_comments
FOR ALL
USING (
  pet_owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Pet owners can view comments on visible posts
CREATE POLICY "Pet owners can view comments" ON public.pet_post_comments
FOR SELECT
USING (
  post_id IN (
    SELECT id FROM public.pet_posts 
    WHERE visibility = 'public' OR
    (visibility = 'owners_only' AND EXISTS (
      SELECT 1 FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    ))
  )
);

-- ============================================================================
-- PET POST MEDIA POLICIES
-- ============================================================================

-- Post media inherits post permissions
CREATE POLICY "Pet owners can manage own post media" ON public.pet_post_media
FOR ALL
USING (
  post_id IN (
    SELECT id FROM public.pet_posts 
    WHERE pet_owner_id IN (
      SELECT id FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Pet owners can view post media" ON public.pet_post_media
FOR SELECT
USING (
  post_id IN (
    SELECT id FROM public.pet_posts 
    WHERE visibility = 'public' OR
    (visibility = 'owners_only' AND EXISTS (
      SELECT 1 FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    ))
  )
);

-- ============================================================================
-- PET POST REACTIONS POLICIES
-- ============================================================================

-- Pet owners can manage their own reactions
CREATE POLICY "Pet owners can manage own reactions" ON public.pet_post_reactions
FOR ALL
USING (
  pet_owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Pet owners can view reactions on visible posts
CREATE POLICY "Pet owners can view reactions" ON public.pet_post_reactions
FOR SELECT
USING (
  post_id IN (
    SELECT id FROM public.pet_posts 
    WHERE visibility = 'public' OR
    (visibility = 'owners_only' AND EXISTS (
      SELECT 1 FROM public.pet_owner_profiles 
      WHERE user_id = auth.uid()
    ))
  )
);

-- ============================================================================
-- OWNER FOLLOWS POLICIES
-- ============================================================================

-- Pet owners can manage their own follows
CREATE POLICY "Pet owners can manage own follows" ON public.owner_follows
FOR ALL
USING (
  follower_owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Pet owners can view who follows them
CREATE POLICY "Pet owners can view followers" ON public.owner_follows
FOR SELECT
USING (
  following_owner_id IN (
    SELECT id FROM public.pet_owner_profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Pet owners can view own pets" ON public.patients IS 
'Prevents IDOR: Pet owners can only view their own pets, not other users pets';

COMMENT ON POLICY "Pet owners can view own appointments" ON public.appointments IS 
'Prevents IDOR: Pet owners can only view their own appointments';

COMMENT ON POLICY "Veterinarians can view their appointments" ON public.appointments IS 
'Allows veterinarians to view appointments assigned to them';

COMMENT ON POLICY "Pet owners can view own diary entries" ON public.pet_diary_entries IS 
'Prevents IDOR: Pet owners can only access their own diary entries';

COMMENT ON POLICY "Vets can view own consultations" ON public.consultations IS 
'Prevents IDOR: Veterinarians can only view consultations they created';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries after migration to verify RLS is working:

-- 1. Check all tables have RLS enabled
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('patients', 'appointments', 'consultations', 'pet_diary_entries')
-- ORDER BY tablename;

-- 2. List all RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;

-- 3. Test IDOR protection (as pet_owner user)
-- SELECT * FROM patients WHERE id = 999; -- Should only return if you own pet 999

-- 4. Test cross-user access (should return no rows if RLS working)
-- SELECT * FROM patients WHERE owner_id != (SELECT id FROM pet_owner_profiles WHERE user_id = auth.uid());
