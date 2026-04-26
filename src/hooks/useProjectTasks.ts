import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TaskStatus = "not_started" | "in_progress" | "done" | "blocked";

export interface ProjectTask {
  id: string;
  project_id: string;
  assignee_profile: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  completion_percentage: number;
  deadline: string | null;
  progress_note: string | null;
  blocked_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch all tasks for a project
export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-tasks", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectTask[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProjectTask[];
    },
  });
}

// All tasks assigned to current user, across all projects
export function useMyTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-tasks", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ProjectTask[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("assignee_profile", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectTask[];
    },
  });
}

async function notifyAssignee(
  projectId: string,
  projectTitle: string,
  taskTitle: string,
  recipientId: string
) {
  await supabase.from("notifications").insert({
    recipient_profile_id: recipientId,
    type: "project_assigned", // reuse existing type; message conveys it's a task
    project_id: projectId,
    message: `New task on "${projectTitle}": ${taskTitle}`,
  } as any);
}

export interface CreateTaskInput {
  project_id: string;
  project_title: string;
  title: string;
  description?: string | null;
  assignee_profile?: string | null;
  deadline?: string | null;
  status?: TaskStatus;
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!user?.id) throw new Error("Not signed in");
      if (!input.title.trim()) throw new Error("Task title required");

      const { error } = await supabase.from("project_tasks").insert({
        project_id: input.project_id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        assignee_profile: input.assignee_profile ?? null,
        deadline: input.deadline ?? null,
        status: input.status ?? "not_started",
        created_by: user.id,
      } as any);
      if (error) throw error;

      if (input.assignee_profile && input.assignee_profile !== user.id) {
        await notifyAssignee(
          input.project_id,
          input.project_title,
          input.title.trim(),
          input.assignee_profile
        );
      }
      return input.project_id;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    },
  });
}

export interface UpdateTaskInput {
  taskId: string;
  projectId: string;
  patch: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    completion_percentage?: number;
    deadline?: string | null;
    progress_note?: string | null;
    blocked_reason?: string | null;
    assignee_profile?: string | null;
  };
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, projectId, patch }: UpdateTaskInput) => {
      const { error } = await supabase
        .from("project_tasks")
        .update(patch as any)
        .eq("id", taskId);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    },
  });
}

export function useReassignTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      taskId,
      projectId,
      projectTitle,
      taskTitle,
      newAssigneeId,
    }: {
      taskId: string;
      projectId: string;
      projectTitle: string;
      taskTitle: string;
      newAssigneeId: string | null;
    }) => {
      const { error } = await supabase
        .from("project_tasks")
        .update({ assignee_profile: newAssigneeId } as any)
        .eq("id", taskId);
      if (error) throw error;

      if (newAssigneeId && newAssigneeId !== user?.id) {
        await notifyAssignee(projectId, projectTitle, taskTitle, newAssigneeId);
      }
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: string; projectId: string }) => {
      const { error } = await supabase
        .from("project_tasks")
        .delete()
        .eq("id", taskId);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    },
  });
}
