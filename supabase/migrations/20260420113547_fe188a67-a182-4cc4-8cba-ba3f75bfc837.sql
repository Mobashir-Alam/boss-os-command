
-- 1. startup_departments
CREATE TABLE public.startup_departments (
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

ALTER TABLE public.startup_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view startup_departments" ON public.startup_departments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders manage startup_departments" ON public.startup_departments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs manage startup_departments" ON public.startup_departments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));

CREATE TRIGGER update_startup_departments_updated_at
  BEFORE UPDATE ON public.startup_departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_startup_departments_startup ON public.startup_departments(startup_id);

-- 2. department_updates
CREATE TABLE public.department_updates (
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

ALTER TABLE public.department_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view department_updates" ON public.department_updates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders manage department_updates" ON public.department_updates
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs manage department_updates" ON public.department_updates
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));

CREATE TRIGGER update_department_updates_updated_at
  BEFORE UPDATE ON public.department_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_department_updates_startup_dept ON public.department_updates(startup_id, department_key, update_date DESC);

-- 3. extend startup_documents
ALTER TABLE public.startup_documents
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'operations',
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS document_date date,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS size_bytes bigint;

CREATE INDEX IF NOT EXISTS idx_startup_documents_startup_category
  ON public.startup_documents(startup_id, category, created_at DESC);

-- 4. storage policies for startup-documents bucket
CREATE POLICY "Auth can read startup-documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'startup-documents');

CREATE POLICY "Founders can upload startup-documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'founder'::app_role));

CREATE POLICY "MFOs can upload startup-documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'mfo'::app_role));

CREATE POLICY "Founders can update startup-documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'founder'::app_role));

CREATE POLICY "MFOs can update startup-documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'mfo'::app_role));

CREATE POLICY "Founders can delete startup-documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'founder'::app_role));

CREATE POLICY "MFOs can delete startup-documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'mfo'::app_role));
