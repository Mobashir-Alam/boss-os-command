-- Full per-person Slack message archive.
--
-- Powers the People-tab person profile popup (every message a person sent in
-- any channel). slack-sync persists all messages it already iterates here.
--
-- PRIVACY: unlike connector_data_slack (curated top messages, broad read),
-- this is a complete message archive — so SELECT is restricted to the social
-- media lead / founder via is_social_media_lead(). The Slack dashboard route
-- is already SocialMediaGuard-gated, matching who can reach the UI.
CREATE TABLE IF NOT EXISTS public.connector_data_slack_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  user_id_source  text        NOT NULL,
  display_name    text,
  channel_id      text        NOT NULL,
  channel_name    text,
  message_ts      text        NOT NULL,
  posted_at       timestamptz,
  message_date    date,
  text            text,
  thread_ts       text,
  reaction_count  int         NOT NULL DEFAULT 0,
  reply_count     int         NOT NULL DEFAULT 0,
  has_files       boolean     NOT NULL DEFAULT false,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, channel_id, message_ts)
);

CREATE INDEX IF NOT EXISTS slack_messages_user_idx
  ON public.connector_data_slack_messages (startup_id, user_id_source, posted_at DESC);

ALTER TABLE public.connector_data_slack_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slack_messages_select" ON public.connector_data_slack_messages;
CREATE POLICY "slack_messages_select" ON public.connector_data_slack_messages
  FOR SELECT USING (public.is_social_media_lead());

DROP POLICY IF EXISTS "slack_messages_write" ON public.connector_data_slack_messages;
CREATE POLICY "slack_messages_write" ON public.connector_data_slack_messages
  FOR ALL USING (public.is_social_media_lead());
