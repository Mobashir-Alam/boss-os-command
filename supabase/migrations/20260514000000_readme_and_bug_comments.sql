-- Wave 3: Project README + Threaded Bug Comments
--
-- Adds:
--   1. projects.readme_md (text) — long-form project documentation
--   2. bug_comments table — threaded discussion on each bug

-- ─────────────────────────────────────────────────────────────
-- 1. projects.readme_md
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS readme_md text;

-- ─────────────────────────────────────────────────────────────
-- 2. bug_comments
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bug_comments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id      uuid        NOT NULL REFERENCES public.bugs(id) ON DELETE CASCADE,
  author_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  body        text        NOT NULL CHECK (length(trim(body)) > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE INDEX IF NOT EXISTS bug_comments_bug_idx ON public.bug_comments (bug_id, created_at);
CREATE INDEX IF NOT EXISTS bug_comments_author_idx ON public.bug_comments (author_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bug_comments_updated_at') THEN
    CREATE TRIGGER bug_comments_updated_at
      BEFORE UPDATE ON public.bug_comments
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.bug_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: any authed user (matches bug visibility)
DROP POLICY IF EXISTS "bug_comments_select" ON public.bug_comments;
CREATE POLICY "bug_comments_select" ON public.bug_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: anyone authenticated who is allowed to see the bug.
-- Practically, anyone authed (since bug SELECT is open). The author is auto
-- the current user.
DROP POLICY IF EXISTS "bug_comments_insert" ON public.bug_comments;
CREATE POLICY "bug_comments_insert" ON public.bug_comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND author_id = auth.uid()
  );

-- UPDATE: only the author can edit their own comment (within UI we soft-delete,
-- but allow body edits too).
DROP POLICY IF EXISTS "bug_comments_update" ON public.bug_comments;
CREATE POLICY "bug_comments_update" ON public.bug_comments
  FOR UPDATE USING (
    author_id = auth.uid()
    OR public.is_founder(auth.uid())
  );

-- DELETE: author + founder. UI uses soft-delete (deleted_at) by default
-- but hard-delete is available for moderation.
DROP POLICY IF EXISTS "bug_comments_delete" ON public.bug_comments;
CREATE POLICY "bug_comments_delete" ON public.bug_comments
  FOR DELETE USING (
    author_id = auth.uid()
    OR public.is_founder(auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Realtime
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bug_comments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
