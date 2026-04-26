-- Fix RLS for user_preferences to allow INSERT
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;

CREATE POLICY "Users can manage their own preferences" 
ON public.user_preferences 
FOR ALL 
TO authenticated 
USING (user_id = requesting_user_id())
WITH CHECK (user_id = requesting_user_id());
