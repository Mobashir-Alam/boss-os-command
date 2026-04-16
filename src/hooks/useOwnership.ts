import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
export interface Stakeholder {
  id: string;
  startup_id: string;
  name: string;
  role: string;
  equity_pct: number;
  equity_type: string;
  voting_pct: number;
  vesting_schedule: string | null;
  vesting_start: string | null;
  vesting_end: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardSeat {
  id: string;
  startup_id: string;
  seat_type: string;
  holder_name: string;
  holder_role: string | null;
  notes: string | null;
  created_at: string;
}

export interface SpecialRight {
  id: string;
  startup_id: string;
  right_type: string;
  holder_name: string;
  description: string | null;
  conditions: string | null;
  created_at: string;
}

export interface FundingRound {
  id: string;
  startup_id: string;
  round_name: string;
  valuation: number | null;
  raise_amount: number | null;
  is_simulated: boolean;
  round_order: number;
  notes: string | null;
  created_at: string;
}

export interface EquityDocument {
  id: string;
  stakeholder_id: string;
  startup_id: string;
  file_name: string;
  file_url: string;
  doc_type: string;
  created_at: string;
}

export interface StakeholderHistory {
  id: string;
  stakeholder_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

export function useStakeholders(startupId: string) {
  const qc = useQueryClient();
  const key = ["stakeholders", startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stakeholders")
        .select("*")
        .eq("startup_id", startupId)
        .order("equity_pct", { ascending: false });
      if (error) throw error;
      return data as Stakeholder[];
    },
    enabled: !!startupId,
  });

  const upsert = useMutation({
    mutationFn: async (s: Partial<Stakeholder> & { startup_id: string }) => {
      if (s.id) {
        const { error } = await supabase.from("stakeholders").update(s).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stakeholders").insert(s);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Stakeholder saved"); },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stakeholders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Stakeholder removed"); },
    onError: (e) => toast.error(e.message),
  });

  return { ...query, upsert, remove };
}

export function useStakeholderHistory(stakeholderId: string | null) {
  return useQuery({
    queryKey: ["stakeholder-history", stakeholderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stakeholder_history")
        .select("*")
        .eq("stakeholder_id", stakeholderId!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data as StakeholderHistory[];
    },
    enabled: !!stakeholderId,
  });
}

export function useBoardSeats(startupId: string) {
  const qc = useQueryClient();
  const key = ["board-seats", startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("board_seats").select("*").eq("startup_id", startupId);
      if (error) throw error;
      return data as BoardSeat[];
    },
    enabled: !!startupId,
  });

  const upsert = useMutation({
    mutationFn: async (s: Partial<BoardSeat> & { startup_id: string }) => {
      if (s.id) {
        const { error } = await supabase.from("board_seats").update(s).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("board_seats").insert(s);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Board seat saved"); },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("board_seats").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Board seat removed"); },
    onError: (e) => toast.error(e.message),
  });

  return { ...query, upsert, remove };
}

export function useSpecialRights(startupId: string) {
  const qc = useQueryClient();
  const key = ["special-rights", startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("special_rights").select("*").eq("startup_id", startupId);
      if (error) throw error;
      return data as SpecialRight[];
    },
    enabled: !!startupId,
  });

  const upsert = useMutation({
    mutationFn: async (s: Partial<SpecialRight> & { startup_id: string }) => {
      if (s.id) {
        const { error } = await supabase.from("special_rights").update(s).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("special_rights").insert(s);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Right saved"); },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("special_rights").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Right removed"); },
    onError: (e) => toast.error(e.message),
  });

  return { ...query, upsert, remove };
}

export function useFundingRounds(startupId: string) {
  const qc = useQueryClient();
  const key = ["funding-rounds", startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funding_rounds")
        .select("*")
        .eq("startup_id", startupId)
        .order("round_order", { ascending: true });
      if (error) throw error;
      return data as FundingRound[];
    },
    enabled: !!startupId,
  });

  const upsert = useMutation({
    mutationFn: async (s: Partial<FundingRound> & { startup_id: string }) => {
      if (s.id) {
        const { error } = await supabase.from("funding_rounds").update(s).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("funding_rounds").insert(s);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Round saved"); },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("funding_rounds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Round removed"); },
    onError: (e) => toast.error(e.message),
  });

  return { ...query, upsert, remove };
}

export function useEquityDocuments(startupId: string) {
  const qc = useQueryClient();
  const key = ["equity-documents", startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("equity_documents").select("*").eq("startup_id", startupId);
      if (error) throw error;
      return data as EquityDocument[];
    },
    enabled: !!startupId,
  });

  const upload = useMutation({
    mutationFn: async ({ file, stakeholderId, docType }: { file: File; stakeholderId: string; docType: string }) => {
      const path = `${startupId}/${stakeholderId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("equity-documents").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("equity-documents").getPublicUrl(path);
      const { error } = await supabase.from("equity_documents").insert({
        stakeholder_id: stakeholderId,
        startup_id: startupId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        doc_type: docType,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Document uploaded"); },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equity_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Document removed"); },
    onError: (e) => toast.error(e.message),
  });

  return { ...query, upload, remove };
}
