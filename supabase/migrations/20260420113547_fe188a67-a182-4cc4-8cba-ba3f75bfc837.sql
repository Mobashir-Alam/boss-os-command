-- Founder phase 2 schema reconciliation
-- This migration keeps the final schema aligned with the current app code after:
-- 1. the local founder foundation migration
-- 2. the Lovable-generated founder UI pass
--
-- It is intentionally defensive so it can run on:
-- - a database where the earlier founder migration already ran
-- - a database where only the newer UI branch is being provisioned

-- ---------------------------------------------------------------------------
-- startup_departments: final column names expected by the app
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.startup_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  department_key text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'watch',
  headcount integer NOT NULL DEFAULT 0,
  lead_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  summary text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, department_key)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'startup_departments'
      AND column_name = 'department_name'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'startup_departments'
      AND column_name = 'name'
  ) THEN
    ALTER TABLE public.startup_departments
      RENAME COLUMN department_name TO name;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'startup_departments'
      AND column_name = 'department_lead_person_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'startup_departments'
      AND column_name = 'lead_person_id'
  ) THEN
    ALTER TABLE public.startup_departments
      RENAME COLUMN department_lead_person_id TO lead_person_id;
  END IF;
END $$;

ALTER TABLE public.startup_departments
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS lead_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.startup_departments
SET
  name = COALESCE(name, department_key),
  summary = COALESCE(summary, ''),
  updated_at = COALESCE(updated_at, created_at, now())
WHERE name IS NULL OR summary IS NULL OR updated_at IS NULL;

ALTER TABLE public.startup_departments
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN summary SET DEFAULT '',
  ALTER COLUMN summary SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'startup_departments_status_check'
  ) THEN
    ALTER TABLE public.startup_departments
      ADD CONSTRAINT startup_departments_status_check
      CHECK (status IN ('good', 'watch', 'critical'));
  END IF;
END $$;

ALTER TABLE public.startup_departments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'startup_departments'
      AND policyname = 'Auth can view startup_departments'
  ) THEN
    CREATE POLICY "Auth can view startup_departments"
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
      AND policyname = 'Founders manage startup_departments'
  ) THEN
    CREATE POLICY "Founders manage startup_departments"
      ON public.startup_departments
      FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'founder'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'startup_departments'
      AND policyname = 'MFOs manage startup_departments'
  ) THEN
    CREATE POLICY "MFOs manage startup_departments"
      ON public.startup_departments
      FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'mfo'::app_role));
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_startup_departments_updated_at ON public.startup_departments;
CREATE TRIGGER update_startup_departments_updated_at
  BEFORE UPDATE ON public.startup_departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_startup_departments_startup
  ON public.startup_departments(startup_id);

CREATE INDEX IF NOT EXISTS idx_startup_departments_startup_department
  ON public.startup_departments(startup_id, department_key);

CREATE INDEX IF NOT EXISTS idx_startup_departments_lead_person_id
  ON public.startup_departments(lead_person_id);

-- ---------------------------------------------------------------------------
-- department_updates: align with the final app contract
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.department_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  department_key text NOT NULL,
  update_date date NOT NULL DEFAULT CURRENT_DATE,
  summary text NOT NULL DEFAULT '',
  wins text[] NOT NULL DEFAULT '{}',
  blockers text[] NOT NULL DEFAULT '{}',
  risks text[] NOT NULL DEFAULT '{}',
  asks text[] NOT NULL DEFAULT '{}',
  owner_person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.department_updates
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'department_updates'
      AND column_name = 'startup_department_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.department_updates
      ALTER COLUMN startup_department_id DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'department_updates'
      AND column_name = 'wins'
      AND udt_name = 'jsonb'
  ) THEN
    ALTER TABLE public.department_updates
      ALTER COLUMN wins TYPE text[]
      USING ARRAY(
        SELECT jsonb_array_elements_text(COALESCE(wins, '[]'::jsonb))
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'department_updates'
      AND column_name = 'blockers'
      AND udt_name = 'jsonb'
  ) THEN
    ALTER TABLE public.department_updates
      ALTER COLUMN blockers TYPE text[]
      USING ARRAY(
        SELECT jsonb_array_elements_text(COALESCE(blockers, '[]'::jsonb))
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'department_updates'
      AND column_name = 'risks'
      AND udt_name = 'jsonb'
  ) THEN
    ALTER TABLE public.department_updates
      ALTER COLUMN risks TYPE text[]
      USING ARRAY(
        SELECT jsonb_array_elements_text(COALESCE(risks, '[]'::jsonb))
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'department_updates'
      AND column_name = 'asks'
      AND udt_name = 'jsonb'
  ) THEN
    ALTER TABLE public.department_updates
      ALTER COLUMN asks TYPE text[]
      USING ARRAY(
        SELECT jsonb_array_elements_text(COALESCE(asks, '[]'::jsonb))
      );
  END IF;
END $$;

UPDATE public.department_updates
SET
  summary = COALESCE(summary, ''),
  updated_at = COALESCE(updated_at, created_at, now());

ALTER TABLE public.department_updates
  ALTER COLUMN summary SET DEFAULT '',
  ALTER COLUMN summary SET NOT NULL,
  ALTER COLUMN wins SET DEFAULT '{}',
  ALTER COLUMN wins SET NOT NULL,
  ALTER COLUMN blockers SET DEFAULT '{}',
  ALTER COLUMN blockers SET NOT NULL,
  ALTER COLUMN risks SET DEFAULT '{}',
  ALTER COLUMN risks SET NOT NULL,
  ALTER COLUMN asks SET DEFAULT '{}',
  ALTER COLUMN asks SET NOT NULL;

ALTER TABLE public.department_updates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'department_updates'
      AND policyname = 'Auth can view department_updates'
  ) THEN
    CREATE POLICY "Auth can view department_updates"
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
      AND policyname = 'Founders manage department_updates'
  ) THEN
    CREATE POLICY "Founders manage department_updates"
      ON public.department_updates
      FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'founder'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'department_updates'
      AND policyname = 'MFOs manage department_updates'
  ) THEN
    CREATE POLICY "MFOs manage department_updates"
      ON public.department_updates
      FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'mfo'::app_role));
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_department_updates_updated_at ON public.department_updates;
CREATE TRIGGER update_department_updates_updated_at
  BEFORE UPDATE ON public.department_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_department_updates_startup_dept
  ON public.department_updates(startup_id, department_key, update_date DESC);

CREATE INDEX IF NOT EXISTS idx_department_updates_owner_person_id
  ON public.department_updates(owner_person_id);

-- ---------------------------------------------------------------------------
-- startup_documents: keep the richer founder metadata plus Lovable additions
-- ---------------------------------------------------------------------------

ALTER TABLE public.startup_documents
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS document_date date,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS size_bytes bigint;

UPDATE public.startup_documents
SET
  title = COALESCE(title, file_name),
  category = COALESCE(category, 'operations')
WHERE title IS NULL OR category IS NULL;

ALTER TABLE public.startup_documents
  ALTER COLUMN category SET DEFAULT 'operations',
  ALTER COLUMN category SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_startup_documents_startup_category
  ON public.startup_documents(startup_id, category, created_at DESC);

-- ---------------------------------------------------------------------------
-- startup-documents bucket and storage policies
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('startup-documents', 'startup-documents', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Auth can read startup-documents'
  ) THEN
    CREATE POLICY "Auth can read startup-documents"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'startup-documents');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Founders can upload startup-documents'
  ) THEN
    CREATE POLICY "Founders can upload startup-documents"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'founder'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'MFOs can upload startup-documents'
  ) THEN
    CREATE POLICY "MFOs can upload startup-documents"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'mfo'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Founders can update startup-documents'
  ) THEN
    CREATE POLICY "Founders can update startup-documents"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'founder'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'MFOs can update startup-documents'
  ) THEN
    CREATE POLICY "MFOs can update startup-documents"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'mfo'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Founders can delete startup-documents'
  ) THEN
    CREATE POLICY "Founders can delete startup-documents"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'founder'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'MFOs can delete startup-documents'
  ) THEN
    CREATE POLICY "MFOs can delete startup-documents"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'mfo'::app_role));
  END IF;
END $$;
