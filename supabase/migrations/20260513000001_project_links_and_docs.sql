-- Project Links + Project Documents
--
-- Two new per-project capabilities:
--   1. project_links — a categorized list of URLs the team needs (repos,
--      design files, deployments, docs, etc.)
--   2. project_documents — metadata table for files uploaded to the
--      'project-documents' Supabase Storage bucket.
--
-- Both are scoped to a project. RLS: anyone on the project (member or lead)
-- can read AND write. Outside-project users can read (visibility), can't write.
-- Founders can write anywhere.

-- ─────────────────────────────────────────────────────────────
-- 1. Helper: is the current user a member of this project?
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id AND profile_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_project_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. project_links
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_links (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title       text        NOT NULL CHECK (length(trim(title)) > 0),
  url         text        NOT NULL CHECK (length(trim(url)) > 0),
  category    text        NOT NULL DEFAULT 'other'
                          CHECK (category IN ('repo','design','deployment','docs','monitoring','other')),
  description text,
  added_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  is_pinned   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_links_project_idx ON public.project_links (project_id);
CREATE INDEX IF NOT EXISTS project_links_pinned_idx  ON public.project_links (project_id, is_pinned DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_links_updated_at') THEN
    CREATE TRIGGER project_links_updated_at
      BEFORE UPDATE ON public.project_links
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_links_select" ON public.project_links;
CREATE POLICY "project_links_select" ON public.project_links
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "project_links_insert" ON public.project_links;
CREATE POLICY "project_links_insert" ON public.project_links
  FOR INSERT WITH CHECK (
    public.is_founder(auth.uid())
    OR public.is_project_member(project_id, auth.uid())
  );

DROP POLICY IF EXISTS "project_links_update" ON public.project_links;
CREATE POLICY "project_links_update" ON public.project_links
  FOR UPDATE USING (
    public.is_founder(auth.uid())
    OR public.is_project_member(project_id, auth.uid())
  );

DROP POLICY IF EXISTS "project_links_delete" ON public.project_links;
CREATE POLICY "project_links_delete" ON public.project_links
  FOR DELETE USING (
    public.is_founder(auth.uid())
    OR added_by = auth.uid()
    OR public.is_project_lead(project_id, auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- 3. project_documents (metadata; files live in Storage)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_documents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  display_name  text        NOT NULL CHECK (length(trim(display_name)) > 0),
  storage_path  text        NOT NULL,
  mime_type     text,
  size_bytes    bigint,
  description   text,
  uploaded_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_documents_project_idx ON public.project_documents (project_id);
CREATE INDEX IF NOT EXISTS project_documents_uploader_idx ON public.project_documents (uploaded_by);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_documents_updated_at') THEN
    CREATE TRIGGER project_documents_updated_at
      BEFORE UPDATE ON public.project_documents
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_documents_select" ON public.project_documents;
CREATE POLICY "project_documents_select" ON public.project_documents
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "project_documents_insert" ON public.project_documents;
CREATE POLICY "project_documents_insert" ON public.project_documents
  FOR INSERT WITH CHECK (
    public.is_founder(auth.uid())
    OR public.is_project_member(project_id, auth.uid())
  );

DROP POLICY IF EXISTS "project_documents_update" ON public.project_documents;
CREATE POLICY "project_documents_update" ON public.project_documents
  FOR UPDATE USING (
    public.is_founder(auth.uid())
    OR uploaded_by = auth.uid()
    OR public.is_project_lead(project_id, auth.uid())
  );

DROP POLICY IF EXISTS "project_documents_delete" ON public.project_documents;
CREATE POLICY "project_documents_delete" ON public.project_documents
  FOR DELETE USING (
    public.is_founder(auth.uid())
    OR uploaded_by = auth.uid()
    OR public.is_project_lead(project_id, auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- 4. Storage bucket: project-documents
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies. Path format: <project_id>/<filename>
-- We extract the project_id from the path and check is_project_member.

DROP POLICY IF EXISTS "project_docs_storage_select" ON storage.objects;
CREATE POLICY "project_docs_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'project-documents');

DROP POLICY IF EXISTS "project_docs_storage_insert" ON storage.objects;
CREATE POLICY "project_docs_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-documents'
    AND (
      public.is_founder(auth.uid())
      OR public.is_project_member((split_part(name, '/', 1))::uuid, auth.uid())
    )
  );

DROP POLICY IF EXISTS "project_docs_storage_update" ON storage.objects;
CREATE POLICY "project_docs_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND (
      public.is_founder(auth.uid())
      OR public.is_project_member((split_part(name, '/', 1))::uuid, auth.uid())
    )
  );

DROP POLICY IF EXISTS "project_docs_storage_delete" ON storage.objects;
CREATE POLICY "project_docs_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND (
      public.is_founder(auth.uid())
      OR public.is_project_member((split_part(name, '/', 1))::uuid, auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 5. Realtime
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_links;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_documents;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
