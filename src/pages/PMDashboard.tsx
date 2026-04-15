import { useState } from "react";
import Navbar from "@/components/Navbar";
import TaskCard from "@/components/TaskCard";
import { useTaskContext } from "@/contexts/TaskContext";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, Link2, ChevronRight } from "lucide-react";
import KaiRoleInsights from "@/components/KaiRoleInsights";

interface Blocker {
  id: string;
  taskId: string;
  taskTitle: string;
  reason: string;
  since: string;
}

const mockBlockers: Blocker[] = [
  { id: "b1", taskId: "task-1", taskTitle: "Launch creator reactivation campaign", reason: "Waiting on email template approval", since: "2 days" },
  { id: "b2", taskId: "task-4", taskTitle: "Push referral hiring campaign", reason: "HR budget not confirmed", since: "3 days" },
];

interface Dependency {
  from: string;
  fromTitle: string;
  to: string;
  toTitle: string;
}

const mockDependencies: Dependency[] = [
  { from: "task-2", fromTitle: "Prepare investor outreach list", to: "task-3", toTitle: "Cut non-essential spend by 20%" },
  { from: "task-1", fromTitle: "Launch creator reactivation campaign", to: "task-5", toTitle: "Analyze premium tier churn reasons" },
];

const kaiPmInsights = [
  "Complete 'Prepare investor outreach list' to unblock cost-cutting",
  "Reactivation campaign delay may impact next week's delivery",
  "2 tasks overdue — prioritize before end of day",
];

const PMDashboard = () => {
  const { tasks, getTaskStats } = useTaskContext();
  const stats = getTaskStats();
  const pending = stats.total - stats.completed - stats.inProgress;
  const thisWeekTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const overdueTasks = tasks.filter((t) => {
    if (!t.deadline || t.status === "completed") return false;
    return new Date(t.deadline) < new Date();
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-1">Your Execution Board</h1>
          <p className="text-sm text-muted-foreground">What needs to be delivered this week</p>
        </div>

        {/* Stats Strip */}
        <div className="mb-8 flex flex-wrap items-center gap-4 rounded-xl border border-border/50 bg-muted/20 px-5 py-3">
          <Stat label="Pending" value={pending} />
          <div className="h-4 w-px bg-border/60" />
          <Stat label="In Progress" value={stats.inProgress} color="text-blue-500" />
          <div className="h-4 w-px bg-border/60" />
          <Stat label="Completed" value={stats.completed} color="text-emerald-500" />
          {stats.overdue > 0 && (
            <>
              <div className="h-4 w-px bg-border/60" />
              <Stat label="Overdue" value={stats.overdue} color="text-destructive" />
            </>
          )}
        </div>

        {/* KAI Role Insights for PM */}
        <section className="mb-8">
          <KaiRoleInsights role="project_manager" />
        </section>

        {/* Overdue */}
        {overdueTasks.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-destructive uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Overdue
            </h2>
            <div className="space-y-2">
              {overdueTasks.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          </section>
        )}

        {/* Active Tasks */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Active Tasks</h2>
          {thisWeekTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active tasks</p>
          ) : (
            <div className="space-y-2">
              {thisWeekTasks.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          )}
        </section>

        {/* Blockers */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Blockers
          </h2>
          <div className="space-y-2">
            {mockBlockers.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
                <div>
                  <p className="text-sm font-medium">{b.taskTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{b.reason}</p>
                </div>
                <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[10px]">
                  {b.since}
                </Badge>
              </div>
            ))}
          </div>
        </section>

        {/* Dependencies */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" /> Dependencies
          </h2>
          <div className="space-y-2">
            {mockDependencies.map((d, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border/40 bg-card px-5 py-4">
                <span className="text-sm font-medium truncate flex-1">{d.fromTitle}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">blocks →</span>
                <span className="text-sm font-medium truncate flex-1 text-right">{d.toTitle}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Completed */}
        {completedTasks.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Completed</h2>
            <div className="space-y-2 opacity-60">
              {completedTasks.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

const Stat = ({ label, value, color }: { label: string; value: number; color?: string }) => (
  <div className="flex items-center gap-1.5 text-sm">
    <span className={`font-bold ${color || "text-foreground"}`}>{value}</span>
    <span className="text-muted-foreground">{label}</span>
  </div>
);

export default PMDashboard;
