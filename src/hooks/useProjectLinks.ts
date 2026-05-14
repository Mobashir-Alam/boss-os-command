import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type LinkCategory = "repo" | "design" | "deployment" | "docs" | "monitoring" | "other";

export interface ProjectLink {
  id: string;
  project_id: string;
  title: string;
  url: string;
  category: LinkCategory;
  description: string | null;
  added_by: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function useProjectLinks(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-links", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectLink[]> => {
      const { data, error } = await supabase
        .from("project_links")
        .select("*")
        .eq("project_id", projectId!)
        .order("is_pinned", { ascending: false })
        .order("category", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectLink[];
    },
  });
}

export function useCreateProjectLink() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      title: string;
      url: string;
      category: LinkCategory;
      description?: string | null;
    }) => {
      const { error } = await supabase.from("project_links").insert({
        project_id: input.project_id,
        title: input.title.trim(),
        url: input.url.trim(),
        category: input.category,
        description: input.description?.trim() || null,
        added_by: user?.id ?? null,
      } as any);
      if (error) throw error;
      return input.project_id;
    },
    onSuccess: (pid) => qc.invalidateQueries({ queryKey: ["project-links", pid] }),
  });
}

export function useUpdateProjectLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      linkId,
      projectId,
      patch,
    }: {
      linkId: string;
      projectId: string;
      patch: Partial<Pick<ProjectLink, "title" | "url" | "category" | "description" | "is_pinned">>;
    }) => {
      const { error } = await supabase.from("project_links").update(patch as any).eq("id", linkId);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (pid) => qc.invalidateQueries({ queryKey: ["project-links", pid] }),
  });
}

export function useDeleteProjectLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ linkId, projectId }: { linkId: string; projectId: string }) => {
      const { error } = await supabase.from("project_links").delete().eq("id", linkId);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (pid) => qc.invalidateQueries({ queryKey: ["project-links", pid] }),
  });
}
