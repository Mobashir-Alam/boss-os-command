import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUpdateProjectReadme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, readme }: { projectId: string; readme: string | null }) => {
      const { error } = await supabase
        .from("projects")
        .update({ readme_md: readme } as any)
        .eq("id", projectId);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: ["project-detail", projectId] });
    },
  });
}
