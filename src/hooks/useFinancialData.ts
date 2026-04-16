import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useFinancialEntries = (startupId?: string) => {
  return useQuery({
    queryKey: ["financial_entries", startupId],
    queryFn: async () => {
      let q = supabase.from("financial_entries").select("*").order("entry_date", { ascending: false });
      if (startupId) q = q.eq("startup_id", startupId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!startupId,
  });
};

export const useBurnCategories = (startupId?: string) => {
  return useQuery({
    queryKey: ["burn_categories", startupId],
    queryFn: async () => {
      let q = supabase.from("burn_categories").select("*").order("monthly_amount", { ascending: false });
      if (startupId) q = q.eq("startup_id", startupId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!startupId,
  });
};

export const useCashFlowEntries = (startupId?: string) => {
  return useQuery({
    queryKey: ["cash_flow_entries", startupId],
    queryFn: async () => {
      let q = supabase.from("cash_flow_entries").select("*").order("entry_date", { ascending: false });
      if (startupId) q = q.eq("startup_id", startupId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!startupId,
  });
};

export const useFinancialForecasts = (startupId?: string) => {
  return useQuery({
    queryKey: ["financial_forecasts", startupId],
    queryFn: async () => {
      let q = supabase.from("financial_forecasts").select("*").order("forecast_month", { ascending: true });
      if (startupId) q = q.eq("startup_id", startupId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!startupId,
  });
};

export const useAddFinancialEntry = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (entry: {
      startup_id: string;
      entry_type: string;
      category: string;
      description: string;
      amount: number;
      currency?: string;
      entry_date?: string;
      recurring?: boolean;
    }) => {
      const { error } = await supabase.from("financial_entries").insert({ ...entry, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial_entries"] });
      toast.success("Entry added");
    },
    onError: () => toast.error("Failed to add entry"),
  });
};

export const useDeleteFinancialEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial_entries"] });
      toast.success("Entry deleted");
    },
  });
};

export const useAddBurnCategory = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (entry: {
      startup_id: string;
      category_name: string;
      monthly_amount: number;
      trend?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from("burn_categories").insert({ ...entry, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["burn_categories"] });
      toast.success("Burn category added");
    },
    onError: () => toast.error("Failed to add burn category"),
  });
};

export const useDeleteBurnCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("burn_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["burn_categories"] });
      toast.success("Category removed");
    },
  });
};

export const useAddCashFlowEntry = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (entry: {
      startup_id: string;
      flow_type: string;
      source: string;
      amount: number;
      entry_date?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from("cash_flow_entries").insert({ ...entry, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_flow_entries"] });
      toast.success("Cash flow entry added");
    },
    onError: () => toast.error("Failed to add cash flow entry"),
  });
};

export const useDeleteCashFlowEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cash_flow_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_flow_entries"] });
      toast.success("Entry removed");
    },
  });
};

export const useAddForecast = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (entry: {
      startup_id: string;
      forecast_month: string;
      projected_revenue: number;
      projected_expenses: number;
      projected_runway_months?: number;
      assumptions?: string;
    }) => {
      const { error } = await supabase.from("financial_forecasts").insert({ ...entry, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial_forecasts"] });
      toast.success("Forecast added");
    },
    onError: () => toast.error("Failed to add forecast"),
  });
};

export const useDeleteForecast = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_forecasts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial_forecasts"] });
      toast.success("Forecast removed");
    },
  });
};
