import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ConnectorCredentialRow, ConnectorType, GithubRecord, MetricRow, KaiInsight } from "@/connectors/types";

// ─── Credential management ─────────────────────────────────────────────────

export function useConnectorCredentials(startupId: string | undefined) {
  return useQuery({
    queryKey: ["connector-credentials", startupId],
    enabled: !!startupId,
    queryFn: async (): Promise<ConnectorCredentialRow[]> => {
      const { data, error } = await supabase
        .from("connector_credentials")
        .select("id,startup_id,connector_type,label,is_active,last_synced_at,last_sync_error,created_at")
        .eq("startup_id", startupId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ConnectorCredentialRow[];
    },
  });
}

export function useSaveConnectorCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      startupId,
      connectorType,
      label,
      credentials,
    }: {
      startupId: string;
      connectorType: ConnectorType;
      label: string;
      credentials: Record<string, string>;
    }) => {
      const { error } = await supabase.from("connector_credentials").upsert(
        { startup_id: startupId, connector_type: connectorType, label, credentials, is_active: true },
        { onConflict: "startup_id,connector_type" }
      );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["connector-credentials", vars.startupId] });
    },
  });
}

export function useTriggerSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ startupId, connectorType }: { startupId: string; connectorType: ConnectorType }) => {
      const { data, error } = await supabase.functions.invoke("connector-sync", {
        body: { startup_id: startupId, connector_type: connectorType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; recordsUpserted: number; metricsWritten: number };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["connector-credentials", vars.startupId] });
      qc.invalidateQueries({ queryKey: ["github-prs", vars.startupId] });
      qc.invalidateQueries({ queryKey: ["metrics", vars.startupId] });
    },
  });
}

// ─── GitHub data ──────────────────────────────────────────────────────────

export function useOpenPRs(startupId: string | undefined) {
  return useQuery({
    queryKey: ["github-prs", startupId, "open"],
    enabled: !!startupId,
    queryFn: async (): Promise<GithubRecord[]> => {
      const { data, error } = await supabase
        .from("connector_data_github")
        .select("*")
        .eq("startup_id", startupId!)
        .eq("record_type", "pull_request")
        .eq("state", "open")
        .order("created_at_source", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as GithubRecord[];
    },
  });
}

export function useRecentMergedPRs(startupId: string | undefined) {
  return useQuery({
    queryKey: ["github-prs", startupId, "merged"],
    enabled: !!startupId,
    queryFn: async (): Promise<GithubRecord[]> => {
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      const { data, error } = await supabase
        .from("connector_data_github")
        .select("*")
        .eq("startup_id", startupId!)
        .eq("record_type", "pull_request")
        .eq("state", "merged")
        .gte("merged_at_source", since)
        .order("merged_at_source", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as GithubRecord[];
    },
  });
}

// ─── Metrics ──────────────────────────────────────────────────────────────

export function useMetrics(startupId: string | undefined, departmentKey?: string) {
  return useQuery({
    queryKey: ["metrics", startupId, departmentKey],
    enabled: !!startupId,
    queryFn: async (): Promise<MetricRow[]> => {
      let q = supabase
        .from("metrics")
        .select("*")
        .eq("startup_id", startupId!)
        .order("period_start", { ascending: false })
        .limit(100);
      if (departmentKey) q = q.eq("department_key", departmentKey);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MetricRow[];
    },
  });
}

// Returns the latest value for a single named metric
export function useLatestMetric(
  startupId: string | undefined,
  connectorType: string,
  metricName: string
): number | null {
  const { data } = useMetrics(startupId);
  if (!data) return null;
  const row = data.find((m) => m.connector_type === connectorType && m.metric_name === metricName);
  return row?.metric_value ?? null;
}

// ─── KAI insights ─────────────────────────────────────────────────────────

export function useKaiInsights(startupId: string | undefined, departmentKey?: string) {
  return useQuery({
    queryKey: ["kai-insights", startupId, departmentKey],
    enabled: !!startupId,
    queryFn: async (): Promise<KaiInsight[]> => {
      let q = supabase
        .from("kai_insights")
        .select("*")
        .eq("startup_id", startupId!)
        .eq("is_dismissed", false)
        .order("generated_at", { ascending: false })
        .limit(20);
      if (departmentKey) q = q.eq("department_key", departmentKey);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as KaiInsight[];
    },
  });
}

export function useDismissInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ insightId, startupId }: { insightId: string; startupId: string }) => {
      const { error } = await supabase
        .from("kai_insights")
        .update({ is_dismissed: true })
        .eq("id", insightId);
      if (error) throw error;
      return startupId;
    },
    onSuccess: (startupId) => {
      qc.invalidateQueries({ queryKey: ["kai-insights", startupId] });
    },
  });
}
