import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo } from "react";

export type NotificationType =
  | "project_assigned"
  | "task_updated"
  | "task_assigned"
  | "project_completed"
  | "project_paused"
  | "project_member_added"
  | "mention"
  | "bug_comment"
  | "bug_assigned"
  | "bug_status_changed";

export interface NotificationRow {
  id: string;
  recipient_profile_id: string;
  actor_profile_id: string | null;
  type: NotificationType;
  project_id: string | null;
  bug_id: string | null;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface Notification extends NotificationRow {
  actor?: { full_name: string | null; email: string | null } | null;
}

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_profile_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });
          qc.invalidateQueries({ queryKey: ["unread-count", user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const notifQuery = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_profile_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  // Two-step: fetch actor profiles separately (same pattern as bug comments)
  const actorIds = useMemo(
    () =>
      Array.from(
        new Set(
          (notifQuery.data ?? []).map((n) => n.actor_profile_id).filter(Boolean) as string[]
        )
      ),
    [notifQuery.data]
  );

  const actorsQuery = useQuery({
    queryKey: ["notification-actors", actorIds.sort().join(",")],
    enabled: actorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", actorIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const data: Notification[] = useMemo(() => {
    const map = new Map<string, { full_name: string | null; email: string | null }>();
    (actorsQuery.data ?? []).forEach((p: any) =>
      map.set(p.id, { full_name: p.full_name ?? null, email: p.email ?? null })
    );
    return (notifQuery.data ?? []).map((n) => ({
      ...n,
      actor: n.actor_profile_id ? map.get(n.actor_profile_id) ?? null : null,
    }));
  }, [notifQuery.data, actorsQuery.data]);

  return { data, isLoading: notifQuery.isLoading };
}

export function useUnreadCount(): number {
  const { user } = useAuth();
  const { data: q } = useQuery({
    queryKey: ["unread-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_profile_id", user!.id)
        .eq("read", false);
      if (error) throw error;
      return count ?? 0;
    },
  });
  return q ?? 0;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
      qc.invalidateQueries({ queryKey: ["unread-count", user?.id] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as any)
        .eq("recipient_profile_id", user.id)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
      qc.invalidateQueries({ queryKey: ["unread-count", user?.id] });
    },
  });
}

// Helper used by mention senders elsewhere in the app.
export async function insertMentionNotifications({
  mentionedProfileIds,
  actorProfileId,
  message,
  link,
  projectId,
  bugId,
}: {
  mentionedProfileIds: string[];
  actorProfileId: string;
  message: string;
  link: string | null;
  projectId?: string | null;
  bugId?: string | null;
}) {
  // Don't notify yourself if you @-mention yourself.
  const recipients = mentionedProfileIds.filter((id) => id && id !== actorProfileId);
  if (recipients.length === 0) return;

  const rows = recipients.map((rid) => ({
    recipient_profile_id: rid,
    actor_profile_id: actorProfileId,
    type: "mention",
    message,
    link: link ?? null,
    project_id: projectId ?? null,
    bug_id: bugId ?? null,
  }));

  await supabase.from("notifications").insert(rows as any);
}
