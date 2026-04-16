
-- Growth config per startup
CREATE TABLE public.growth_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  growth_model TEXT NOT NULL DEFAULT 'product',
  funnel_stages JSONB NOT NULL DEFAULT '["Awareness","Acquisition","Activation","Retention","Revenue","Referral"]',
  custom_channels JSONB NOT NULL DEFAULT '["organic","paid","partnerships"]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(startup_id)
);

ALTER TABLE public.growth_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view growth_config" ON public.growth_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage growth_config" ON public.growth_config FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can manage growth_config" ON public.growth_config FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));
CREATE TRIGGER update_growth_config_updated_at BEFORE UPDATE ON public.growth_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Growth metrics snapshots
CREATE TABLE public.growth_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  period DATE NOT NULL DEFAULT CURRENT_DATE,
  users INTEGER NOT NULL DEFAULT 0,
  growth_rate NUMERIC NOT NULL DEFAULT 0,
  activation_rate NUMERIC NOT NULL DEFAULT 0,
  retention_rate NUMERIC NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  channel TEXT NOT NULL DEFAULT 'organic',
  metric_type TEXT NOT NULL DEFAULT 'snapshot',
  metric_key TEXT NOT NULL DEFAULT '',
  metric_value NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.growth_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view growth_metrics" ON public.growth_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage growth_metrics" ON public.growth_metrics FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can manage growth_metrics" ON public.growth_metrics FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));
CREATE TRIGGER update_growth_metrics_updated_at BEFORE UPDATE ON public.growth_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Growth experiments
CREATE TABLE public.growth_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  experiment_type TEXT NOT NULL DEFAULT 'campaign',
  channel TEXT NOT NULL DEFAULT 'organic',
  status TEXT NOT NULL DEFAULT 'planned',
  start_date DATE,
  end_date DATE,
  result_summary TEXT,
  impact_score NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.growth_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view growth_experiments" ON public.growth_experiments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage growth_experiments" ON public.growth_experiments FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "MFOs can manage growth_experiments" ON public.growth_experiments FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));
CREATE TRIGGER update_growth_experiments_updated_at BEFORE UPDATE ON public.growth_experiments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
