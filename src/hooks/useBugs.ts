import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BugType =
  | "bug"
  | "new_feature"
  | "critical_security"
  | "high_priority"
  | "product_ux"
  | "new_implementation";
export type BugStatus = "open" | "in_progress" | "solved";
export type BugArea =
  | "frontend"
  | "backend"
  | "mobile"
  | "infra"
  | "devops"
  | "security"
  | "other";

export interface Bug {
  id: string;
  project_id: string | null;
  title: string;
  description: string;
  type: BugType;
  area: BugArea;
  status: BugStatus;
  assignee_profile: string | null;
  reporter_profile: string | null;
  solved_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_ORDER: Record<BugStatus, number> = {
  open: 0,
  in_progress: 1,
  solved: 2,
};

export function useBugs(projectId?: string) {
  return useQuery({
    queryKey: ["bugs", projectId ?? "all"],
    queryFn: async (): Promise<Bug[]> => {
      let q = supabase.from("bugs").select("*").order("created_at", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as Bug[];
      return rows.sort((a, b) => {
        const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (s !== 0) return s;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    },
  });
}

export function useUpdateBugStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BugStatus }) => {
      const { error } = await supabase.from("bugs").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bugs"] }),
  });
}

export function useUpdateBugAssignee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assignee }: { id: string; assignee: string | null }) => {
      const { error } = await supabase
        .from("bugs")
        .update({ assignee_profile: assignee })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bugs"] }),
  });
}

export function useCreateBug() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      type: BugType;
      area: BugArea;
      project_id: string | null;
      assignee_profile: string | null;
      reporter_profile: string;
    }) => {
      const { error } = await supabase.from("bugs").insert({
        ...input,
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bugs"] }),
  });
}
