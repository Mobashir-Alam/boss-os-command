-- HR Wave 1: Attendance tracking
--
-- Two pieces:
--   1. is_hr_or_founder() helper for RLS gating
--   2. attendance_records table (one row per profile per day)
--
-- Source can be 'slack' (auto-parsed from #attendance channel) or 'manual'
-- (HR marked it themselves). raw_events stores the underlying in/out
-- timestamps so HR can audit how a row was computed.
--
-- needs_review = true is used by the Slack parser for messages it can't
-- confidently parse (multi-day backfills, ambiguous formats). HR sees
-- those in a "needs review" tab and resolves them manually.

-- ─────────────────────────────────────────────────────────────
-- 1. is_hr_or_founder() helper
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_hr_or_founder()
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
        OR (role = 'functional_head' AND department = 'hr')
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_hr_or_founder() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_hr_or_founder() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. attendance_records table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_date date        NOT NULL,
  status          text        NOT NULL DEFAULT 'present'
                              CHECK (status IN ('present','absent','on_leave','half_day','not_marked')),
  first_in_at     timestamptz,
  last_out_at     timestamptz,
  total_minutes   int,
  session_count   int         NOT NULL DEFAULT 1 CHECK (session_count >= 0),
  source          text        NOT NULL DEFAULT 'manual'
                              CHECK (source IN ('slack','manual')),
  raw_events      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  marked_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes           text,
  needs_review    boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS attendance_date_idx
  ON public.attendance_records (attendance_date DESC);
CREATE INDEX IF NOT EXISTS attendance_profile_date_idx
  ON public.attendance_records (profile_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS attendance_review_idx
  ON public.attendance_records (needs_review) WHERE needs_review = true;
CREATE INDEX IF NOT EXISTS attendance_status_idx
  ON public.attendance_records (attendance_date, status);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'attendance_records_updated_at') THEN
    CREATE TRIGGER attendance_records_updated_at
      BEFORE UPDATE ON public.attendance_records
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. RLS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- SELECT: HR + founder see all; everyone else sees only their own row
DROP POLICY IF EXISTS "attendance_select" ON public.attendance_records;
CREATE POLICY "attendance_select" ON public.attendance_records
  FOR SELECT USING (
    public.is_hr_or_founder()
    OR profile_id = auth.uid()
  );

-- INSERT: HR + founder only (records are written either by HR manually or
-- by the Slack sync edge function using the service role).
DROP POLICY IF EXISTS "attendance_insert" ON public.attendance_records;
CREATE POLICY "attendance_insert" ON public.attendance_records
  FOR INSERT WITH CHECK (public.is_hr_or_founder());

-- UPDATE: HR + founder only
DROP POLICY IF EXISTS "attendance_update" ON public.attendance_records;
CREATE POLICY "attendance_update" ON public.attendance_records
  FOR UPDATE USING (public.is_hr_or_founder());

-- No DELETE policy on purpose — attendance is an audit trail.

-- ─────────────────────────────────────────────────────────────
-- 4. Realtime so the Today tab updates live as HR marks people
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
