import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Task, TaskStatus } from "@/data/tasks";
import { toast } from "sonner";

interface DbTask {
  id: string;
  title: string;
  linked_issue_id: string | null;
  linked_startup_id: string;
  assignee: string;
  status: string;
  deadline: string | null;
  instructions: string;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
}

function toTask(row: DbTask): Task {
  const now = new Date();
  const created = new Date(row.created_at);
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const ago = diffDays === 0 ? "Today" : diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;

  return {
    id: row.id,
    title: row.title,
    linkedIssueId: row.linked_issue_id || "",
    linkedStartupId: row.linked_startup_id,
    assignee: row.assignee,
    status: row.status as TaskStatus,
    deadline: row.deadline,
    instructions: row.instructions,
    lastUpdated: ago,
    createdAt: ago,
    blockedReason: row.blocked_reason || undefined,
  };
}

export function useDbTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch tasks:", error);
      return;
    }
    setTasks((data as DbTask[]).map(toTask));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(async (input: {
    title: string;
    linkedIssueId: string;
    linkedStartupId: string;
    assignee: string;
    status: TaskStatus;
    deadline: string | null;
    instructions: string;
  }) => {
    const { error } = await supabase.from("tasks").insert({
      title: input.title,
      linked_issue_id: input.linkedIssueId,
      linked_startup_id: input.linkedStartupId,
      assignee: input.assignee,
      status: input.status,
      deadline: input.deadline,
      instructions: input.instructions,
    });

    if (error) {
      toast.error("Failed to create task");
      console.error(error);
      return;
    }
    toast.success("Task created", { description: `Assigned to ${input.assignee}` });
    await fetchTasks();
  }, [fetchTasks]);

  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update task");
      return;
    }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  }, []);

  const getTasksByIssue = useCallback((issueId: string) => {
    return tasks.filter(t => t.linkedIssueId === issueId);
  }, [tasks]);

  const getTasksByStartup = useCallback((startupId: string) => {
    return tasks.filter(t => t.linkedStartupId === startupId);
  }, [tasks]);

  return { tasks, loading, createTask, updateTaskStatus, getTasksByIssue, getTasksByStartup, refetch: fetchTasks };
}
