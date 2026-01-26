-- Migration: Add clinic profile enhancement fields
-- Purpose: Add images, description, services, and specializations to clinics table
-- Date: 2026-01-27

-- Add new columns to clinics table
ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS profile_image_url text,
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS services text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS specializations text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS established_year integer,
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS social_media jsonb DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.clinics.description IS 'Detailed description of the clinic, services, and background';
COMMENT ON COLUMN public.clinics.profile_image_url IS 'URL to clinic logo or profile image';
COMMENT ON COLUMN public.clinics.cover_image_url IS 'URL to clinic exterior/interior cover photo';
COMMENT ON COLUMN public.clinics.services IS 'Array of services offered (e.g., Surgery, Vaccination, Grooming)';
COMMENT ON COLUMN public.clinics.specializations IS 'Array of specializations (e.g., Small Animals, Exotic Pets, Emergency Care)';
COMMENT ON COLUMN public.clinics.established_year IS 'Year the clinic was established';
COMMENT ON COLUMN public.clinics.website_url IS 'Clinic website URL';
COMMENT ON COLUMN public.clinics.social_media IS 'JSON object with social media links (facebook, instagram, etc.)';

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_clinics_services ON public.clinics USING GIN (services);
CREATE INDEX IF NOT EXISTS idx_clinics_specializations ON public.clinics USING GIN (specializations);

-- Sample data update (optional - for testing)
-- UPDATE public.clinics 
-- SET 
--   description = 'A full-service veterinary clinic providing comprehensive care for your beloved pets.',
--   services = ARRAY['General Checkup', 'Vaccination', 'Surgery', 'Dental Care', 'Grooming'],
--   specializations = ARRAY['Small Animals', 'Dogs', 'Cats'],
--   established_year = 2010
-- WHERE id = 1;
