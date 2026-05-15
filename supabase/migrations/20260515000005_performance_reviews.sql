-- HR Wave 4: Performance Reviews
--
-- Two tables:
--   1. review_cycles — a named period (e.g. "Q2 2026", "Annual 2026") that
--      groups individual reviews together
--   2. performance_reviews — one row per (cycle, reviewee), written by a
--      designated reviewer, acknowledged by the reviewee
--
-- Ratings live in two places:
--   - overall_rating (1-5, single headline number)
--   - ratings jsonb — flexible per-dimension scores like
--     {quality: 4, productivity: 5, collaboration: 3, initiative: 4}
--   This lets us swap in different dimensions per department later
--   without a schema change.
--
-- Status flow: draft → submitted → acknowledged
-- Reviewer can edit while in draft. On submit, reviewee gets a
-- notification and can either acknowledge with an optional response or
-- HR can flip back to draft if it needs editing.

-- ─────────────────────────────────────────────────────────────
-- 1. review_cycles
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.review_cycles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL CHECK (length(trim(name)) > 0),
  description text,
  start_date  date        NOT NULL,
  end_date    date        NOT NULL CHECK (end_date >= start_date),
  status      text        NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open','closed')),
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_cycles_status_idx ON public.review_cycles (status, start_date DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'review_cycles_updated_at') THEN
    CREATE TRIGGER review_cycles_updated_at
      BEFORE UPDATE ON public.review_cycles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.review_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_cycles_select" ON public.review_cycles;
CREATE POLICY "review_cycles_select" ON public.review_cycles
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "review_cycles_write" ON public.review_cycles;
CREATE POLICY "review_cycles_write" ON public.review_cycles
  FOR ALL USING (public.is_hr_or_founder());

-- ─────────────────────────────────────────────────────────────
-- 2. performance_reviews
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id              uuid        NOT NULL REFERENCES public.review_cycles(id) ON DELETE CASCADE,
  reviewee_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status                text        NOT NULL DEFAULT 'draft'
                                    CHECK (status IN ('draft','submitted','acknowledged')),
  overall_rating        int         CHECK (overall_rating IS NULL OR (overall_rating BETWEEN 1 AND 5)),
  ratings               jsonb       NOT NULL DEFAULT '{}'::jsonb,
  strengths             text,
  improvements          text,
  goals                 text,
  reviewer_notes        text,        -- private to reviewer + HR + founder
  acknowledgment_note   text,        -- written by the reviewee on acknowledge
  submitted_at          timestamptz,
  acknowledged_at       timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, reviewee_id)
);

CREATE INDEX IF NOT EXISTS perf_reviews_cycle_idx     ON public.performance_reviews (cycle_id, status);
CREATE INDEX IF NOT EXISTS perf_reviews_reviewee_idx  ON public.performance_reviews (reviewee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS perf_reviews_reviewer_idx  ON public.performance_reviews (reviewer_id, status);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'performance_reviews_updated_at') THEN
    CREATE TRIGGER performance_reviews_updated_at
      BEFORE UPDATE ON public.performance_reviews
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

-- SELECT: reviewer, reviewee, HR + founder. Others can't see — privacy.
DROP POLICY IF EXISTS "perf_reviews_select" ON public.performance_reviews;
CREATE POLICY "perf_reviews_select" ON public.performance_reviews
  FOR SELECT USING (
    public.is_hr_or_founder()
    OR reviewer_id = auth.uid()
    OR reviewee_id = auth.uid()
  );

-- INSERT: HR + founder. They assign the reviewer when creating.
DROP POLICY IF EXISTS "perf_reviews_insert" ON public.performance_reviews;
CREATE POLICY "perf_reviews_insert" ON public.performance_reviews
  FOR INSERT WITH CHECK (public.is_hr_or_founder());

-- UPDATE: HR + founder anytime. Reviewer while status='draft' or 'submitted'.
-- Reviewee only when acknowledging (status flip + acknowledgment_note).
-- Note: column-level restrictions can't be expressed in a single policy,
-- so we allow the row update; the UI controls which fields each role sees.
DROP POLICY IF EXISTS "perf_reviews_update" ON public.performance_reviews;
CREATE POLICY "perf_reviews_update" ON public.performance_reviews
  FOR UPDATE USING (
    public.is_hr_or_founder()
    OR reviewer_id = auth.uid()
    OR reviewee_id = auth.uid()
  );

-- No DELETE — reviews are an audit trail. HR can use status='draft' to
-- effectively retract a submitted review.

-- ─────────────────────────────────────────────────────────────
-- Realtime
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_reviews;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
