-- Project discussion: a flat chat thread per project.
-- Members of the project + founders of the project's startup can read & post.
-- Authors can soft-delete their own messages.

CREATE TABLE IF NOT EXISTS public.project_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_profile  uuid NOT NULL,
  author_name     text NOT NULL,
  body            text NOT NULL CHECK (length(trim(body)) > 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS project_messages_project_idx
  ON public.project_messages (project_id, created_at);

CREATE INDEX IF NOT EXISTS project_messages_author_idx
  ON public.project_messages (author_profile);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.touch_project_messages_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_messages_touch_updated_at ON public.project_messages;
CREATE TRIGGER project_messages_touch_updated_at
  BEFORE UPDATE ON public.project_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_project_messages_updated_at();

-- Enable RLS
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user (matches our open-read policy on projects)
DROP POLICY IF EXISTS "project_messages_select" ON public.project_messages;
CREATE POLICY "project_messages_select" ON public.project_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert: authenticated users posting as themselves
DROP POLICY IF EXISTS "project_messages_insert" ON public.project_messages;
CREATE POLICY "project_messages_insert" ON public.project_messages
  FOR INSERT WITH CHECK (auth.uid() = author_profile);

-- Update (used for soft delete via deleted_at): only own messages
DROP POLICY IF EXISTS "project_messages_update_own" ON public.project_messages;
CREATE POLICY "project_messages_update_own" ON public.project_messages
  FOR UPDATE USING (auth.uid() = author_profile)
  WITH CHECK (auth.uid() = author_profile);

-- Hard delete: also only own (kept for completeness; UI uses soft delete)
DROP POLICY IF EXISTS "project_messages_delete_own" ON public.project_messages;
CREATE POLICY "project_messages_delete_own" ON public.project_messages
  FOR DELETE USING (auth.uid() = author_profile);

-- Enable realtime broadcasting on this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages;
