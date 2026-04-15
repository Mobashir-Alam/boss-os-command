import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Task, TaskStatus, MfoUpdate, ActivityLogEntry, Notification } from "@/data/tasks";
import {
  initialTasks, initialMfoUpdates, initialActivityLog, initialNotifications,
} from "@/data/tasks";

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
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [mfoUpdates, setMfoUpdates] = useState<MfoUpdate[]>(initialMfoUpdates);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(initialActivityLog);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const createTask = useCallback((task: Omit<Task, "id" | "lastUpdated" | "createdAt">) => {
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}`,
      lastUpdated: "Just now",
      createdAt: "Just now",
    };
    setTasks((prev) => [newTask, ...prev]);
    setActivityLog((prev) => [
      { id: `al-${Date.now()}`, startupId: task.linkedStartupId, action: `Task '${task.title}' assigned to ${task.assignee}`, actor: "Founder", timestamp: "Just now" },
      ...prev,
    ]);
    setNotifications((prev) => [
      { id: `n-${Date.now()}`, type: "assigned", message: `Task '${task.title}' assigned to ${task.assignee}`, read: false, timestamp: "Just now" },
      ...prev,
    ]);
  }, []);

  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status, lastUpdated: "Just now" } : t))
    );
    const task = tasks.find((t) => t.id === taskId);
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
