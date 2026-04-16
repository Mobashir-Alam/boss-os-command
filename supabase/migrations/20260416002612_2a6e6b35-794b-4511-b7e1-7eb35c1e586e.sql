
-- kai_memories
CREATE TABLE public.kai_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL,
  memory TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'context',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.kai_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view kai_memories" ON public.kai_memories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage kai_memories" ON public.kai_memories FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can manage kai_memories" ON public.kai_memories FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));

-- startup_notes
CREATE TABLE public.startup_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.startup_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view startup_notes" ON public.startup_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage startup_notes" ON public.startup_notes FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can manage startup_notes" ON public.startup_notes FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));

-- startup_milestones
CREATE TABLE public.startup_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.startup_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view startup_milestones" ON public.startup_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage startup_milestones" ON public.startup_milestones FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can manage startup_milestones" ON public.startup_milestones FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));

-- startup_contacts
CREATE TABLE public.startup_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.startup_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view startup_contacts" ON public.startup_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage startup_contacts" ON public.startup_contacts FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can manage startup_contacts" ON public.startup_contacts FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));

-- startup_documents
CREATE TABLE public.startup_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'other',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.startup_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view startup_documents" ON public.startup_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage startup_documents" ON public.startup_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can manage startup_documents" ON public.startup_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));

-- startup-documents storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('startup-documents', 'startup-documents', false);

CREATE POLICY "Authenticated can upload startup docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'startup-documents');
CREATE POLICY "Authenticated can view startup docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'startup-documents');
CREATE POLICY "Founders can delete startup docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can delete startup docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'mfo'::app_role));
