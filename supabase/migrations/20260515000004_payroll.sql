-- HR Wave 3: Payroll
--
-- Single-table model for monthly payroll. One row per (employee, month).
-- HR generates entries from people.salary at month start, adjusts
-- deductions/bonus per person if needed, marks each as paid as they go out.
--
-- Net pay is computed by the DB so it stays consistent: base - deductions + bonus.

CREATE TABLE IF NOT EXISTS public.payroll_payments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year      text        NOT NULL CHECK (month_year ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  base_salary     numeric(15,2) NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
  deductions      numeric(15,2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
  bonus           numeric(15,2) NOT NULL DEFAULT 0 CHECK (bonus >= 0),
  net_pay         numeric(15,2) GENERATED ALWAYS AS (base_salary - deductions + bonus) STORED,
  status          text        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','finalised','paid')),
  paid_at         timestamptz,
  notes           text,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, month_year)
);

CREATE INDEX IF NOT EXISTS payroll_month_idx
  ON public.payroll_payments (month_year, status);
CREATE INDEX IF NOT EXISTS payroll_profile_idx
  ON public.payroll_payments (profile_id, month_year DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'payroll_payments_updated_at') THEN
    CREATE TRIGGER payroll_payments_updated_at
      BEFORE UPDATE ON public.payroll_payments
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.payroll_payments ENABLE ROW LEVEL SECURITY;

-- SELECT: HR + founder see all; employees can see their own (so they can
-- view their payslips later)
DROP POLICY IF EXISTS "payroll_select" ON public.payroll_payments;
CREATE POLICY "payroll_select" ON public.payroll_payments
  FOR SELECT USING (
    public.is_hr_or_founder()
    OR profile_id = auth.uid()
  );

-- INSERT / UPDATE / DELETE — HR + founder only
DROP POLICY IF EXISTS "payroll_insert" ON public.payroll_payments;
CREATE POLICY "payroll_insert" ON public.payroll_payments
  FOR INSERT WITH CHECK (public.is_hr_or_founder());

DROP POLICY IF EXISTS "payroll_update" ON public.payroll_payments;
CREATE POLICY "payroll_update" ON public.payroll_payments
  FOR UPDATE USING (public.is_hr_or_founder());

DROP POLICY IF EXISTS "payroll_delete" ON public.payroll_payments;
CREATE POLICY "payroll_delete" ON public.payroll_payments
  FOR DELETE USING (public.is_hr_or_founder());

-- ─────────────────────────────────────────────────────────────
-- Realtime
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payroll_payments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
