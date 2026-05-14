import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export interface BugComment {
  id: string;
  bug_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined fields:
  author?: { full_name: string | null; email: string | null } | null;
}

export function useBugComments(bugId: string | undefined) {
  const qc = useQueryClient();

  // Realtime subscription so the thread updates live
  useEffect(() => {
    if (!bugId) return;
    const channel = supabase
      .channel(`bug-comments-${bugId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bug_comments", filter: `bug_id=eq.${bugId}` },
        () => qc.invalidateQueries({ queryKey: ["bug-comments", bugId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bugId, qc]);

  return useQuery({
    queryKey: ["bug-comments", bugId],
    enabled: !!bugId,
    queryFn: async (): Promise<BugComment[]> => {
      const { data, error } = await supabase
        .from("bug_comments")
        .select("*, author:profiles!author_id(full_name, email)")
        .eq("bug_id", bugId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as BugComment[];
    },
  });
}

export function useCreateBugComment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ bugId, body }: { bugId: string; body: string }) => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await supabase.from("bug_comments").insert({
        bug_id: bugId,
        author_id: user.id,
        body: body.trim(),
      } as any);
      if (error) throw error;
      return bugId;
    },
    onSuccess: (bugId) => qc.invalidateQueries({ queryKey: ["bug-comments", bugId] }),
  });
}

// Soft-delete: sets deleted_at (UI hides them, data preserved for audit).
export function useDeleteBugComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, bugId }: { commentId: string; bugId: string }) => {
      const { error } = await supabase
        .from("bug_comments")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", commentId);
      if (error) throw error;
      return bugId;
    },
    onSuccess: (bugId) => qc.invalidateQueries({ queryKey: ["bug-comments", bugId] }),
  });
}
