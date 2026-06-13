
CREATE TABLE public.connector_data_slack_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  message_ts TEXT NOT NULL,
  thread_ts TEXT,
  user_id_source TEXT,
  display_name TEXT,
  text TEXT,
  message_date DATE,
  reaction_count INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  is_thread_reply BOOLEAN NOT NULL DEFAULT false,
  raw_payload JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (startup_id, channel_id, message_ts)
);

CREATE INDEX idx_slack_messages_startup_date ON public.connector_data_slack_messages (startup_id, message_date DESC);
CREATE INDEX idx_slack_messages_channel ON public.connector_data_slack_messages (startup_id, channel_id, message_date DESC);
CREATE INDEX idx_slack_messages_user ON public.connector_data_slack_messages (startup_id, user_id_source, message_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connector_data_slack_messages TO authenticated;
GRANT ALL ON public.connector_data_slack_messages TO service_role;

ALTER TABLE public.connector_data_slack_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Social media leads can view slack messages"
  ON public.connector_data_slack_messages FOR SELECT
  TO authenticated
  USING (public.is_social_media_lead());

CREATE POLICY "Social media leads can manage slack messages"
  ON public.connector_data_slack_messages FOR ALL
  TO authenticated
  USING (public.is_social_media_lead())
  WITH CHECK (public.is_social_media_lead());

CREATE TRIGGER update_connector_data_slack_messages_updated_at
  BEFORE UPDATE ON public.connector_data_slack_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
