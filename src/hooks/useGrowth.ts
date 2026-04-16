import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Growth Config ───
export function useGrowthConfig(startupId: string) {
  const qc = useQueryClient();
  const key = ["growth_config", startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("growth_config").select("*").eq("startup_id", startupId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!startupId,
  });

  const upsert = useMutation({
    mutationFn: async (input: { growth_model: string; funnel_stages?: string[]; custom_channels?: string[] }) => {
      const payload: any = { startup_id: startupId, growth_model: input.growth_model };
      if (input.funnel_stages) payload.funnel_stages = input.funnel_stages;
      if (input.custom_channels) payload.custom_channels = input.custom_channels;
      const { error } = await (supabase as any).from("growth_config").upsert(payload, { onConflict: "startup_id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Growth model updated"); },
    onError: () => toast.error("Failed to update"),
  });

  return { config: query.data, loading: query.isLoading, upsert };
}

// ─── Growth Metrics ───
export function useGrowthMetrics(startupId: string) {
  const qc = useQueryClient();
  const key = ["growth_metrics", startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("growth_metrics").select("*").eq("startup_id", startupId).order("period", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!startupId,
  });

  const add = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("growth_metrics").insert({ ...input, startup_id: startupId, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Metric added"); },
    onError: () => toast.error("Failed to add metric"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("growth_metrics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Removed"); },
  });

  return { metrics: query.data ?? [], loading: query.isLoading, add, remove };
}

// ─── Growth Experiments ───
export function useGrowthExperiments(startupId: string) {
  const qc = useQueryClient();
  const key = ["growth_experiments", startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("growth_experiments").select("*").eq("startup_id", startupId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!startupId,
  });

  const add = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("growth_experiments").insert({ ...input, startup_id: startupId, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Experiment added"); },
    onError: () => toast.error("Failed to add"),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any>) => {
      const { error } = await (supabase as any).from("growth_experiments").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("growth_experiments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Removed"); },
  });

  return { experiments: query.data ?? [], loading: query.isLoading, add, update, remove };
}
