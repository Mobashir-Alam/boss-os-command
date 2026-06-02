-- Fix: connector_youtube_oauth has RLS "USING (false)" to protect the tokens,
-- but that means the frontend can't see which channels are authorized — which
-- in turn means the "Analytics" tab + "Sync analytics" button never appear.
--
-- Solution: a SECURITY DEFINER function that returns ONLY the channel_id
-- column (no tokens, no secrets), gated so any authenticated user can call it.

CREATE OR REPLACE FUNCTION public.get_authorized_youtube_channels(p_startup_id uuid)
RETURNS TABLE(channel_id text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT channel_id
    FROM public.connector_youtube_oauth
   WHERE startup_id = p_startup_id;
$$;

REVOKE ALL ON FUNCTION public.get_authorized_youtube_channels(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_authorized_youtube_channels(uuid) TO authenticated;
