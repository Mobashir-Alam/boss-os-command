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

// ============================================================
// Project Discussion (chat thread per project)
// ============================================================

export interface ProjectMessage {
  id: string;
  project_id: string;
  author_profile: string;
  author_name: string;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export function useProjectMessages(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-messages", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectMessage[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_messages")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProjectMessage[];
    },
  });
}

export function useSendProjectMessage() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ projectId, body }: { projectId: string; body: string }) => {
      if (!user?.id) throw new Error("Not signed in");
      const trimmed = body.trim();
      if (!trimmed) throw new Error("Message is empty");

      const author_name =
        profile?.full_name ||
        profile?.email?.split("@")[0] ||
        user.email?.split("@")[0] ||
        "Team Member";

      const { error } = await supabase.from("project_messages").insert({
        project_id: projectId,
        author_profile: user.id,
        author_name,
        body: trimmed,
      } as any);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-messages", projectId] });
    },
  });
}

export function useDeleteProjectMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, projectId }: { messageId: string; projectId: string }) => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await supabase
        .from("project_messages")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", messageId)
        .eq("author_profile", user.id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-messages", projectId] });
    },
  });
}

// ============================================================
// Lead / CEO project management
// ============================================================

export interface AssignableProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  department: string | null;
}

export function useAssignableProfiles() {
  return useQuery({
    queryKey: ["assignable-profiles"],
    queryFn: async (): Promise<AssignableProfile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, department")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).filter((p) => p.full_name) as AssignableProfile[];
    },
  });
}

export interface NewMemberInput {
  profile_id: string;
  role: "lead" | "member";
  task_title?: string | null;
  task_description?: string | null;
}

export interface CreateProjectInput {
  startup_id: string;
  department_key: string | null;
  title: string;
  description?: string | null;
  deadline?: string | null;
  status?: ProjectStatus;
  members: NewMemberInput[];
}

async function notifyMembers(
  projectId: string,
  projectTitle: string,
  recipientIds: string[],
  type: "project_assigned" | "task_updated" | "project_completed" | "project_paused"
) {
  if (recipientIds.length === 0) return;
  const messageByType: Record<string, string> = {
    project_assigned: `You've been added to "${projectTitle}"`,
    task_updated: `Your task on "${projectTitle}" was updated`,
    project_completed: `"${projectTitle}" was marked complete`,
    project_paused: `"${projectTitle}" was paused`,
  };
  const rows = recipientIds.map((rid) => ({
    recipient_profile_id: rid,
    type,
    project_id: projectId,
    message: messageByType[type],
  }));
  await supabase.from("notifications").insert(rows as any);
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      if (!user?.id) throw new Error("Not signed in");
      if (input.members.length === 0) throw new Error("Pick at least one member");
      const leads = input.members.filter((m) => m.role === "lead");
      if (leads.length !== 1) throw new Error("Exactly one lead required");

      const { data: project, error: projErr } = await supabase
        .from("projects")
        .insert({
          startup_id: input.startup_id,
          department_key: input.department_key,
          title: input.title,
          description: input.description ?? null,
          deadline: input.deadline ?? null,
          status: input.status ?? "active",
          created_by_profile: user.id,
        } as any)
        .select("id, title")
        .single();
      if (projErr) throw projErr;

      const projectId = (project as any).id as string;
      const projectTitle = (project as any).title as string;

      // Membership rows (no task data — tasks live in project_tasks now)
      const memberRows = input.members.map((m) => ({
        project_id: projectId,
        profile_id: m.profile_id,
        role: m.role,
      }));
      const { error: memberErr } = await supabase
        .from("project_members")
        .insert(memberRows as any);
      if (memberErr) throw memberErr;

      // Initial tasks: one project_tasks row per member with a task_title
      const initialTasks = input.members
        .filter((m) => (m.task_title ?? "").trim().length > 0)
        .map((m) => ({
          project_id: projectId,
          assigned_to_profile: m.profile_id,
          title: m.task_title!.trim(),
          description: m.task_description?.trim() || null,
          created_by: user.id,
        }));
      if (initialTasks.length > 0) {
        const { error: taskErr } = await supabase
          .from("project_tasks")
          .insert(initialTasks as any);
        if (taskErr) throw taskErr;
      }

      const recipientIds = input.members
        .map((m) => m.profile_id)
        .filter((id) => id !== user.id);
      await notifyMembers(projectId, projectTitle, recipientIds, "project_assigned");

      return projectId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    },
  });
}

export interface UpdateProjectInput {
  projectId: string;
  patch: {
    title?: string;
    description?: string | null;
    status?: ProjectStatus;
    deadline?: string | null;
    department_key?: string | null;
  };
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, patch }: UpdateProjectInput) => {
      const { error } = await supabase
        .from("projects")
        .update(patch as any)
        .eq("id", projectId);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    },
  });
}

export function useAddProjectMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      projectId,
      projectTitle,
      member,
    }: {
      projectId: string;
      projectTitle: string;
      member: NewMemberInput;
    }) => {
      const { error } = await supabase.from("project_members").insert({
        project_id: projectId,
        profile_id: member.profile_id,
        role: member.role,
      } as any);
      if (error) throw error;

      // If the lead also gave them an initial task, create it in project_tasks
      if ((member.task_title ?? "").trim().length > 0) {
        await supabase.from("project_tasks").insert({
          project_id: projectId,
          assigned_to_profile: member.profile_id,
          title: member.task_title!.trim(),
          description: member.task_description?.trim() || null,
          created_by: user?.id ?? null,
        } as any);
      }

      if (member.profile_id !== user?.id) {
        await notifyMembers(projectId, projectTitle, [member.profile_id], "project_assigned");
      }
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    },
  });
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, projectId }: { memberId: string; projectId: string }) => {
      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    },
  });
}

// Lead version: update any member's row on a project the caller leads.
export function useLeadUpdateMemberTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      projectId,
      patch,
    }: {
      memberId: string;
      projectId: string;
      patch: {
        task_title?: string | null;
        task_description?: string | null;
        status?: MemberStatus;
        completion_percentage?: number;
        progress_note?: string | null;
        blocked_reason?: string | null;
        role?: "lead" | "member";
      };
    }) => {
      const { error } = await supabase
        .from("project_members")
        .update(patch as any)
        .eq("id", memberId);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    },
  });
}
