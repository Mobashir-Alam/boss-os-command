
CREATE TABLE public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'team_member',
  department TEXT NOT NULL DEFAULT '',
  linked_startups TEXT[] NOT NULL DEFAULT '{}',
  reporting_manager_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  employment_type TEXT NOT NULL DEFAULT 'full_time',
  salary NUMERIC NOT NULL DEFAULT 0,
  cost_to_company NUMERIC NOT NULL DEFAULT 0,
  joining_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  kpi_score NUMERIC NOT NULL DEFAULT 0,
  productivity_score NUMERIC NOT NULL DEFAULT 0,
  weekly_output_score NUMERIC NOT NULL DEFAULT 0,
  hours_committed NUMERIC NOT NULL DEFAULT 0,
  hours_delivered NUMERIC NOT NULL DEFAULT 0,
  tasks_assigned INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view people" ON public.people
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Founders can manage people" ON public.people
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));

CREATE POLICY "MFOs can manage people" ON public.people
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'::app_role));

CREATE TRIGGER update_people_updated_at
  BEFORE UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
