-- HR Wave 5 (final): Onboarding checklists + Hiring pipeline
--
-- Three tables:
--   1. onboarding_items — per-new-hire checklist items (paperwork, IT
--      setup, training, etc.) with category, assignee, due date, status.
--   2. job_postings — open / closed roles the company is hiring for.
--   3. candidates — applicants linked to a job posting, tracked through
--      stages (applied → screening → interviews → offer → hired/rejected).

-- ─────────────────────────────────────────────────────────────
-- 1. onboarding_items
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.onboarding_items (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text        NOT NULL CHECK (length(trim(title)) > 0),
  description   text,
  category      text        NOT NULL DEFAULT 'other'
                            CHECK (category IN ('paperwork','it_setup','training','introductions','equipment','other')),
  assigned_to   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date      date,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','done','skipped')),
  done_at       timestamptz,
  done_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes         text,
  created_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_profile_idx ON public.onboarding_items (profile_id, status);
CREATE INDEX IF NOT EXISTS onboarding_assigned_idx ON public.onboarding_items (assigned_to, status);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'onboarding_items_updated_at') THEN
    CREATE TRIGGER onboarding_items_updated_at
      BEFORE UPDATE ON public.onboarding_items
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.onboarding_items ENABLE ROW LEVEL SECURITY;

-- SELECT: HR + founder see all. Employees see items about them or assigned
-- to them.
DROP POLICY IF EXISTS "onboarding_select" ON public.onboarding_items;
CREATE POLICY "onboarding_select" ON public.onboarding_items
  FOR SELECT USING (
    public.is_hr_or_founder()
    OR profile_id = auth.uid()
    OR assigned_to = auth.uid()
  );

-- INSERT: HR + founder only
DROP POLICY IF EXISTS "onboarding_insert" ON public.onboarding_items;
CREATE POLICY "onboarding_insert" ON public.onboarding_items
  FOR INSERT WITH CHECK (public.is_hr_or_founder());

-- UPDATE: HR + founder anytime; new hire or assignee can flip status / add notes
DROP POLICY IF EXISTS "onboarding_update" ON public.onboarding_items;
CREATE POLICY "onboarding_update" ON public.onboarding_items
  FOR UPDATE USING (
    public.is_hr_or_founder()
    OR profile_id = auth.uid()
    OR assigned_to = auth.uid()
  );

-- DELETE: HR + founder
DROP POLICY IF EXISTS "onboarding_delete" ON public.onboarding_items;
CREATE POLICY "onboarding_delete" ON public.onboarding_items
  FOR DELETE USING (public.is_hr_or_founder());

-- ─────────────────────────────────────────────────────────────
-- 2. job_postings
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.job_postings (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text        NOT NULL CHECK (length(trim(title)) > 0),
  department     text,
  description    text,
  status         text        NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open','closed','on_hold','filled')),
  posted_at      date        NOT NULL DEFAULT CURRENT_DATE,
  closing_at     date,
  positions      int         NOT NULL DEFAULT 1 CHECK (positions >= 1),
  hiring_manager uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_postings_status_idx ON public.job_postings (status, posted_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'job_postings_updated_at') THEN
    CREATE TRIGGER job_postings_updated_at
      BEFORE UPDATE ON public.job_postings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

-- Anyone authed can read job postings (so internal referrals are easy)
DROP POLICY IF EXISTS "job_postings_select" ON public.job_postings;
CREATE POLICY "job_postings_select" ON public.job_postings
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "job_postings_write" ON public.job_postings;
CREATE POLICY "job_postings_write" ON public.job_postings
  FOR ALL USING (public.is_hr_or_founder());

-- ─────────────────────────────────────────────────────────────
-- 3. candidates
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.candidates (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              uuid        REFERENCES public.job_postings(id) ON DELETE SET NULL,
  full_name           text        NOT NULL CHECK (length(trim(full_name)) > 0),
  email               text,
  phone               text,
  resume_url          text,
  source              text,
  stage               text        NOT NULL DEFAULT 'applied'
                                  CHECK (stage IN ('applied','screening','interview_1','interview_2','offer','hired','rejected')),
  rating              int         CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  notes               text,
  rejected_reason     text,
  applied_at          timestamptz NOT NULL DEFAULT now(),
  hired_profile_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  hired_at            timestamptz,
  created_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS candidates_job_idx     ON public.candidates (job_id, stage);
CREATE INDEX IF NOT EXISTS candidates_stage_idx   ON public.candidates (stage, created_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'candidates_updated_at') THEN
    CREATE TRIGGER candidates_updated_at
      BEFORE UPDATE ON public.candidates
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- HR + founder only across the board (candidate data is sensitive)
DROP POLICY IF EXISTS "candidates_select" ON public.candidates;
CREATE POLICY "candidates_select" ON public.candidates
  FOR SELECT USING (public.is_hr_or_founder());

DROP POLICY IF EXISTS "candidates_write" ON public.candidates;
CREATE POLICY "candidates_write" ON public.candidates
  FOR ALL USING (public.is_hr_or_founder());

-- ─────────────────────────────────────────────────────────────
-- Realtime
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.onboarding_items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_postings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
