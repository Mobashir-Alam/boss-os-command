import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type InsightTone = "positive" | "warning" | "critical" | "neutral";
export type InsightSource = "youtube" | "slack" | "github" | "cross";

export interface InsightCard {
  priority: number;
  source: InsightSource;
  headline: string;
  finding: string;
  action: string;
  tone: InsightTone;
}

export interface SourceSummaries {
  youtube: {
    total_views: number;
    top_video: string;
    channel_with_most_growth: string;
    recommendation: string;
  } | null;
  slack: {
    attendance_rate_pct: number | null;
    most_active_channel: string;
    top_checkin_person: string;
    trend: "improving" | "declining" | "flat";
    risk_flag: string | null;
  } | null;
  github: {
    total_commits: number;
    prs_merged: number;
    most_active_contributor: string;
    dormant_repos: string[];
    code_health: string;
  } | null;
}

export interface CeoInsightsPayload {
  generated_at: string;
  cached: boolean;
  insights: InsightCard[];
  summaries: SourceSummaries | null;
}

async function fetchInsights(
  startupId: string,
  periodDays: number,
  force: boolean
): Promise<CeoInsightsPayload> {
  const { data, error } = await supabase.functions.invoke("ceo-insights", {
    body: { startup_id: startupId, period_days: periodDays, force },
  });
  if (error) throw error;
  if (data?.ok === false || data?.error) throw new Error(data?.error ?? "ceo-insights failed");
  return {
    generated_at: data.generated_at,
    cached: !!data.cached,
    insights: (data.insights ?? []) as InsightCard[],
    summaries: (data.summaries ?? null) as SourceSummaries | null,
  };
}

// AI insight cards + per-source summaries (Sections B + C). The edge function
// serves a 3h cache; the refresh mutation bypasses it.
export function useCeoInsights(startupId: string | undefined, periodDays: 7 | 15 | 30) {
  return useQuery({
    queryKey: ["ceo-insights", startupId, periodDays],
    enabled: !!startupId,
    staleTime: 10 * 60 * 1000,
    queryFn: () => fetchInsights(startupId!, periodDays, false),
  });
}

export function useRefreshCeoInsights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ startupId, periodDays }: { startupId: string; periodDays: 7 | 15 | 30 }) =>
      fetchInsights(startupId, periodDays, true),
    onSuccess: (data, vars) => {
      qc.setQueryData(["ceo-insights", vars.startupId, vars.periodDays], data);
    },
  });
}
