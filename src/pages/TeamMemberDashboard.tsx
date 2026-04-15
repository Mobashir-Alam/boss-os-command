import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTaskContext } from "@/contexts/TaskContext";
import { taskStatusConfig, type Task, type TaskStatus } from "@/data/tasks";
import { startups } from "@/data/startups";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Brain,
  Calendar,
  CheckCircle2,
  FileText,
  MessageSquare,
} from "lucide-react";

// Single-line KAI suggestion based on tasks
function getKaiSuggestion(tasks: Task[]): string | null {
  const blocked = tasks.filter((t) => t.status === "blocked");
  if (blocked.length > 0 && blocked[0].blocksTaskIds?.length) {
    return `Resolve "${blocked[0].title}" first — blocking ${blocked[0].blocksTaskIds.length} other task(s).`;
  }
  const overdue = tasks.filter(
    (t) => t.status !== "completed" && t.deadline && t.deadline < "Apr 15, 2026"
  );
  if (overdue.length > 0) {
    return `"${overdue[0].title}" is overdue — prioritize this now.`;
  }
  const dueSoon = tasks.filter(
    (t) => t.status !== "completed" && t.deadline && t.deadline <= "Apr 17, 2026" && t.deadline >= "Apr 15, 2026"
  );
  if (dueSoon.length > 0) {
    return `"${dueSoon[0].title}" is due soon — finish it today if possible.`;
  }
  const inProgress = tasks.filter((t) => t.status === "in-progress");
  if (inProgress.length > 0) {
    return `Keep going on "${inProgress[0].title}" — you're making progress.`;
  }
  return null;
}

const TeamMemberDashboard = () => {
  const { tasks, updateTaskStatus } = useTaskContext();
  const [blockerTask, setBlockerTask] = useState<Task | null>(null);
  const [blockerReason, setBlockerReason] = useState("");
  const [commentTask, setCommentTask] = useState<Task | null>(null);
  const [commentText, setCommentText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const myTasks = tasks;
  const pendingTasks = myTasks.filter((t) => t.status === "pending");
  const inProgressTasks = myTasks.filter((t) => t.status === "in-progress");
  const blockedTasks = myTasks.filter((t) => t.status === "blocked");
  const completedTasks = myTasks.filter((t) => t.status === "completed");

  // Today's work: overdue + due today/tomorrow
  const overdueTasks = myTasks.filter(
    (t) => t.status !== "completed" && t.deadline && t.deadline < "Apr 15, 2026"
  );
  const dueSoonTasks = myTasks.filter(
    (t) =>
      t.status !== "completed" &&
      t.deadline &&
      t.deadline >= "Apr 15, 2026" &&
      t.deadline <= "Apr 17, 2026"
  );
  const todayWork = [...overdueTasks, ...dueSoonTasks];

  const totalActive = myTasks.length - completedTasks.length;
  const kaiSuggestion = getKaiSuggestion(myTasks);

  const startupName = (id: string) => startups.find((s) => s.id === id)?.name || id;

  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    updateTaskStatus(task.id, newStatus);
    toast.success(`Task marked as ${taskStatusConfig[newStatus].label}`);
  };

  const submitBlocker = () => {
    if (!blockerTask || !blockerReason.trim()) return;
    updateTaskStatus(blockerTask.id, "blocked");
    toast.success("Blocker reported", { description: blockerReason });
    setBlockerTask(null);
    setBlockerReason("");
  };

  const submitComment = () => {
    if (!commentTask || !commentText.trim()) return;
    toast.success("Comment added");
    setCommentTask(null);
    setCommentText("");
  };

  const statusActions = (task: Task) => {
    const actions: { label: string; status: TaskStatus; variant: "default" | "outline" | "ghost" }[] = [];
    if (task.status === "pending") actions.push({ label: "Start", status: "in-progress", variant: "default" });
    if (task.status === "in-progress") actions.push({ label: "Mark Done", status: "completed", variant: "default" });
    if (task.status === "blocked") actions.push({ label: "Resume", status: "in-progress", variant: "outline" });
    return actions;
  };

  const isOverdue = (task: Task) => task.deadline && task.deadline < "Apr 15, 2026" && task.status !== "completed";
  const isDueSoon = (task: Task) =>
    task.deadline && task.deadline >= "Apr 15, 2026" && task.deadline <= "Apr 17, 2026" && task.status !== "completed";

  const renderTaskCard = (task: Task) => {
    const cfg = taskStatusConfig[task.status];
    const isExpanded = expandedId === task.id;
    const overdue = isOverdue(task);
    const dueSoon = isDueSoon(task);

    return (
      <Card
        key={task.id}
        className={cn(
          "border-border/40 transition-all",
          overdue && "border-l-2 border-l-destructive",
          dueSoon && !overdue && "border-l-2 border-l-amber-500",
          task.status === "blocked" && !overdue && !dueSoon && "border-l-2 border-l-amber-500"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : task.id)}
            >
              <p className="text-sm font-medium">{task.title}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                <span className="bg-muted/50 rounded px-1.5 py-0.5">
                  {startupName(task.linkedStartupId)}
                </span>
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
                    {overdue && " (overdue)"}
                  </span>
                )}
              </div>
              {task.status === "blocked" && task.blockedReason && (
                <div className="mt-1.5 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-1">
                  <p className="text-[10px] text-amber-600 font-medium">⚠ {task.blockedReason}</p>
                </div>
              )}
            </div>
            <Badge variant="outline" className={cn("text-[10px] flex-shrink-0", cfg.color)}>
              <span className={cn("h-1.5 w-1.5 rounded-full mr-1", cfg.dot)} />
              {cfg.label}
            </Badge>
          </div>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-border/20 space-y-3">
              {task.instructions && (
                <div className="rounded-lg bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Instructions
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{task.instructions}</p>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {statusActions(task).map((a) => (
                  <Button
                    key={a.status}
                    variant={a.variant}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleStatusChange(task, a.status)}
                  >
                    {a.label}
                  </Button>
                ))}
                {task.status !== "blocked" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                    onClick={() => setBlockerTask(task)}
                  >
                    <AlertTriangle className="h-3 w-3 mr-0.5" />
                    Report Blocker
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCommentTask(task)}
                >
                  <MessageSquare className="h-3 w-3 mr-0.5" />
                  Comment
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">My Work</h1>
          <p className="text-sm text-muted-foreground mt-1">Stay focused. Deliver on time.</p>
        </div>

        {/* Progress strip */}
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-border/50 bg-muted/20 px-5 py-3">
          <span className="text-sm font-bold">{totalActive}</span>
          <span className="text-sm text-muted-foreground">active</span>
          <div className="h-4 w-px bg-border/60" />
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-600">{completedTasks.length}</span>
          <span className="text-sm text-muted-foreground">done</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${myTasks.length > 0 ? (completedTasks.length / myTasks.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">{completedTasks.length}/{myTasks.length}</span>
          </div>
        </div>

        {/* KAI — single line */}
        {kaiSuggestion && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-4 py-2.5">
            <Brain className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex-shrink-0">KAI</span>
            <p className="text-xs text-foreground/80">{kaiSuggestion}</p>
          </div>
        )}

        {/* Today's Work */}
        {todayWork.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-destructive mb-3 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Today's Priority
            </h2>
            <div className="space-y-2">{todayWork.map(renderTaskCard)}</div>
          </div>
        )}

        {/* Blockers */}
        {blockedTasks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Blocked
            </h2>
            <div className="space-y-2">
              {blockedTasks.map(renderTaskCard)}
            </div>
          </div>
        )}

        {/* Pending */}
        {pendingTasks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Pending
            </h2>
            <div className="space-y-2">{pendingTasks.map(renderTaskCard)}</div>
          </div>
        )}

        {/* In Progress */}
        {inProgressTasks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-3">
              In Progress
            </h2>
            <div className="space-y-2">{inProgressTasks.map(renderTaskCard)}</div>
          </div>
        )}

        {/* Done */}
        {completedTasks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Done
            </h2>
            <div className="space-y-2 opacity-50">
              {completedTasks.map((task) => (
                <Card key={task.id} className="border-border/40">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-through">{task.title}</p>
                        <span className="text-[10px] text-muted-foreground">{startupName(task.linkedStartupId)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Report Blocker Modal */}
      <Dialog open={!!blockerTask} onOpenChange={() => setBlockerTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Report Blocker</DialogTitle>
          </DialogHeader>
          {blockerTask && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{blockerTask.title}</p>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">What's blocking you?</label>
                <Input
                  placeholder="e.g. Waiting for API access"
                  value={blockerReason}
                  onChange={(e) => setBlockerReason(e.target.value)}
                  className="text-sm"
                  onKeyDown={(e) => e.key === "Enter" && submitBlocker()}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBlockerTask(null)}>Cancel</Button>
            <Button size="sm" onClick={submitBlocker} disabled={!blockerReason.trim()}>Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Modal */}
      <Dialog open={!!commentTask} onOpenChange={() => setCommentTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Add Comment</DialogTitle>
          </DialogHeader>
          {commentTask && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{commentTask.title}</p>
              <Input
                placeholder="Your comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="text-sm"
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCommentTask(null)}>Cancel</Button>
            <Button size="sm" onClick={submitComment} disabled={!commentText.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamMemberDashboard;
