import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Task, TaskStatus, MfoUpdate, ActivityLogEntry, Notification } from "@/data/tasks";
import { initialMfoUpdates, initialActivityLog, initialNotifications } from "@/data/tasks";
import { supabase } from "@/integrations/supabase/client";
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

interface TaskContextValue {
  tasks: Task[];
  mfoUpdates: MfoUpdate[];
  activityLog: ActivityLogEntry[];
  notifications: Notification[];
  unreadCount: number;
  createTask: (task: Omit<Task, "id" | "lastUpdated" | "createdAt">) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  addMfoUpdate: (update: Omit<MfoUpdate, "id" | "timestamp">) => void;
  addActivityLog: (entry: Omit<ActivityLogEntry, "id" | "timestamp">) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  getTasksByStartup: (startupId: string) => Task[];
  getTasksByIssue: (issueId: string) => Task[];
  getOverdueTasks: () => Task[];
  getActiveIssueCount: () => number;
  getTaskStats: () => { total: number; completed: number; inProgress: number; overdue: number };
}

const TaskContext = createContext<TaskContextValue | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mfoUpdates, setMfoUpdates] = useState<MfoUpdate[]>(initialMfoUpdates);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(initialActivityLog);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  // Fetch tasks from database
  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch tasks:", error);
      return;
    }
    if (data) {
      setTasks((data as DbTask[]).map(toTask));
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const createTask = useCallback(async (task: Omit<Task, "id" | "lastUpdated" | "createdAt">) => {
    const { error } = await supabase.from("tasks").insert({
      title: task.title,
      linked_issue_id: task.linkedIssueId,
      linked_startup_id: task.linkedStartupId,
      assignee: task.assignee,
      status: task.status,
      deadline: task.deadline,
      instructions: task.instructions,
      blocked_reason: task.blockedReason || null,
    });

    if (error) {
      toast.error("Failed to create task");
      console.error(error);
      return;
    }

    await fetchTasks();

    setActivityLog((prev) => [
      { id: `al-${Date.now()}`, startupId: task.linkedStartupId, action: `Task '${task.title}' assigned to ${task.assignee}`, actor: "Founder", timestamp: "Just now" },
      ...prev,
    ]);
    setNotifications((prev) => [
      { id: `n-${Date.now()}`, type: "assigned", message: `Task '${task.title}' assigned to ${task.assignee}`, read: false, timestamp: "Just now" },
      ...prev,
    ]);
  }, [fetchTasks]);

  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update task");
      console.error(error);
      return;
    }

    const task = tasks.find((t) => t.id === taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status, lastUpdated: "Just now" } : t))
    );
    if (task) {
      setActivityLog((prev) => [
        { id: `al-${Date.now()}`, startupId: task.linkedStartupId, action: `Task '${task.title}' status changed to ${status}`, actor: task.assignee, timestamp: "Just now" },
        ...prev,
      ]);
    }
  }, [tasks]);

  const addMfoUpdate = useCallback((update: Omit<MfoUpdate, "id" | "timestamp">) => {
    setMfoUpdates((prev) => [
      { ...update, id: `mfo-${Date.now()}`, timestamp: "Just now" },
      ...prev,
    ]);
    setActivityLog((prev) => [
      { id: `al-${Date.now()}`, startupId: update.startupId, action: `Update added by ${update.person}`, actor: update.person, timestamp: "Just now" },
      ...prev,
    ]);
  }, []);

  const addActivityLog = useCallback((entry: Omit<ActivityLogEntry, "id" | "timestamp">) => {
    setActivityLog((prev) => [
      { ...entry, id: `al-${Date.now()}`, timestamp: "Just now" },
      ...prev,
    ]);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const getTasksByStartup = useCallback((startupId: string) => tasks.filter((t) => t.linkedStartupId === startupId), [tasks]);
  const getTasksByIssue = useCallback((issueId: string) => tasks.filter((t) => t.linkedIssueId === issueId), [tasks]);
  const getOverdueTasks = useCallback(() => tasks.filter((t) => t.status !== "completed" && t.deadline && t.deadline < "Apr 15, 2026"), [tasks]);
  const getActiveIssueCount = useCallback(() => {
    const issueIds = new Set(tasks.filter((t) => t.status !== "completed").map((t) => t.linkedIssueId));
    return issueIds.size;
  }, [tasks]);
  const getTaskStats = useCallback(() => ({
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    inProgress: tasks.filter((t) => t.status === "in-progress").length,
    overdue: tasks.filter((t) => t.status !== "completed" && t.deadline && t.deadline < "Apr 15, 2026").length,
  }), [tasks]);

  return (
    <TaskContext.Provider
      value={{
        tasks, mfoUpdates, activityLog, notifications, unreadCount,
        createTask, updateTaskStatus, addMfoUpdate, addActivityLog,
        markNotificationRead, markAllRead,
        getTasksByStartup, getTasksByIssue, getOverdueTasks,
        getActiveIssueCount, getTaskStats,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTaskContext must be used within TaskProvider");
  return ctx;
}
