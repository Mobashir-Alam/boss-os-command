
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Stakeholders table
CREATE TABLE public.stakeholders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'founder',
  equity_pct NUMERIC(6,3) NOT NULL DEFAULT 0,
  equity_type TEXT NOT NULL DEFAULT 'vested',
  voting_pct NUMERIC(6,3) NOT NULL DEFAULT 0,
  vesting_schedule TEXT,
  vesting_start DATE,
  vesting_end DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view stakeholders" ON public.stakeholders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage stakeholders" ON public.stakeholders FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can manage stakeholders" ON public.stakeholders FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));

-- Stakeholder history log
CREATE TABLE public.stakeholder_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stakeholder_id UUID NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stakeholder_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view stakeholder history" ON public.stakeholder_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage stakeholder history" ON public.stakeholder_history FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can manage stakeholder history" ON public.stakeholder_history FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));

-- Board seats
CREATE TABLE public.board_seats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  seat_type TEXT NOT NULL DEFAULT 'founder',
  holder_name TEXT NOT NULL,
  holder_role TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.board_seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view board seats" ON public.board_seats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage board seats" ON public.board_seats FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can manage board seats" ON public.board_seats FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));

-- Special rights
CREATE TABLE public.special_rights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  right_type TEXT NOT NULL DEFAULT 'veto',
  holder_name TEXT NOT NULL,
  description TEXT,
  conditions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.special_rights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view special rights" ON public.special_rights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage special rights" ON public.special_rights FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can manage special rights" ON public.special_rights FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));

-- Funding rounds
CREATE TABLE public.funding_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  round_name TEXT NOT NULL,
  valuation NUMERIC(15,2),
  raise_amount NUMERIC(15,2),
  is_simulated BOOLEAN NOT NULL DEFAULT true,
  round_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funding_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view funding rounds" ON public.funding_rounds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage funding rounds" ON public.funding_rounds FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can manage funding rounds" ON public.funding_rounds FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));

-- Equity documents
CREATE TABLE public.equity_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stakeholder_id UUID NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'other',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equity_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view equity documents" ON public.equity_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage equity documents" ON public.equity_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can manage equity documents" ON public.equity_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('equity-documents', 'equity-documents', false);

CREATE POLICY "Auth users can view equity docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'equity-documents');
CREATE POLICY "Founders can upload equity docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'equity-documents' AND has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can upload equity docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'equity-documents' AND has_role(auth.uid(), 'mfo'::app_role));
CREATE POLICY "Founders can delete equity docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'equity-documents' AND has_role(auth.uid(), 'founder'::app_role));

-- Triggers
CREATE TRIGGER update_stakeholders_updated_at BEFORE UPDATE ON public.stakeholders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_board_seats_updated_at BEFORE UPDATE ON public.board_seats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_special_rights_updated_at BEFORE UPDATE ON public.special_rights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_funding_rounds_updated_at BEFORE UPDATE ON public.funding_rounds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
