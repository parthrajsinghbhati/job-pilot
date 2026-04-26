-- ==============================================================================
-- PHASE 1: SUPABASE MULTI-TENANCY MIGRATION FOR CLERK
-- Run this entire script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Create the new User Preferences table
-- This replaces config.py so every user has their own search settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id TEXT PRIMARY KEY,
    linkedin_search_queries TEXT[] DEFAULT '{}',
    careers_future_search_queries TEXT[] DEFAULT '{}',
    location TEXT DEFAULT 'Singapore',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add 'user_id' column to all existing tables
-- We use TEXT because Clerk user IDs look like 'user_2xyz...'
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.customized_resumes ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.base_resume ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 3. Helper Function to read the Clerk JWT token securely
-- This tells Supabase who the logged-in React user is
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claim.sub', true),
    ''
  )::text;
$$;

-- 4. Enable Row Level Security (RLS) on all tables
-- This physically prevents users from accessing each other's data
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customized_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_resume ENABLE ROW LEVEL SECURITY;

-- 5. Drop any existing restrictive policies (safety check)
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can manage their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can manage their own customized resumes" ON public.customized_resumes;
DROP POLICY IF EXISTS "Users can manage their own base resume" ON public.base_resume;

-- 6. Create the RLS Security Policies
-- Users can only read/insert/update/delete rows where user_id matches their Clerk ID
CREATE POLICY "Users can manage their own preferences" 
ON public.user_preferences FOR ALL USING (user_id = requesting_user_id());

CREATE POLICY "Users can manage their own jobs" 
ON public.jobs FOR ALL USING (user_id = requesting_user_id());

CREATE POLICY "Users can manage their own customized resumes" 
ON public.customized_resumes FOR ALL USING (user_id = requesting_user_id());

CREATE POLICY "Users can manage their own base resume" 
ON public.base_resume FOR ALL USING (user_id = requesting_user_id());

-- 7. Grant access to authenticated users
GRANT ALL ON TABLE public.user_preferences TO authenticated;
