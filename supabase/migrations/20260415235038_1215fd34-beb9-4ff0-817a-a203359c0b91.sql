-- Create startups table
CREATE TABLE public.startups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy',
  runway TEXT NOT NULL DEFAULT '',
  growth TEXT NOT NULL DEFAULT '',
  growth_direction TEXT NOT NULL DEFAULT 'up',
  insight TEXT NOT NULL DEFAULT '',
  insight_detail TEXT NOT NULL DEFAULT '',
  insight_trend TEXT NOT NULL DEFAULT '',
  insight_last_updated TEXT NOT NULL DEFAULT '',
  spark_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  detected_ago TEXT NOT NULL DEFAULT '',
  last_updated TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view startups
CREATE POLICY "Authenticated users can view startups"
ON public.startups FOR SELECT TO authenticated
USING (true);

-- Founders can do everything
CREATE POLICY "Founders can manage startups"
ON public.startups FOR ALL TO authenticated
USING (has_role(auth.uid(), 'founder'));

-- MFOs can update startups
CREATE POLICY "MFOs can update startups"
ON public.startups FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'mfo'));

-- Seed demo data
INSERT INTO public.startups (slug, name, status, runway, growth, growth_direction, insight, insight_detail, insight_trend, insight_last_updated, spark_data, detected_ago, last_updated) VALUES
('nasheedio', 'Nasheedio', 'at-risk', '5.5 months', '+12%', 'up', '⚠️ Retention ↓12% this week — low creator uploads', 'Monthly active creators decreased from 1,240 to 1,091. Content upload frequency dropped 18% in the last 30 days.', '↓ Declining over last 2 weeks', 'Updated 2 hours ago', '[80,78,75,70,68,62,58]', '3 days ago', '2 hours ago'),
('gurucool', 'Gurucool', 'at-risk', '8 months', '+5%', 'up', '⚠️ Hiring delayed — backend role open 21 days', 'Senior backend engineer position unfilled. 3 candidates in pipeline, 1 final round scheduled. Blocking API v2 launch.', '→ No change in 3 weeks', 'Updated 1 day ago', '[40,42,44,43,45,46,45]', '21 days ago', '1 day ago'),
('levelup-climate', 'LevelUp Climate', 'healthy', '10 months', '+18%', 'up', '✅ Strong growth — new cohort driving +18% MoM', 'Q1 cohort onboarded 340 new users. Activation rate at 72%, up from 58% last quarter. NPS score improved to 67.', '↑ Accelerating over last 4 weeks', 'Updated 5 hours ago', '[30,35,42,50,58,65,74]', '—', '5 hours ago'),
('project-x', 'Project X', 'critical', '2.5 months', '-3%', 'down', '🔥 Runway critical — 2.5 months left, funding pending', 'Series A term sheet expected by end of month. Current burn rate $85K/mo. Need bridge funding if round delayed beyond 3 weeks.', '↓ Burn rate increased 12% this month', 'Updated 30 min ago', '[90,85,78,70,60,50,42]', '2 weeks ago', '30 min ago');