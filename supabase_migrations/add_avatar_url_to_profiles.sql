-- Migration: Add avatar_url column to profiles table
-- Applied via MCP on 2025-12-15

-- Add avatar_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add comment
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user profile picture stored in Supabase Storage';
