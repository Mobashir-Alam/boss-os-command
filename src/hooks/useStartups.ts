import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Startup, StartupStatus } from "@/data/startups";

export interface DbStartup {
  id: string;
  slug: string;
  name: string;
  status: string;
  runway: string;
  growth: string;
  growth_direction: string;
  insight: string;
  insight_detail: string;
  insight_trend: string;
  insight_last_updated: string;
  spark_data: number[];
  detected_ago: string;
  last_updated: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function toStartup(db: DbStartup): Startup {
  return {
    id: db.slug,
    name: db.name,
    status: db.status as StartupStatus,
    runway: db.runway,
    growth: db.growth,
    growthDirection: db.growth_direction as "up" | "down",
    insight: db.insight,
    insightDetail: db.insight_detail,
    insightTrend: db.insight_trend,
    insightLastUpdated: db.insight_last_updated,
    sparkData: Array.isArray(db.spark_data) ? db.spark_data : [],
    detectedAgo: db.detected_ago,
    lastUpdated: db.last_updated,
  };
}

export function useStartups() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["startups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startups")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as unknown as DbStartup[]) ?? [];
    },
  });

  const dbStartups = query.data ?? [];
  const startups: Startup[] = dbStartups.map(toStartup);

  const addStartup = useMutation({
    mutationFn: async (input: Partial<DbStartup> & { name: string; slug: string }) => {
      const { error } = await supabase.from("startups").insert(input as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["startups"] }),
  });

  const updateStartup = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<DbStartup>) => {
      const { error } = await supabase.from("startups").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["startups"] }),
  });

  const deleteStartup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("startups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["startups"] }),
  });

  return {
    startups,
    dbStartups,
    isLoading: query.isLoading,
    error: query.error,
    addStartup,
    updateStartup,
    deleteStartup,
    refetch: query.refetch,
  };
}
