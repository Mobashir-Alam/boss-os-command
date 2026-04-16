
CREATE TABLE public.product_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.product_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view product_outcomes" ON public.product_outcomes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders manage product_outcomes" ON public.product_outcomes FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs manage product_outcomes" ON public.product_outcomes FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));
CREATE TRIGGER update_product_outcomes_ts BEFORE UPDATE ON public.product_outcomes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_initiatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  outcome_id UUID REFERENCES public.product_outcomes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.product_initiatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view product_initiatives" ON public.product_initiatives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders manage product_initiatives" ON public.product_initiatives FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs manage product_initiatives" ON public.product_initiatives FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));
CREATE TRIGGER update_product_initiatives_ts BEFORE UPDATE ON public.product_initiatives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  initiative_id UUID REFERENCES public.product_initiatives(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  feature_type TEXT NOT NULL DEFAULT 'feature',
  status TEXT NOT NULL DEFAULT 'backlog',
  assigned_to TEXT,
  cycle_time_days INTEGER NOT NULL DEFAULT 0,
  impact_score NUMERIC NOT NULL DEFAULT 0,
  released_at DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.product_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view product_features" ON public.product_features FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders manage product_features" ON public.product_features FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs manage product_features" ON public.product_features FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));
CREATE TRIGGER update_product_features_ts BEFORE UPDATE ON public.product_features FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tech_health_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'bug',
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tech_health_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view tech_health" ON public.tech_health_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders manage tech_health" ON public.tech_health_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs manage tech_health" ON public.tech_health_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));
CREATE TRIGGER update_tech_health_ts BEFORE UPDATE ON public.tech_health_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
