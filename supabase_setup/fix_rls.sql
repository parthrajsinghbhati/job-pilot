-- Fix the requesting_user_id function to correctly parse the JWT JSON payload
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$$;
