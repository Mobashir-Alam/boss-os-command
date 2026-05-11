import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TechMember = {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  role: string;
};

export const useTechMembers = () =>
  useQuery({
    queryKey: ["tech-members"],
    queryFn: async (): Promise<TechMember[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role, department")
        .eq("department", "tech");
      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name ?? p.email ?? "Unknown",
        email: p.email,
        avatar_url: p.avatar_url,
        role: p.role,
      }));
    },
  });

export type TechTask = {
  id: string;
  project_id: string;
  title: string;
  status: string;
  completion_percentage: number;
  blocked_reason: string | null;
  deadline: string | null;
  assignee_profile: string | null;
  project_title?: string;
};

export const useTechTasks = (memberIds: string[]) =>
  useQuery({
    queryKey: ["tech-tasks", memberIds.sort().join(",")],
    enabled: memberIds.length > 0,
    queryFn: async (): Promise<TechTask[]> => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("id, project_id, title, status, completion_percentage, blocked_reason, deadline, assignee_profile, projects(title)")
        .in("assignee_profile", memberIds);
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
        project_title: t.projects?.title,
      }));
    },
  });
