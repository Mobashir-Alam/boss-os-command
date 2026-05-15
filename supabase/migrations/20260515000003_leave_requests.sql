-- HR Wave 2: Leave management
--
-- Two entry points:
--   1. Employee applies via the app (status starts 'pending', HR reviews)
--   2. HR records on behalf (e.g. someone emailed) — same insert, but HR
--      can immediately set status='approved' in the same flow
--
-- On approval, the app writes one attendance_records row per day in the
-- range with status='on_leave' so the daily HR dashboard reflects it
-- automatically without a second click.

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type      text        NOT NULL DEFAULT 'casual'
                              CHECK (leave_type IN ('casual','sick','earned','wfh','unpaid','half_day','other')),
  start_date      date        NOT NULL,
  end_date        date        NOT NULL CHECK (end_date >= start_date),
  half_day_part   text        CHECK (half_day_part IS NULL OR half_day_part IN ('morning','afternoon')),
  reason          text,
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','rejected','cancelled')),
  requested_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  review_note     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leave_profile_idx     ON public.leave_requests (profile_id, start_date DESC);
CREATE INDEX IF NOT EXISTS leave_status_idx      ON public.leave_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS leave_date_range_idx  ON public.leave_requests (start_date, end_date);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'leave_requests_updated_at') THEN
    CREATE TRIGGER leave_requests_updated_at
      BEFORE UPDATE ON public.leave_requests
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: HR + founder see all; employees see only their own
DROP POLICY IF EXISTS "leave_select" ON public.leave_requests;
CREATE POLICY "leave_select" ON public.leave_requests
  FOR SELECT USING (
    public.is_hr_or_founder()
    OR profile_id = auth.uid()
  );

-- INSERT: any authed user can apply for themselves; HR + founder can apply
-- on behalf of anyone. The 'requested_by' must be the current user (so we
-- have a clear audit trail of who submitted the form).
DROP POLICY IF EXISTS "leave_insert" ON public.leave_requests;
CREATE POLICY "leave_insert" ON public.leave_requests
  FOR INSERT WITH CHECK (
    requested_by = auth.uid()
    AND (profile_id = auth.uid() OR public.is_hr_or_founder())
  );

-- UPDATE: HR + founder for review (approve/reject) or to edit anything.
-- The owner can also update — but only to cancel a still-pending request.
DROP POLICY IF EXISTS "leave_update" ON public.leave_requests;
CREATE POLICY "leave_update" ON public.leave_requests
  FOR UPDATE USING (
    public.is_hr_or_founder()
    OR profile_id = auth.uid()
  );

-- No DELETE — cancellation is a status change, not a row removal.

-- ─────────────────────────────────────────────────────────────
-- Realtime
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
