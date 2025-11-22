-- Create device_tokens table for push notifications
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, token, platform)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON public.device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON public.device_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_device_tokens_is_active ON public.device_tokens(is_active);

-- Enable RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own device tokens
CREATE POLICY "Users can view own device tokens" ON public.device_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own device tokens
CREATE POLICY "Users can insert own device tokens" ON public.device_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own device tokens
CREATE POLICY "Users can update own device tokens" ON public.device_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own device tokens
CREATE POLICY "Users can delete own device tokens" ON public.device_tokens
  FOR DELETE USING (auth.uid() = user_id);
