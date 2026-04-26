-- ==============================================================================
-- SUPABASE AUTH MIGRATION
-- Use this to switch from Clerk-based RLS to native Supabase Auth RLS
-- ==============================================================================

-- 1. Ensure user_id is UUID for better compatibility with Supabase Auth
-- Note: This might require data migration if you have existing 'user_...' strings.
-- If you want to keep them as TEXT, Supabase auth.uid() still returns a UUID that can be cast to TEXT.

-- 2. Update the helper function to use native Supabase auth.uid()
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT auth.uid()::text;
$$;

-- 3. Update Policies to use auth.uid() directly (optional, but cleaner)
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can manage their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can manage their own customized resumes" ON public.customized_resumes;
DROP POLICY IF EXISTS "Users can manage their own base resume" ON public.base_resume;

CREATE POLICY "Users can manage their own preferences" 
ON public.user_preferences FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage their own jobs" 
ON public.jobs FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage their own customized resumes" 
ON public.customized_resumes FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage their own base resume" 
ON public.base_resume FOR ALL USING (user_id = auth.uid()::text);

-- 4. Enable public signups if not already enabled in Supabase Dashboard
-- This is usually handled in the Supabase UI under Authentication > Settings.
