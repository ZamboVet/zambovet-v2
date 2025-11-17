-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.appointments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  pet_owner_id bigint,
  patient_id bigint,
  veterinarian_id bigint,
  clinic_id bigint,
  service_id bigint,
  appointment_date date NOT NULL,
  appointment_time time without time zone NOT NULL,
  estimated_duration integer DEFAULT 30,
  booking_type text CHECK (booking_type = ANY (ARRAY['web'::text, 'mobile_app'::text, 'walk_in'::text])),
  reason_for_visit text,
  symptoms text,
  notes text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])),
  is_approved boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  visit_notes text,
  visit_photos ARRAY DEFAULT '{}'::text[],
  follow_up_needed boolean DEFAULT false,
  next_visit_date date,
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id),
  CONSTRAINT appointments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT appointments_pet_owner_id_fkey FOREIGN KEY (pet_owner_id) REFERENCES public.pet_owner_profiles(id),
  CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT appointments_veterinarian_id_fkey FOREIGN KEY (veterinarian_id) REFERENCES public.veterinarians(id)
);
CREATE TABLE public.clinics (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  phone text,
  email text,
  latitude numeric,
  longitude numeric,
  operating_hours jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clinics_pkey PRIMARY KEY (id)
);
CREATE TABLE public.consultation_attachments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  consultation_id bigint NOT NULL,
  file_url text NOT NULL,
  label text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT consultation_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT consultation_attachments_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id)
);
CREATE TABLE public.consultation_diagnoses (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  consultation_id bigint NOT NULL,
  diagnosis_code text,
  diagnosis_text text NOT NULL,
  notes text,
  CONSTRAINT consultation_diagnoses_pkey PRIMARY KEY (id),
  CONSTRAINT consultation_diagnoses_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id)
);
CREATE TABLE public.consultation_labs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  consultation_id bigint NOT NULL,
  order_name text NOT NULL,
  status text DEFAULT 'ordered'::text CHECK (status = ANY (ARRAY['ordered'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  ordered_at timestamp with time zone DEFAULT now(),
  result_at timestamp with time zone,
  result_summary text,
  attachments ARRAY DEFAULT '{}'::text[],
  CONSTRAINT consultation_labs_pkey PRIMARY KEY (id),
  CONSTRAINT consultation_labs_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id)
);
CREATE TABLE public.consultation_prescriptions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  consultation_id bigint NOT NULL,
  medication_name text NOT NULL,
  dosage text,
  duration text,
  instructions text,
  refills integer DEFAULT 0,
  CONSTRAINT consultation_prescriptions_pkey PRIMARY KEY (id),
  CONSTRAINT consultation_prescriptions_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id)
);
CREATE TABLE public.consultation_vitals (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  consultation_id bigint NOT NULL,
  measured_at timestamp with time zone DEFAULT now(),
  weight numeric,
  temperature numeric,
  heart_rate integer,
  notes text,
  CONSTRAINT consultation_vitals_pkey PRIMARY KEY (id),
  CONSTRAINT consultation_vitals_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id)
);
CREATE TABLE public.consultations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  appointment_id bigint NOT NULL UNIQUE,
  veterinarian_id bigint NOT NULL,
  patient_id bigint NOT NULL,
  clinic_id bigint,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'in_progress'::text CHECK (status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'cancelled'::text])),
  chief_complaint text,
  soap_subjective text,
  soap_objective text,
  soap_assessment text,
  soap_plan text,
  follow_up_needed boolean DEFAULT false,
  next_visit_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT consultations_pkey PRIMARY KEY (id),
  CONSTRAINT consultations_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT consultations_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT consultations_veterinarian_id_fkey FOREIGN KEY (veterinarian_id) REFERENCES public.veterinarians(id),
  CONSTRAINT consultations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.landing_page_settings (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  settings jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT landing_page_settings_pkey PRIMARY KEY (id),
  CONSTRAINT landing_page_settings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT landing_page_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL,
  is_read boolean DEFAULT false,
  related_appointment_id bigint,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_related_appointment_id_fkey FOREIGN KEY (related_appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.otp_verification (
  id integer NOT NULL DEFAULT nextval('otp_verification_id_seq'::regclass),
  email character varying NOT NULL CHECK (email::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text),
  otp_code character varying NOT NULL CHECK (otp_code::text ~ '^[0-9]{6}$'::text),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  attempts integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  verification_data jsonb,
  CONSTRAINT otp_verification_pkey PRIMARY KEY (id)
);
CREATE TABLE public.owner_follows (
  follower_owner_id bigint NOT NULL,
  following_owner_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT owner_follows_pkey PRIMARY KEY (follower_owner_id, following_owner_id),
  CONSTRAINT owner_follows_follower_owner_id_fkey FOREIGN KEY (follower_owner_id) REFERENCES public.pet_owner_profiles(id),
  CONSTRAINT owner_follows_following_owner_id_fkey FOREIGN KEY (following_owner_id) REFERENCES public.pet_owner_profiles(id)
);
CREATE TABLE public.patients (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  owner_id bigint,
  name text NOT NULL,
  species text NOT NULL,
  breed text,
  gender text CHECK (gender = ANY (ARRAY['male'::text, 'female'::text])),
  date_of_birth date,
  weight numeric,
  vaccination_records jsonb DEFAULT '[]'::jsonb,
  medical_conditions ARRAY,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  profile_picture_url text,
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  CONSTRAINT patients_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.pet_owner_profiles(id)
);
CREATE TABLE public.pet_diary_entries (
  id integer NOT NULL DEFAULT nextval('pet_diary_entries_id_seq'::regclass),
  patient_id integer NOT NULL,
  pet_owner_id integer NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  title character varying,
  content text,
  mood character varying,
  activity_level character varying,
  appetite character varying,
  behavior_notes text,
  health_observations text,
  symptoms text,
  medication_given jsonb,
  feeding_notes text,
  weight numeric,
  temperature numeric,
  is_vet_visit_related boolean DEFAULT false,
  appointment_id integer,
  tags ARRAY,
  photos ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  entry_type character varying DEFAULT 'daily'::character varying CHECK (entry_type::text = ANY (ARRAY['daily'::character varying, 'milestone'::character varying, 'vet_visit'::character varying, 'special'::character varying]::text[])),
  activities ARRAY DEFAULT '{}'::text[],
  is_favorite boolean DEFAULT false,
  weather character varying,
  search_vector tsvector,
  CONSTRAINT pet_diary_entries_pkey PRIMARY KEY (id),
  CONSTRAINT pet_diary_entries_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT pet_diary_entries_pet_owner_id_fkey FOREIGN KEY (pet_owner_id) REFERENCES public.pet_owner_profiles(id),
  CONSTRAINT pet_diary_entries_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id)
);
CREATE TABLE public.pet_diary_photos (
  id integer NOT NULL DEFAULT nextval('pet_diary_photos_id_seq'::regclass),
  diary_entry_id integer NOT NULL,
  photo_url text NOT NULL,
  caption text,
  photo_type character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pet_diary_photos_pkey PRIMARY KEY (id),
  CONSTRAINT pet_diary_photos_diary_entry_id_fkey FOREIGN KEY (diary_entry_id) REFERENCES public.pet_diary_entries(id)
);
CREATE TABLE public.pet_diary_templates (
  id integer NOT NULL DEFAULT nextval('pet_diary_templates_id_seq'::regclass),
  name character varying NOT NULL,
  description text,
  template_data jsonb,
  category character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pet_diary_templates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pet_health_metrics (
  id integer NOT NULL DEFAULT nextval('pet_health_metrics_id_seq'::regclass),
  patient_id integer NOT NULL,
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,
  weight numeric,
  temperature numeric,
  heart_rate integer,
  respiratory_rate integer,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pet_health_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT pet_health_metrics_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.pet_medication_schedule (
  id integer NOT NULL DEFAULT nextval('pet_medication_schedule_id_seq'::regclass),
  patient_id integer NOT NULL,
  medication_name character varying NOT NULL,
  dosage character varying,
  frequency character varying,
  start_date date NOT NULL,
  end_date date,
  instructions text,
  prescribed_by character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pet_medication_schedule_pkey PRIMARY KEY (id),
  CONSTRAINT pet_medication_schedule_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.pet_owner_profiles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid UNIQUE,
  full_name text NOT NULL,
  phone text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  profile_picture_url text,
  CONSTRAINT pet_owner_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT pet_owner_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.pet_post_comments (
  id bigint NOT NULL DEFAULT nextval('pet_post_comments_id_seq'::regclass),
  post_id bigint NOT NULL,
  pet_owner_id bigint NOT NULL,
  parent_id bigint,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pet_post_comments_pkey PRIMARY KEY (id),
  CONSTRAINT pet_post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.pet_posts(id),
  CONSTRAINT pet_post_comments_pet_owner_id_fkey FOREIGN KEY (pet_owner_id) REFERENCES public.pet_owner_profiles(id),
  CONSTRAINT pet_post_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.pet_post_comments(id)
);
CREATE TABLE public.pet_post_media (
  id bigint NOT NULL DEFAULT nextval('pet_post_media_id_seq'::regclass),
  post_id bigint NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pet_post_media_pkey PRIMARY KEY (id),
  CONSTRAINT pet_post_media_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.pet_posts(id)
);
CREATE TABLE public.pet_post_reactions (
  id bigint NOT NULL DEFAULT nextval('pet_post_reactions_id_seq'::regclass),
  post_id bigint NOT NULL,
  pet_owner_id bigint NOT NULL,
  reaction text NOT NULL DEFAULT 'like'::text CHECK (reaction = ANY (ARRAY['like'::text, 'love'::text, 'care'::text, 'wow'::text, 'sad'::text, 'angry'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pet_post_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT pet_post_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.pet_posts(id),
  CONSTRAINT pet_post_reactions_pet_owner_id_fkey FOREIGN KEY (pet_owner_id) REFERENCES public.pet_owner_profiles(id)
);
CREATE TABLE public.pet_posts (
  id bigint NOT NULL DEFAULT nextval('pet_posts_id_seq'::regclass),
  pet_owner_id bigint NOT NULL,
  patient_id bigint,
  content text,
  media_count integer NOT NULL DEFAULT 0,
  visibility text NOT NULL DEFAULT 'owners_only'::text CHECK (visibility = ANY (ARRAY['public'::text, 'owners_only'::text, 'private'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pet_posts_pkey PRIMARY KEY (id),
  CONSTRAINT pet_posts_pet_owner_id_fkey FOREIGN KEY (pet_owner_id) REFERENCES public.pet_owner_profiles(id),
  CONSTRAINT pet_posts_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  phone text,
  user_role text NOT NULL CHECK (user_role = ANY (ARRAY['admin'::text, 'pet_owner'::text, 'veterinarian'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  verification_status text NOT NULL DEFAULT 'pending'::text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.reviews (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  pet_owner_id bigint,
  appointment_id bigint UNIQUE,
  veterinarian_id bigint,
  clinic_id bigint,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  service_rating integer CHECK (service_rating >= 1 AND service_rating <= 5),
  is_approved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT reviews_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT reviews_pet_owner_id_fkey FOREIGN KEY (pet_owner_id) REFERENCES public.pet_owner_profiles(id),
  CONSTRAINT reviews_veterinarian_id_fkey FOREIGN KEY (veterinarian_id) REFERENCES public.veterinarians(id)
);
CREATE TABLE public.services (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  clinic_id bigint,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT services_pkey PRIMARY KEY (id),
  CONSTRAINT services_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);
CREATE TABLE public.veterinarian_applications (
  id integer NOT NULL DEFAULT nextval('veterinarian_applications_id_seq'::regclass),
  email character varying NOT NULL UNIQUE,
  full_name character varying NOT NULL,
  phone character varying,
  specialization character varying,
  license_number character varying NOT NULL UNIQUE,
  clinic_id integer,
  business_permit_url text,
  professional_license_url text,
  government_id_url text,
  status character varying DEFAULT 'pending'::character varying,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT veterinarian_applications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.veterinarians (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  clinic_id bigint,
  full_name text NOT NULL,
  specialization text,
  license_number text UNIQUE,
  is_available boolean DEFAULT true,
  average_rating numeric DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT veterinarians_pkey PRIMARY KEY (id),
  CONSTRAINT veterinarians_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT veterinarians_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);