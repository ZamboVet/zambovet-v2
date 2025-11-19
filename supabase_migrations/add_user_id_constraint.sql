-- Migration: Add NOT NULL constraint to veterinarians.user_id
-- This ensures all future veterinarian records must have a user_id

-- Step 1: First, run the data repair to fix existing NULL values
-- Navigate to /admin/data-repair and click "Run Repair"

-- Step 2: After all NULL values are fixed, run this migration:

-- Add NOT NULL constraint to user_id column
ALTER TABLE public.veterinarians
ALTER COLUMN user_id SET NOT NULL;

-- Add a unique constraint on user_id if not already present
-- (This prevents duplicate vet records per user)
ALTER TABLE public.veterinarians
ADD CONSTRAINT veterinarians_user_id_unique UNIQUE (user_id);

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_veterinarians_user_id ON public.veterinarians(user_id);

-- Verify the changes
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'veterinarians' AND column_name = 'user_id';
