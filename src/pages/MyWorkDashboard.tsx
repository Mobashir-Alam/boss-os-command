import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTaskContext } from "@/contexts/TaskContext";
import { taskStatusConfig, type Task, type TaskStatus } from "@/data/tasks";
import { useStartups } from "@/hooks/useStartups";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Flag,
  MessageSquare,
  Sparkles,
} from "lucide-react";

/* ── Helpers ─────────────────────────────────────────── */

const TODAY = new Date("2026-04-15");

function parseDeadline(d: string | null): Date | null {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function isToday(d: Date) {
  return d.toDateString() === TODAY.toDateString();
}
function isOverdue(d: Date) {
  return d < TODAY && d.toDateString() !== TODAY.toDateString();
}
function isUpcoming(d: Date) {
  return d > TODAY;
}

function getKaiLine(tasks: Task[]): string | null {
  const active = tasks.filter((t) => t.status !== "completed");
  const blocked = active.filter((t) => t.status === "blocked");
  if (blocked.length > 0 && blocked[0].blocksTaskIds?.length) {
    return `Resolve "${blocked[0].title}" first — it's blocking ${blocked[0].blocksTaskIds.length} other task(s).`;
  }
  const overdue = active.filter((t) => {
    const d = parseDeadline(t.deadline);
    return d && isOverdue(d);
  });
  if (overdue.length > 0) return `"${overdue[0].title}" is overdue — focus here first.`;
  const inProg = active.filter((t) => t.status === "in-progress");
  if (inProg.length > 0) return `Keep going on "${inProg[0].title}" — you're making progress.`;
  const pending = active.filter((t) => t.status === "pending");
  if (pending.length > 0) return `Start "${pending[0].title}" next — what to do now.`;
  return null;
}

const startupName = (id: string) => startups.find((s) => s.id === id)?.name || id;

/* ── Component ───────────────────────────────────────── */

const MyWorkDashboard = () => {
  const { tasks, updateTaskStatus } = useTaskContext();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [blockerTask, setBlockerTask] = useState<Task | null>(null);
  const [blockerReason, setBlockerReason] = useState("");
  const [commentTask, setCommentTask] = useState<Task | null>(null);
  const [commentText, setCommentText] = useState("");

  // Categorise
  const activeTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const overdueTasks: Task[] = [];
  const todayTasks: Task[] = [];
  const upcomingTasks: Task[] = [];
  const noDateTasks: Task[] = [];

  activeTasks.forEach((t) => {
    const d = parseDeadline(t.deadline);
    if (!d) {
      noDateTasks.push(t);
    } else if (isOverdue(d)) {
      overdueTasks.push(t);
    } else if (isToday(d)) {
      todayTasks.push(t);
    } else {
      upcomingTasks.push(t);
    }
  });

  const kaiLine = getKaiLine(tasks);

  /* ── Actions ─────────────────────────────────────── */

  const handleStatus = (task: Task, s: TaskStatus) => {
    updateTaskStatus(task.id, s);
    toast.success(`Marked as ${taskStatusConfig[s].label}`);
  };

  const submitBlocker = () => {
    if (!blockerTask || !blockerReason.trim()) return;
    updateTaskStatus(blockerTask.id, "blocked");
    toast.success("Blocker flagged", { description: blockerReason });
    setBlockerTask(null);
    setBlockerReason("");
  };

  const submitComment = () => {
    if (!commentTask || !commentText.trim()) return;
    toast.success("Comment added");
    setCommentTask(null);
    setCommentText("");
  };

  /* ── Task Card ───────────────────────────────────── */

  const renderTask = (task: Task) => {
    const cfg = taskStatusConfig[task.status];
    const expanded = expandedId === task.id;
    const dl = parseDeadline(task.deadline);
    const overdue = dl && isOverdue(dl);
    const dueSoon = dl && isToday(dl);

    const actions: { label: string; status: TaskStatus; variant: "default" | "outline" }[] = [];
    if (task.status === "pending") actions.push({ label: "Start", status: "in-progress", variant: "default" });
    if (task.status === "in-progress") actions.push({ label: "Done", status: "completed", variant: "default" });
    if (task.status === "blocked") actions.push({ label: "Resume", status: "in-progress", variant: "outline" });

    return (
      <Card
        key={task.id}
        className={cn(
          "border-border/40 transition-all hover:border-border/60",
          overdue && "border-l-2 border-l-destructive",
          dueSoon && !overdue && "border-l-2 border-l-amber-500",
          task.status === "blocked" && "border-l-2 border-l-amber-500"
        )}
      >
        <CardContent className="p-4">
          <div
            className="flex items-start justify-between gap-3 cursor-pointer"
            onClick={() => setExpandedId(expanded ? null : task.id)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug">{task.title}</p>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                <span className="bg-muted/50 rounded px-1.5 py-0.5">{startupName(task.linkedStartupId)}</span>
                {task.deadline && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5",
                      overdue && "text-destructive font-semibold",
                      dueSoon && !overdue && "text-amber-600 font-semibold"
                    )}
                  >
                    <Calendar className="h-2.5 w-2.5" />
                    {task.deadline}
                    {overdue && " · overdue"}
                  </span>
                )}
                {task.status === "blocked" && (
                  <span className="text-amber-600 font-medium flex items-center gap-0.5">
                    <Flag className="h-2.5 w-2.5" /> Blocked
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className={cn("text-[10px]", cfg.color)}>
                <span className={cn("h-1.5 w-1.5 rounded-full mr-1", cfg.dot)} />
                {cfg.label}
              </Badge>
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform",
                  expanded && "rotate-90"
                )}
              />
            </div>
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-border/20 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              {task.instructions && (
                <div className="rounded-lg bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Instructions
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{task.instructions}</p>
                </div>
              )}
              {task.blockedReason && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                  <p className="text-xs text-amber-600 font-medium">⚠ {task.blockedReason}</p>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {actions.map((a) => (
                  <Button
                    key={a.status}
                    variant={a.variant}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleStatus(task, a.status)}
                  >
                    {a.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {a.label}
                  </Button>
                ))}
                {task.status !== "blocked" && task.status !== "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                    onClick={() => setBlockerTask(task)}
                  >
                    <AlertTriangle className="h-3 w-3 mr-0.5" /> Flag Blocker
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCommentTask(task)}
                >
                  <MessageSquare className="h-3 w-3 mr-0.5" /> Comment
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  /* ── Section renderer ────────────────────────────── */

  const Section = ({
    title,
    icon,
    tasks: sectionTasks,
    color,
    dimmed,
  }: {
    title: string;
    icon: React.ReactNode;
    tasks: Task[];
    color?: string;
    dimmed?: boolean;
  }) => {
    if (sectionTasks.length === 0) return null;
    return (
      <div className={cn("mb-8", dimmed && "opacity-50")}>
        <h2
          className={cn(
            "text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5",
            color || "text-muted-foreground"
          )}
        >
          {icon} {title}
          <Badge variant="secondary" className="text-[10px] ml-1 font-normal">
            {sectionTasks.length}
          </Badge>
        </h2>
        <div className="space-y-2">{sectionTasks.map(renderTask)}</div>
      </div>
    );
  };

  /* ── Render ──────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">My Work</h1>
          <p className="text-sm text-muted-foreground mt-1">Your daily execution workspace.</p>
        </div>

        {/* Progress strip */}
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-border/50 bg-muted/20 px-5 py-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-bold">{activeTasks.length}</span>
          <span className="text-sm text-muted-foreground">active</span>
          <div className="h-4 w-px bg-border/60" />
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-600">{completedTasks.length}</span>
          <span className="text-sm text-muted-foreground">done</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {completedTasks.length}/{tasks.length}
            </span>
          </div>
        </div>

        {/* KAI — single focused line */}
        {kaiLine && (
          <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">KAI</span>
              <p className="text-xs text-foreground/80 mt-0.5">{kaiLine}</p>
            </div>
          </div>
        )}

        {/* Sections */}
        <Section
          title="Overdue"
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          tasks={overdueTasks}
          color="text-destructive"
        />
        <Section
          title="Today"
          icon={<Calendar className="h-3.5 w-3.5" />}
          tasks={[...todayTasks, ...noDateTasks.filter((t) => t.status === "in-progress")]}
          color="text-foreground"
        />
        <Section
          title="Upcoming"
          icon={<Clock className="h-3.5 w-3.5" />}
          tasks={[...upcomingTasks, ...noDateTasks.filter((t) => t.status === "pending")]}
        />
        <Section
          title="Completed"
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
          tasks={completedTasks}
          dimmed
        />
      </main>

      {/* Blocker Dialog */}
      <Dialog open={!!blockerTask} onOpenChange={() => setBlockerTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Flag Blocker</DialogTitle>
          </DialogHeader>
          {blockerTask && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{blockerTask.title}</p>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  What's blocking you?
                </label>
                <Textarea
                  placeholder="e.g. Waiting for API credentials from DevOps"
                  value={blockerReason}
                  onChange={(e) => setBlockerReason(e.target.value)}
                  className="text-sm min-h-[60px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBlockerTask(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitBlocker} disabled={!blockerReason.trim()}>
              Flag Blocker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={!!commentTask} onOpenChange={() => setCommentTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Add Comment</DialogTitle>
          </DialogHeader>
          {commentTask && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{commentTask.title}</p>
              <Textarea
                placeholder="Share an update or note..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="text-sm min-h-[60px]"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCommentTask(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitComment} disabled={!commentText.trim()}>
              Add Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyWorkDashboard;
