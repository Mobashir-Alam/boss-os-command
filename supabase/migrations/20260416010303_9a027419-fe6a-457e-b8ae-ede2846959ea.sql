
CREATE TABLE public.financial_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL DEFAULT 'expense',
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recurring BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view financial_entries" ON public.financial_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage financial_entries" ON public.financial_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "CFOs can manage financial_entries" ON public.financial_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'cfo'::app_role));
CREATE TRIGGER update_financial_entries_updated_at BEFORE UPDATE ON public.financial_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.burn_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  monthly_amount NUMERIC NOT NULL DEFAULT 0,
  trend TEXT NOT NULL DEFAULT 'stable',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.burn_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view burn_categories" ON public.burn_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage burn_categories" ON public.burn_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "CFOs can manage burn_categories" ON public.burn_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'cfo'::app_role));
CREATE TRIGGER update_burn_categories_updated_at BEFORE UPDATE ON public.burn_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cash_flow_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  flow_type TEXT NOT NULL DEFAULT 'outflow',
  source TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_flow_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view cash_flow_entries" ON public.cash_flow_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage cash_flow_entries" ON public.cash_flow_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "CFOs can manage cash_flow_entries" ON public.cash_flow_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'cfo'::app_role));
CREATE TRIGGER update_cash_flow_entries_updated_at BEFORE UPDATE ON public.cash_flow_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.financial_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  forecast_month DATE NOT NULL,
  projected_revenue NUMERIC NOT NULL DEFAULT 0,
  projected_expenses NUMERIC NOT NULL DEFAULT 0,
  projected_runway_months INTEGER,
  assumptions TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view financial_forecasts" ON public.financial_forecasts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage financial_forecasts" ON public.financial_forecasts FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "CFOs can manage financial_forecasts" ON public.financial_forecasts FOR ALL TO authenticated USING (has_role(auth.uid(), 'cfo'::app_role));
CREATE TRIGGER update_financial_forecasts_updated_at BEFORE UPDATE ON public.financial_forecasts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
