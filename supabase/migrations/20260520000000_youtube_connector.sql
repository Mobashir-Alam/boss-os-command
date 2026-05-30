-- YouTube Connector — schema for Tier 1 (API key) + Tier 2 (OAuth) groundwork.
--
-- Tier 1 covers: public channel stats, video metadata, public view/like/comment counts.
-- Tier 2 (built later) adds: revenue, watch time, demographics, retention. Tables
-- prepared here so we don't need another migration when OAuth lands.
--
-- Storage pattern matches the GitHub + Slack connectors:
--   - One *_channels table — current state per channel
--   - One *_videos table — current state per video (overwritten each sync)
--   - One *_video_snapshots table — daily time-series for trend computation
--   - One *_oauth table — per-channel OAuth refresh tokens (Tier 2)
--
-- Permissions:
--   SELECT: any authed user (matches the general "public data is shared internally" pattern)
--   INSERT/UPDATE/DELETE: founder + functional_head with department='social_media'
--     OR service role (used by edge functions)

-- ─────────────────────────────────────────────────────────────
-- 1. is_social_media_lead() helper
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_social_media_lead()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (
        role = 'founder'
        OR (role = 'functional_head' AND department = 'social_media')
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_social_media_lead() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_social_media_lead() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. connector_data_youtube_channels
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.connector_data_youtube_channels (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id        uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  channel_id        text        NOT NULL,        -- YouTube channel id (UCxxxx)
  handle            text,                         -- @nasheediobeats (if available)
  title             text,
  description       text,
  custom_url        text,
  country           text,
  thumbnail_url     text,
  subscriber_count  bigint      DEFAULT 0,
  view_count        bigint      DEFAULT 0,
  video_count       int         DEFAULT 0,
  uploads_playlist  text,                          -- the channel's "Uploads" playlist id
  channel_created   timestamptz,
  is_monetized      boolean     NOT NULL DEFAULT false, -- set when Tier 2 OAuth confirms partner status
  is_active         boolean     NOT NULL DEFAULT true,  -- HR/social_media can pause syncing a channel
  raw_payload       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at    timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, channel_id)
);

CREATE INDEX IF NOT EXISTS youtube_channels_startup_idx
  ON public.connector_data_youtube_channels (startup_id, is_active);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'youtube_channels_updated_at') THEN
    CREATE TRIGGER youtube_channels_updated_at
      BEFORE UPDATE ON public.connector_data_youtube_channels
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.connector_data_youtube_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "youtube_channels_select" ON public.connector_data_youtube_channels;
CREATE POLICY "youtube_channels_select" ON public.connector_data_youtube_channels
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "youtube_channels_write" ON public.connector_data_youtube_channels;
CREATE POLICY "youtube_channels_write" ON public.connector_data_youtube_channels
  FOR ALL USING (public.is_social_media_lead());

-- ─────────────────────────────────────────────────────────────
-- 3. connector_data_youtube_videos
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.connector_data_youtube_videos (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_uuid      uuid        NOT NULL REFERENCES public.connector_data_youtube_channels(id) ON DELETE CASCADE,
  video_id          text        NOT NULL,    -- YouTube video id (11 chars)
  title             text,
  description       text,
  thumbnail_url     text,
  published_at      timestamptz,
  duration_seconds  int,
  tags              text[]      NOT NULL DEFAULT '{}',
  category_id       text,
  privacy           text,                     -- public / unlisted / private
  -- Current stats (overwritten on each sync)
  view_count        bigint      NOT NULL DEFAULT 0,
  like_count        bigint      NOT NULL DEFAULT 0,
  comment_count     bigint      NOT NULL DEFAULT 0,
  raw_payload       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at    timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_uuid, video_id)
);

CREATE INDEX IF NOT EXISTS youtube_videos_channel_idx
  ON public.connector_data_youtube_videos (channel_uuid, published_at DESC);
CREATE INDEX IF NOT EXISTS youtube_videos_published_idx
  ON public.connector_data_youtube_videos (published_at DESC);
CREATE INDEX IF NOT EXISTS youtube_videos_views_idx
  ON public.connector_data_youtube_videos (view_count DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'youtube_videos_updated_at') THEN
    CREATE TRIGGER youtube_videos_updated_at
      BEFORE UPDATE ON public.connector_data_youtube_videos
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.connector_data_youtube_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "youtube_videos_select" ON public.connector_data_youtube_videos;
CREATE POLICY "youtube_videos_select" ON public.connector_data_youtube_videos
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "youtube_videos_write" ON public.connector_data_youtube_videos;
CREATE POLICY "youtube_videos_write" ON public.connector_data_youtube_videos
  FOR ALL USING (public.is_social_media_lead());

-- ─────────────────────────────────────────────────────────────
-- 4. connector_data_youtube_video_snapshots (time-series)
--    One row per (video, day) so we can compute view-velocity trends.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.connector_data_youtube_video_snapshots (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_uuid      uuid        NOT NULL REFERENCES public.connector_data_youtube_videos(id) ON DELETE CASCADE,
  snapshot_date   date        NOT NULL,
  view_count      bigint      NOT NULL DEFAULT 0,
  like_count      bigint      NOT NULL DEFAULT 0,
  comment_count   bigint      NOT NULL DEFAULT 0,
  -- delta_views = today's view_count - yesterday's view_count, set by sync function
  delta_views     bigint,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_uuid, snapshot_date)
);

CREATE INDEX IF NOT EXISTS youtube_snapshots_date_idx
  ON public.connector_data_youtube_video_snapshots (snapshot_date DESC);

ALTER TABLE public.connector_data_youtube_video_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "youtube_snapshots_select" ON public.connector_data_youtube_video_snapshots;
CREATE POLICY "youtube_snapshots_select" ON public.connector_data_youtube_video_snapshots
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "youtube_snapshots_write" ON public.connector_data_youtube_video_snapshots;
CREATE POLICY "youtube_snapshots_write" ON public.connector_data_youtube_video_snapshots
  FOR ALL USING (public.is_social_media_lead());

-- ─────────────────────────────────────────────────────────────
-- 5. connector_youtube_oauth (Tier 2 — table only, flow built later)
--    One row per (startup, channel) holding the OAuth tokens that
--    unlock YouTube Analytics + revenue. Filled by the OAuth callback
--    edge function when someone authorizes a channel.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.connector_youtube_oauth (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id        uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  channel_id        text        NOT NULL,
  access_token      text        NOT NULL,    -- short-lived
  refresh_token     text        NOT NULL,    -- long-lived, encrypted in production
  token_expires_at  timestamptz NOT NULL,
  scopes            text[]      NOT NULL DEFAULT '{}',
  authorized_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  authorized_at     timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, channel_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'youtube_oauth_updated_at') THEN
    CREATE TRIGGER youtube_oauth_updated_at
      BEFORE UPDATE ON public.connector_youtube_oauth
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.connector_youtube_oauth ENABLE ROW LEVEL SECURITY;

-- OAuth tokens are sensitive — no client access at all, only service role
DROP POLICY IF EXISTS "youtube_oauth_no_client" ON public.connector_youtube_oauth;
CREATE POLICY "youtube_oauth_no_client" ON public.connector_youtube_oauth
  FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- 6. Realtime (so dashboards update live after a sync run)
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.connector_data_youtube_channels;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.connector_data_youtube_videos;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
