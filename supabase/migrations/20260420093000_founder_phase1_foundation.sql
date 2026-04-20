-- Phase 1 founder foundation:
-- 1. Extend startup_documents with richer metadata for CEO-facing document management
-- 2. Add startup_departments for first-class department visibility per company
-- 3. Add department_updates for structured department-level reporting

-- ---------------------------------------------------------------------------
-- startup_documents: richer metadata
-- ---------------------------------------------------------------------------

ALTER TABLE public.startup_documents
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS document_date DATE,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS vendor_name TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS linked_financial_entry_id UUID REFERENCES public.financial_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_funding_round_id UUID REFERENCES public.funding_rounds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_stakeholder_id UUID REFERENCES public.stakeholders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill the new title/category columns for existing rows.
UPDATE public.startup_documents
SET
  title = COALESCE(title, file_name),
  category = COALESCE(
    category,
    CASE doc_type
      WHEN 'financials' THEN 'finance'
      WHEN 'legal' THEN 'legal'
      WHEN 'pitch-deck' THEN 'company_record'
      ELSE 'operations'
    END
  ),
  updated_at = COALESCE(updated_at, created_at, now())
WHERE title IS NULL OR category IS NULL OR updated_at IS NULL;

-- Ensure the document row remains tied to a valid startup record going forward.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'startup_documents_startup_id_fkey'
  ) THEN
    ALTER TABLE public.startup_documents
      ADD CONSTRAINT startup_documents_startup_id_fkey
      FOREIGN KEY (startup_id) REFERENCES public.startups(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'startup_documents_status_check'
  ) THEN
    ALTER TABLE public.startup_documents
      ADD CONSTRAINT startup_documents_status_check
      CHECK (status IN ('active', 'archived', 'missing_reference', 'needs_review'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_startup_documents_updated_at ON public.startup_documents;
CREATE TRIGGER update_startup_documents_updated_at
BEFORE UPDATE ON public.startup_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_startup_documents_startup_id
  ON public.startup_documents (startup_id);

CREATE INDEX IF NOT EXISTS idx_startup_documents_category
  ON public.startup_documents (category);

CREATE INDEX IF NOT EXISTS idx_startup_documents_department
  ON public.startup_documents (department);

CREATE INDEX IF NOT EXISTS idx_startup_documents_document_date_desc
  ON public.startup_documents (document_date DESC);

CREATE INDEX IF NOT EXISTS idx_startup_documents_linked_financial_entry_id
  ON public.startup_documents (linked_financial_entry_id);

-- ---------------------------------------------------------------------------
-- startup_departments: first-class startup departments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.startup_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  department_key TEXT NOT NULL,
  department_name TEXT NOT NULL,
  department_lead_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'watch',
  headcount INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT startup_departments_unique_startup_department UNIQUE (startup_id, department_key),
  CONSTRAINT startup_departments_status_check CHECK (status IN ('good', 'watch', 'critical'))
);

INSERT INTO public.startup_departments (
  startup_id,
  department_key,
  department_name,
  status,
  headcount
)
SELECT
  s.id,
  d.department_key,
  d.department_name,
  'watch',
  0
FROM public.startups s
CROSS JOIN (
  VALUES
    ('social_media', 'Social Media'),
    ('video_production_editing', 'Video Production / Editing'),
    ('content_management', 'Content Management'),
    ('studio', 'Studio Dept.'),
    ('tech', 'Tech Dept.'),
    ('creators_brands_outreach', 'Creators / Brands Outreach Dept.'),
    ('hr', 'HR Dept.'),
    ('graphic_designing', 'Graphic Designing Dept.'),
    ('office_management', 'Office Management')
) AS d(department_key, department_name)
ON CONFLICT (startup_id, department_key) DO NOTHING;

ALTER TABLE public.startup_departments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'startup_departments'
      AND policyname = 'Authenticated can view startup_departments'
  ) THEN
    CREATE POLICY "Authenticated can view startup_departments"
      ON public.startup_departments
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'startup_departments'
      AND policyname = 'Founders can manage startup_departments'
  ) THEN
    CREATE POLICY "Founders can manage startup_departments"
      ON public.startup_departments
      FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'founder'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'startup_departments'
      AND policyname = 'MFOs can manage startup_departments'
  ) THEN
    CREATE POLICY "MFOs can manage startup_departments"
      ON public.startup_departments
      FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'mfo'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_startup_departments_updated_at ON public.startup_departments;
CREATE TRIGGER update_startup_departments_updated_at
BEFORE UPDATE ON public.startup_departments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_startup_departments_startup_department
  ON public.startup_departments (startup_id, department_key);

CREATE INDEX IF NOT EXISTS idx_startup_departments_lead_person
  ON public.startup_departments (department_lead_person_id);

-- ---------------------------------------------------------------------------
-- department_updates: structured department reporting
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.department_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_department_id UUID NOT NULL REFERENCES public.startup_departments(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  department_key TEXT NOT NULL,
  update_date DATE NOT NULL DEFAULT CURRENT_DATE,
  summary TEXT NOT NULL,
  wins JSONB NOT NULL DEFAULT '[]'::jsonb,
  blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  asks JSONB NOT NULL DEFAULT '[]'::jsonb,
  owner_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.department_updates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'department_updates'
      AND policyname = 'Authenticated can view department_updates'
  ) THEN
    CREATE POLICY "Authenticated can view department_updates"
      ON public.department_updates
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'department_updates'
      AND policyname = 'Founders can manage department_updates'
  ) THEN
    CREATE POLICY "Founders can manage department_updates"
      ON public.department_updates
      FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'founder'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'department_updates'
      AND policyname = 'MFOs can manage department_updates'
  ) THEN
    CREATE POLICY "MFOs can manage department_updates"
      ON public.department_updates
      FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'mfo'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_department_updates_startup_department
  ON public.department_updates (startup_department_id);

CREATE INDEX IF NOT EXISTS idx_department_updates_startup_department_date
  ON public.department_updates (startup_id, department_key, update_date DESC);

CREATE INDEX IF NOT EXISTS idx_department_updates_owner_person
  ON public.department_updates (owner_person_id);
