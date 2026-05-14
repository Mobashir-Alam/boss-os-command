import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo } from "react";

export interface BugCommentRow {
  id: string;
  bug_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BugComment extends BugCommentRow {
  author?: { full_name: string | null; email: string | null } | null;
}

// Two-step fetch: bug_comments don't have a direct FK to profiles (the FK
// points to auth.users), so PostgREST's embed shorthand `profiles!author_id`
// returns PGRST200. We fetch comments first, then look up author profiles
// by id and merge them in.

export function useBugComments(bugId: string | undefined) {
  const qc = useQueryClient();

  // Realtime: invalidate the comments query whenever a row changes
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

  const commentsQuery = useQuery({
    queryKey: ["bug-comments", bugId],
    enabled: !!bugId,
    queryFn: async (): Promise<BugCommentRow[]> => {
      const { data, error } = await supabase
        .from("bug_comments")
        .select("*")
        .eq("bug_id", bugId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BugCommentRow[];
    },
  });

  const authorIds = useMemo(
    () =>
      Array.from(
        new Set((commentsQuery.data ?? []).map((c) => c.author_id).filter(Boolean) as string[])
      ),
    [commentsQuery.data]
  );

  const profilesQuery = useQuery({
    queryKey: ["bug-comment-authors", authorIds.sort().join(",")],
    enabled: authorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", authorIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const data: BugComment[] = useMemo(() => {
    const profMap = new Map<string, { full_name: string | null; email: string | null }>();
    (profilesQuery.data ?? []).forEach((p: any) => {
      profMap.set(p.id, { full_name: p.full_name ?? null, email: p.email ?? null });
    });
    return (commentsQuery.data ?? []).map((c) => ({
      ...c,
      author: c.author_id ? profMap.get(c.author_id) ?? null : null,
    }));
  }, [commentsQuery.data, profilesQuery.data]);

  return {
    data,
    isLoading: commentsQuery.isLoading,
    error: commentsQuery.error,
  };
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
