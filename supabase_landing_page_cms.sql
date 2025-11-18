-- Landing Page CMS Setup
-- Run this in your Supabase SQL Editor

-- Ensure the landing_page_settings table exists with proper structure
CREATE TABLE IF NOT EXISTS public.landing_page_settings (
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

-- Enable RLS
ALTER TABLE public.landing_page_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for landing page to display)
CREATE POLICY "Allow public read" ON public.landing_page_settings
  FOR SELECT
  USING (true);

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated update" ON public.landing_page_settings
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert (for first time setup)
CREATE POLICY "Allow authenticated insert" ON public.landing_page_settings
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Insert default settings
INSERT INTO public.landing_page_settings (id, settings, created_by, updated_by)
VALUES (1, '{}'::jsonb, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;
