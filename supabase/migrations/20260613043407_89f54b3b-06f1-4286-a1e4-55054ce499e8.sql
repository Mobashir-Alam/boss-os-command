
ALTER TABLE public.connector_data_slack_messages
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS has_files BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_slack_messages_posted_at
  ON public.connector_data_slack_messages (startup_id, posted_at DESC);
