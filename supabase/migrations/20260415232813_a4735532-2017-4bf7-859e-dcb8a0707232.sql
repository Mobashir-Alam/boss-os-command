
-- Priorities table
CREATE TABLE public.priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id text NOT NULL,
  startup_name text NOT NULL,
  tag text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'monitor' CHECK (severity IN ('critical', 'at-risk', 'monitor')),
  problem text NOT NULL,
  why text NOT NULL DEFAULT '',
  impact text NOT NULL DEFAULT '',
  impact_level text NOT NULL DEFAULT 'Medium' CHECK (impact_level IN ('High', 'Medium', 'Low')),
  owner text,
  mfo_suggestion text NOT NULL DEFAULT '',
  mfo_confidence text NOT NULL DEFAULT 'Medium' CHECK (mfo_confidence IN ('High', 'Medium')),
  rank integer NOT NULL DEFAULT 0,
  detected_ago text NOT NULL DEFAULT 'Just now',
  deadline_in text NOT NULL DEFAULT '',
  execution_status text NOT NULL DEFAULT 'pending' CHECK (execution_status IN ('pending', 'in-progress', 'done')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view priorities" ON public.priorities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Founders can manage priorities" ON public.priorities
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));

CREATE POLICY "MFOs can manage priorities" ON public.priorities
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));

-- Tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  linked_issue_id text,
  linked_startup_id text NOT NULL,
  assignee text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'blocked', 'completed')),
  deadline text,
  instructions text NOT NULL DEFAULT '',
  blocked_reason text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tasks" ON public.tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Founders can manage tasks" ON public.tasks
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));

CREATE POLICY "MFOs can manage tasks" ON public.tasks
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));

CREATE POLICY "Assignees can update own tasks" ON public.tasks
  FOR UPDATE TO authenticated USING (true);
