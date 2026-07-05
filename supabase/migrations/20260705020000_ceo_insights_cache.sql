-- Cache for AI-generated CEO dashboard insights (Section B + C). The
-- ceo-insights edge function regenerates a row only when it is >3h old
-- (or when a refresh is forced).

CREATE TABLE IF NOT EXISTS public.ceo_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  period_days INTEGER NOT NULL,          -- 7 | 15 | 30
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  insights_json JSONB NOT NULL,          -- { insights: [...6 cards], summaries: {youtube, slack, github} }
  UNIQUE (startup_id, period_days)
);

ALTER TABLE public.ceo_insights_cache ENABLE ROW LEVEL SECURITY;

-- Read for signed-in users; writes come from the edge function (service role).
DROP POLICY IF EXISTS "Authenticated can read ceo insights" ON public.ceo_insights_cache;
CREATE POLICY "Authenticated can read ceo insights"
  ON public.ceo_insights_cache FOR SELECT
  TO authenticated USING (true);
