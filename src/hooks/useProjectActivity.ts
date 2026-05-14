import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ActivityKind = "task_created" | "task_done" | "bug_raised" | "bug_solved" | "member_joined" | "link_added" | "doc_uploaded";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  at: string; // ISO timestamp
  actorId?: string | null;
  actorName?: string | null;
  title: string; // the subject ("X added task '…'")
  meta?: string | null;
}

async function profilesById(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return map;
  const { data } = await supabase.from("profiles").select("id,full_name,email").in("id", unique);
  (data ?? []).forEach((p: any) => map.set(p.id, p.full_name || p.email || "Someone"));
  return map;
}

export function useProjectActivity(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-activity", projectId],
    enabled: !!projectId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<ActivityEvent[]> => {
      const pid = projectId!;
      const [tasks, bugs, members, links, docs] = await Promise.all([
        supabase.from("project_tasks").select("id,title,status,created_at,updated_at,created_by,assignee_profile").eq("project_id", pid),
        supabase.from("bugs").select("id,title,status,created_at,solved_at,reporter_profile,assignee_profile").eq("project_id", pid),
        supabase.from("project_members").select("id,profile_id,assigned_at,role").eq("project_id", pid),
        supabase.from("project_links").select("id,title,created_at,added_by").eq("project_id", pid),
        supabase.from("project_documents").select("id,display_name,created_at,uploaded_by").eq("project_id", pid),
      ]);

      const actorIds: string[] = [];
      (tasks.data ?? []).forEach((t: any) => actorIds.push(t.created_by));
      (bugs.data ?? []).forEach((b: any) => { actorIds.push(b.reporter_profile); actorIds.push(b.assignee_profile); });
      (members.data ?? []).forEach((m: any) => actorIds.push(m.profile_id));
      (links.data ?? []).forEach((l: any) => actorIds.push(l.added_by));
      (docs.data ?? []).forEach((d: any) => actorIds.push(d.uploaded_by));
      const names = await profilesById(actorIds);

      const events: ActivityEvent[] = [];

      (tasks.data ?? []).forEach((t: any) => {
        events.push({
          id: `task-c-${t.id}`,
          kind: "task_created",
          at: t.created_at,
          actorId: t.created_by,
          actorName: names.get(t.created_by) ?? "Someone",
          title: `added task "${t.title}"`,
        });
        if (t.status === "done" && t.updated_at && t.updated_at !== t.created_at) {
          events.push({
            id: `task-d-${t.id}`,
            kind: "task_done",
            at: t.updated_at,
            actorId: t.assignee_profile,
            actorName: names.get(t.assignee_profile) ?? "Someone",
            title: `marked "${t.title}" as done`,
          });
        }
      });

      (bugs.data ?? []).forEach((b: any) => {
        events.push({
          id: `bug-r-${b.id}`,
          kind: "bug_raised",
          at: b.created_at,
          actorId: b.reporter_profile,
          actorName: names.get(b.reporter_profile) ?? "Someone",
          title: `reported bug "${b.title}"`,
        });
        if (b.status === "solved" && b.solved_at) {
          events.push({
            id: `bug-s-${b.id}`,
            kind: "bug_solved",
            at: b.solved_at,
            actorId: b.assignee_profile,
            actorName: names.get(b.assignee_profile) ?? "Someone",
            title: `marked "${b.title}" as solved`,
          });
        }
      });

      (members.data ?? []).forEach((m: any) => {
        events.push({
          id: `mem-${m.id}`,
          kind: "member_joined",
          at: m.assigned_at,
          actorId: m.profile_id,
          actorName: names.get(m.profile_id) ?? "Someone",
          title: m.role === "lead" ? "joined as Lead" : "joined the project",
        });
      });

      (links.data ?? []).forEach((l: any) => {
        events.push({
          id: `link-${l.id}`,
          kind: "link_added",
          at: l.created_at,
          actorId: l.added_by,
          actorName: names.get(l.added_by) ?? "Someone",
          title: `added link "${l.title}"`,
        });
      });

      (docs.data ?? []).forEach((d: any) => {
        events.push({
          id: `doc-${d.id}`,
          kind: "doc_uploaded",
          at: d.created_at,
          actorId: d.uploaded_by,
          actorName: names.get(d.uploaded_by) ?? "Someone",
          title: `uploaded "${d.display_name}"`,
        });
      });

      events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      return events.slice(0, 50);
    },
  });
}
