-- Create a function to check if email exists (bypasses RLS)
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
BEGIN
  -- Check if email exists in profiles table
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE LOWER(email) = LOWER(email_to_check)
    LIMIT 1
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if email exists in veterinarian_applications table
  IF EXISTS (
    SELECT 1 FROM public.veterinarian_applications 
    WHERE LOWER(email) = LOWER(email_to_check)
    LIMIT 1
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;
