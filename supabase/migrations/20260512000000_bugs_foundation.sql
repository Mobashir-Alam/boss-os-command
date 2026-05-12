-- Bugs (a.k.a. tech work tracker) — mirrors the Google Sheet workflow.
-- Holds bugs, security issues, features, UX issues, and infra/implementation
-- items. Calling the table "bugs" because that matches the team's spoken
-- language even though the type enum is broader.
--
-- Key rules:
--   - No DELETE. Ever. Status moves to 'solved' instead, which sorts items
--     to the bottom of the list.
--   - INSERT: founder + tech functional_head + tech team_member
--   - UPDATE: same as insert, plus reporter / assignee can update their own
--   - SELECT: any authenticated user

-- ─────────────────────────────────────────────────────────────
-- 1. Table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bugs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
  title               text        NOT NULL CHECK (length(trim(title)) > 0),
  description         text        NOT NULL CHECK (length(trim(description)) > 0),
  type                text        NOT NULL DEFAULT 'bug'
                                  CHECK (type IN (
                                    'bug',
                                    'new_feature',
                                    'critical_security',
                                    'high_priority',
                                    'product_ux',
                                    'new_implementation'
                                  )),
  area                text        NOT NULL DEFAULT 'frontend'
                                  CHECK (area IN (
                                    'frontend','backend','mobile','infra','devops','security','other'
                                  )),
  status              text        NOT NULL DEFAULT 'open'
                                  CHECK (status IN ('open','in_progress','solved')),
  assignee_profile    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_profile    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  solved_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bugs_project_idx       ON public.bugs (project_id);
CREATE INDEX IF NOT EXISTS bugs_status_idx        ON public.bugs (status);
CREATE INDEX IF NOT EXISTS bugs_type_idx          ON public.bugs (type);
CREATE INDEX IF NOT EXISTS bugs_assignee_idx      ON public.bugs (assignee_profile);
-- Default sort: open + in_progress first, solved at bottom; within each,
-- newest first.
CREATE INDEX IF NOT EXISTS bugs_status_created_idx
  ON public.bugs (status, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 2. updated_at + solved_at triggers
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bugs_updated_at') THEN
    CREATE TRIGGER bugs_updated_at
      BEFORE UPDATE ON public.bugs
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Auto-stamp solved_at when status flips to 'solved' (and clear it when
-- it flips back).
CREATE OR REPLACE FUNCTION public.bugs_track_solved_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'solved' AND (OLD.status IS DISTINCT FROM 'solved') THEN
    NEW.solved_at := now();
  ELSIF NEW.status <> 'solved' AND OLD.status = 'solved' THEN
    NEW.solved_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bugs_solved_at_trg') THEN
    CREATE TRIGGER bugs_solved_at_trg
      BEFORE UPDATE OF status ON public.bugs
      FOR EACH ROW EXECUTE FUNCTION public.bugs_track_solved_at();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Helper: can the current user manage bugs?
--    Founder OR tech functional_head OR tech team_member.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_manage_bugs()
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
        OR (role = 'functional_head' AND department = 'tech')
        OR (role = 'team_member'      AND department = 'tech')
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_bugs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_bugs() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. RLS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;

-- SELECT: anyone authenticated. Founder needs to see all; tech team needs
-- to see all tech bugs. Cross-department visibility is fine for MVP.
DROP POLICY IF EXISTS "bugs_select" ON public.bugs;
CREATE POLICY "bugs_select" ON public.bugs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: founder + tech roles
DROP POLICY IF EXISTS "bugs_insert" ON public.bugs;
CREATE POLICY "bugs_insert" ON public.bugs
  FOR INSERT WITH CHECK (public.can_manage_bugs());

-- UPDATE: founder + tech roles, OR the bug's reporter, OR its assignee
DROP POLICY IF EXISTS "bugs_update" ON public.bugs;
CREATE POLICY "bugs_update" ON public.bugs
  FOR UPDATE USING (
    public.can_manage_bugs()
    OR reporter_profile = auth.uid()
    OR assignee_profile = auth.uid()
  );

-- DELETE: intentionally absent. No one can delete a bug.

-- ─────────────────────────────────────────────────────────────
-- 5. Realtime (so the bug list updates live as people change status)
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bugs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
