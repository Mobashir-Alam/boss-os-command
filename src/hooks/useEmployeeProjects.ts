import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStartups } from "@/hooks/useStartups";

export type ProjectStatus = "active" | "paused" | "completed" | "cancelled";
export type MemberStatus = "not_started" | "in_progress" | "done" | "blocked";

export interface ProjectMember {
  id: string;
  project_id: string;
  profile_id: string;
  person_id: string | null;
  role: string;
  task_title: string | null;
  task_description: string | null;
  status: MemberStatus;
  completion_percentage: number;
  progress_note: string | null;
  blocked_reason: string | null;
  assigned_at: string;
  updated_at: string;
  profile_name?: string;
  profile_email?: string;
}

export interface Project {
  id: string;
  startup_id: string;
  department_key: string | null;
  title: string;
  description: string | null;
  status: ProjectStatus;
  deadline: string | null;
  created_by_profile: string | null;
  overall_completion: number;
  created_at: string;
  updated_at: string;
  startup_name?: string;
  my_member_row?: ProjectMember;
  members?: ProjectMember[];
}

export interface Notification {
  id: string;
  recipient_profile_id: string;
  type: string;
  project_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

// Fetch all projects for current user.
// - Founders/CEOs: see all projects across their portfolio companies
// - Everyone else: see only projects they are assigned to
export function useMyProjects() {
  const { user, isFounder } = useAuth();
  const { dbStartups } = useStartups();

  return useQuery({
    queryKey: ["my-projects", user?.id, isFounder],
    enabled: !!user?.id,
    queryFn: async (): Promise<Project[]> => {
      if (!user?.id) return [];

      if (isFounder) {
        // Founders see all projects across all their startups
        // Use dbStartups (real UUIDs), not startups (which maps id → slug)
        const startupIds = dbStartups.map((s) => s.id);
        if (startupIds.length === 0) return [];

        const { data: projects, error: projErr } = await supabase
          .from("projects")
          .select("*, startups(name)")
          .in("startup_id", startupIds)
          .order("created_at", { ascending: false });

        if (projErr) throw projErr;

        // Also fetch this founder's own member rows (if they assigned themselves)
        const projectIds = (projects ?? []).map((p: any) => p.id);
        let memberRowMap: Record<string, any> = {};
        if (projectIds.length > 0) {
          const { data: memberRows } = await supabase
            .from("project_members")
            .select("*")
            .eq("profile_id", user.id)
            .in("project_id", projectIds);
          (memberRows ?? []).forEach((m) => { memberRowMap[m.project_id] = m; });
        }

        return (projects ?? []).map((p: any) => ({
          ...p,
          startup_name: p.startups?.name ?? null,
          my_member_row: memberRowMap[p.id] ?? null,
        }));
      }

      // Non-founders: see only projects they are a member of
      const { data: memberRows, error: memberErr } = await supabase
        .from("project_members")
        .select("*")
        .eq("profile_id", user.id)
        .order("assigned_at", { ascending: false });

      if (memberErr) throw memberErr;
      if (!memberRows || memberRows.length === 0) return [];

      const projectIds = memberRows.map((m) => m.project_id);

      const { data: projects, error: projErr } = await supabase
        .from("projects")
        .select("*, startups(name)")
        .in("id", projectIds)
        .order("created_at", { ascending: false });

      if (projErr) throw projErr;

      return (projects ?? []).map((p: any) => ({
        ...p,
        startup_name: p.startups?.name ?? null,
        my_member_row: memberRows.find((m) => m.project_id === p.id) ?? null,
      }));
    },
  });
}

// Fetch a single project with all its members
export function useProjectDetail(projectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["project-detail", projectId],
    enabled: !!projectId && !!user?.id,
    queryFn: async (): Promise<Project | null> => {
      if (!projectId) return null;

      const { data: project, error: projErr } = await supabase
        .from("projects")
        .select("*, startups(name)")
        .eq("id", projectId)
        .single();

      if (projErr) throw projErr;
      if (!project) return null;

      // Fetch all members of this project
      const { data: members, error: memErr } = await supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId)
        .order("assigned_at", { ascending: true });

      if (memErr) throw memErr;

      // Build name map: prefer people table (for seed/demo rows where person_id is set),
      // fall back to profiles table (for real auth users).
      const memberList = members ?? [];
      let nameMap: Record<string, { full_name: string | null; email: string | null }> = {};

      // 1. Look up real auth users in profiles table
      const profileIds = memberList.map((m) => m.profile_id).filter(Boolean);
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", profileIds);
        (profiles ?? []).forEach((p: any) => {
          nameMap[p.id] = { full_name: p.full_name, email: p.email };
        });
      }

      // 2. Look up demo/seed people by person_id (people table has no email column)
      const personIds = memberList.map((m) => m.person_id).filter(Boolean) as string[];
      if (personIds.length > 0) {
        const { data: peopleRows } = await supabase
          .from("people")
          .select("id, full_name")
          .in("id", personIds);
        (peopleRows ?? []).forEach((p: any) => {
          nameMap[p.id] = { full_name: p.full_name, email: null };
        });
      }

      const enrichedMembers: ProjectMember[] = memberList.map((m) => {
        const lookup = (m.person_id && nameMap[m.person_id]) || nameMap[m.profile_id] || null;
        return {
          ...m,
          status: m.status as MemberStatus,
          profile_name: lookup?.full_name ?? "Team Member",
          profile_email: lookup?.email ?? null,
        };
      });

      return {
        ...(project as any),
        startup_name: (project as any).startups?.name ?? null,
        members: enrichedMembers,
        my_member_row: enrichedMembers.find((m) => m.profile_id === user?.id) ?? null,
      };
    },
  });
}

// Update my own task progress
export function useUpdateMyTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      memberId,
      projectId,
      status,
      completion_percentage,
      progress_note,
      blocked_reason,
    }: {
      memberId: string;
      projectId: string;
      status?: MemberStatus;
      completion_percentage?: number;
      progress_note?: string;
      blocked_reason?: string;
    }) => {
      const updates: {
        status?: MemberStatus;
        completion_percentage?: number;
        progress_note?: string;
        blocked_reason?: string;
      } = {};
      if (status !== undefined) updates.status = status;
      if (completion_percentage !== undefined) updates.completion_percentage = completion_percentage;
      if (progress_note !== undefined) updates.progress_note = progress_note;
      if (blocked_reason !== undefined) updates.blocked_reason = blocked_reason;

      const { error } = await supabase
        .from("project_members")
        .update(updates)
        .eq("id", memberId)
        .eq("profile_id", user!.id);

      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-projects", user?.id] });
    },
  });
}

// Fetch all projects a specific person (by person_id) is assigned to
// Used by CEO when inspecting an individual employee
export function usePersonProjects(personId: string | null | undefined) {
  return useQuery({
    queryKey: ["person-projects", personId],
    enabled: !!personId,
    queryFn: async (): Promise<Project[]> => {
      if (!personId) return [];

      const { data: memberRows, error: memberErr } = await supabase
        .from("project_members")
        .select("*")
        .eq("person_id", personId)
        .order("assigned_at", { ascending: false });

      if (memberErr) throw memberErr;
      if (!memberRows || memberRows.length === 0) return [];

      const projectIds = memberRows.map((m: any) => m.project_id);

      const { data: projects, error: projErr } = await supabase
        .from("projects")
        .select("*, startups(name)")
        .in("id", projectIds)
        .order("created_at", { ascending: false });

      if (projErr) throw projErr;

      return (projects ?? []).map((p: any) => ({
        ...p,
        startup_name: p.startups?.name ?? null,
        my_member_row: (memberRows.find((m: any) => m.project_id === p.id) ?? null) as ProjectMember | null,
      }));
    },
  });
}

// Fetch unread notifications for current user
export function useMyNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Notification[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_profile_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });
}

// Mark a notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("recipient_profile_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-notifications", user?.id] });
    },
  });
}
