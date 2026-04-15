import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Task } from "@/data/tasks";

export type EscalationStatus = "pending" | "acknowledged" | "resolved";

export interface Escalation {
  id: string;
  taskId: string;
  taskTitle: string;
  linkedStartupId: string;
  raisedBy: string;
  reason: string;
  timestamp: string;
  status: EscalationStatus;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface EscalationContextValue {
  escalations: Escalation[];
  pendingCount: number;
  escalateTask: (task: Task, raisedBy: string, reason: string) => void;
  updateStatus: (id: string, status: EscalationStatus, by?: string) => void;
  getByStartup: (startupId: string) => Escalation[];
}

const EscalationContext = createContext<EscalationContextValue | null>(null);

// Seed data so the log isn't empty on first load
const initialEscalations: Escalation[] = [
  {
    id: "esc-1",
    taskId: "task-3",
    taskTitle: "Cut non-essential spend by 20%",
    linkedStartupId: "project-x",
    raisedBy: "Bob Kumar (MFO)",
    reason: "Blocked on budget approval for 3 days — runway critical.",
    timestamp: "Apr 14, 2026 · 2:30 PM",
    status: "pending",
  },
  {
    id: "esc-2",
    taskId: "task-6",
    taskTitle: "Schedule backend engineer interviews",
    linkedStartupId: "gurucool",
    raisedBy: "Carol Martinez (MFO)",
    reason: "Blocked by referral hiring pipeline — 2 partner deals waiting.",
    timestamp: "Apr 13, 2026 · 11:00 AM",
    status: "acknowledged",
  },
];

export function EscalationProvider({ children }: { children: ReactNode }) {
  const [escalations, setEscalations] = useState<Escalation[]>(initialEscalations);

  const pendingCount = escalations.filter((e) => e.status === "pending").length;

  const escalateTask = useCallback((task: Task, raisedBy: string, reason: string) => {
    const newEsc: Escalation = {
      id: `esc-${Date.now()}`,
      taskId: task.id,
      taskTitle: task.title,
      linkedStartupId: task.linkedStartupId,
      raisedBy,
      reason,
      timestamp: new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      status: "pending",
    };
    setEscalations((prev) => [newEsc, ...prev]);
  }, []);

  const updateStatus = useCallback((id: string, status: EscalationStatus, by?: string) => {
    setEscalations((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status,
              ...(status === "resolved"
                ? {
                    resolvedAt: new Date().toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }),
                    resolvedBy: by || "Founder",
                  }
                : {}),
            }
          : e
      )
    );
  }, []);

  const getByStartup = useCallback(
    (startupId: string) => escalations.filter((e) => e.linkedStartupId === startupId),
    [escalations]
  );

  return (
    <EscalationContext.Provider
      value={{ escalations, pendingCount, escalateTask, updateStatus, getByStartup }}
    >
      {children}
    </EscalationContext.Provider>
  );
}

export function useEscalations() {
  const ctx = useContext(EscalationContext);
  if (!ctx) throw new Error("useEscalations must be used within EscalationProvider");
  return ctx;
}
