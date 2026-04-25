-- Create project_messages table
CREATE TABLE public.project_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_profile UUID NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_messages_project_id ON public.project_messages(project_id);
CREATE INDEX idx_project_messages_created_at ON public.project_messages(created_at);

-- Enable RLS
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "project_messages_select"
ON public.project_messages
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "project_messages_insert"
ON public.project_messages
FOR INSERT
TO authenticated
WITH CHECK (author_profile = auth.uid());

CREATE POLICY "project_messages_update"
ON public.project_messages
FOR UPDATE
TO authenticated
USING (author_profile = auth.uid())
WITH CHECK (author_profile = auth.uid());

CREATE POLICY "project_messages_delete"
ON public.project_messages
FOR DELETE
TO authenticated
USING (author_profile = auth.uid());

-- Updated_at trigger
CREATE TRIGGER set_project_messages_updated_at
BEFORE UPDATE ON public.project_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER TABLE public.project_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages;