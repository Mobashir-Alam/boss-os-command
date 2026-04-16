import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

function useCrud(table: string, startupId: string, orderBy = "created_at") {
  const qc = useQueryClient();
  const key = [table, startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await sb.from(table).select("*").eq("startup_id", startupId).order(orderBy, { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!startupId,
  });

  const add = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await sb.from(table).insert({ ...input, startup_id: startupId, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any>) => {
      const { error } = await sb.from(table).update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Removed"); },
  });

  return { data: query.data ?? [], loading: query.isLoading, add, update, remove };
}

export const useProductOutcomes = (sid: string) => useCrud("product_outcomes", sid);
export const useProductInitiatives = (sid: string) => useCrud("product_initiatives", sid);
export const useProductFeatures = (sid: string) => useCrud("product_features", sid);
export const useTechHealth = (sid: string) => useCrud("tech_health_entries", sid);
