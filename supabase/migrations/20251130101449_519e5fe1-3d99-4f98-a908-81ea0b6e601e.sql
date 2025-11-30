-- Fix search_path for get_current_user_id function
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
$$;