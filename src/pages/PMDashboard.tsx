import { useState } from "react";
import Navbar from "@/components/Navbar";
import { useTaskContext } from "@/contexts/TaskContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/data/tasks";
import { taskStatusConfig, assigneeOptions } from "@/data/tasks";
import { useStartups } from "@/hooks/useStartups";
import KaiRoleInsights from "@/components/KaiRoleInsights";
import {
  AlertTriangle,
  Plus,
  Clock,
  User,
  GripVertical,
  MessageSquare,
  Brain,
  Filter,
  StickyNote,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

const columns: { status: TaskStatus; label: string; accent: string; dotColor: string }[] = [
  { status: "pending", label: "Open", accent: "border-t-muted-foreground/40", dotColor: "bg-muted-foreground" },
  { status: "in-progress", label: "In Progress", accent: "border-t-blue-500", dotColor: "bg-blue-500" },
  { status: "blocked", label: "Blocked", accent: "border-t-amber-500", dotColor: "bg-amber-500" },
  { status: "completed", label: "Done", accent: "border-t-emerald-500", dotColor: "bg-emerald-500" },
];

// Assigned startups for this PM (mock — in production, filter by user assignment)
const assignedStartupIds = ["nasheedio", "project-x", "gurucool"];

const PMDashboard = () => {
  const { tasks, updateTaskStatus, createTask } = useTaskContext();
  const [filterStartup, setFilterStartup] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [blockerDialog, setBlockerDialog] = useState<{ open: boolean; taskId: string | null }>({ open: false, taskId: null });
  const [blockerReason, setBlockerReason] = useState("");
  const [noteDialog, setNoteDialog] = useState<{ open: boolean; taskId: string | null }>({ open: false, taskId: null });
  const [noteText, setNoteText] = useState("");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  // New task form
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newStartup, setNewStartup] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newInstructions, setNewInstructions] = useState("");

  // Filter tasks by assigned startups only
  const pmTasks = tasks.filter((t) => assignedStartupIds.includes(t.linkedStartupId));
  const filteredTasks = filterStartup === "all" ? pmTasks : pmTasks.filter((t) => t.linkedStartupId === filterStartup);

  const assignedStartups = startups.filter((s) => assignedStartupIds.includes(s.id));

  const getColumnTasks = (status: TaskStatus) => filteredTasks.filter((t) => t.status === status);

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    if (newStatus === "blocked") {
      setBlockerDialog({ open: true, taskId });
      return;
    }
    updateTaskStatus(taskId, newStatus);
    toast.success(`Task moved to ${taskStatusConfig[newStatus].label}`);
  };

  const submitBlocker = () => {
    if (blockerDialog.taskId && blockerReason.trim()) {
      updateTaskStatus(blockerDialog.taskId, "blocked");
      toast.warning("Task marked as blocked — MFO notified");
      setBlockerDialog({ open: false, taskId: null });
      setBlockerReason("");
    }
  };

  const submitNote = () => {
    if (noteDialog.taskId && noteText.trim()) {
      toast.success("Execution note added");
      setNoteDialog({ open: false, taskId: null });
      setNoteText("");
    }
  };

  const handleCreateTask = () => {
    if (!newTitle.trim() || !newAssignee || !newStartup) {
      toast.error("Fill in title, assignee, and startup");
      return;
    }
    createTask({
      title: newTitle,
      assignee: newAssignee,
      linkedStartupId: newStartup,
      linkedIssueId: "",
      status: "pending",
      deadline: newDeadline || null,
      instructions: newInstructions,
      blockedReason: undefined,
      blocksTaskIds: undefined,
    });
    toast.success("Task created");
    setShowCreateDialog(false);
    setNewTitle("");
    setNewAssignee("");
    setNewStartup("");
    setNewDeadline("");
    setNewInstructions("");
  };

  const stats = {
    total: pmTasks.length,
    open: pmTasks.filter((t) => t.status === "pending").length,
    inProgress: pmTasks.filter((t) => t.status === "in-progress").length,
    blocked: pmTasks.filter((t) => t.status === "blocked").length,
    done: pmTasks.filter((t) => t.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Execution Board</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {assignedStartups.length} startups · {stats.total} tasks
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Startup Filter */}
            <Select value={filterStartup} onValueChange={setFilterStartup}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All Startups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Startups</SelectItem>
                {assignedStartups.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Create Task */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <Input placeholder="Task title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                  <Select value={newStartup} onValueChange={setNewStartup}>
                    <SelectTrigger><SelectValue placeholder="Startup" /></SelectTrigger>
                    <SelectContent>
                      {assignedStartups.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newAssignee} onValueChange={setNewAssignee}>
                    <SelectTrigger><SelectValue placeholder="Assign to" /></SelectTrigger>
                    <SelectContent>
                      {assigneeOptions.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} />
                  <Textarea placeholder="Instructions / context" value={newInstructions} onChange={(e) => setNewInstructions(e.target.value)} rows={3} />
                  <Button onClick={handleCreateTask} className="w-full">Create Task</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mb-6 flex items-center gap-5 rounded-xl border border-border/50 bg-muted/20 px-5 py-3">
          <Stat label="Open" value={stats.open} />
          <div className="h-4 w-px bg-border/50" />
          <Stat label="In Progress" value={stats.inProgress} color="text-blue-500" />
          <div className="h-4 w-px bg-border/50" />
          <Stat label="Blocked" value={stats.blocked} color="text-amber-500" />
          <div className="h-4 w-px bg-border/50" />
          <Stat label="Done" value={stats.done} color="text-emerald-500" />
        </div>

        {/* KAI Insights */}
        <section className="mb-6">
          <KaiRoleInsights role="project_manager" compact />
        </section>

        {/* Kanban Board */}
        <div className="grid grid-cols-4 gap-4">
          {columns.map((col) => {
            const colTasks = getColumnTasks(col.status);
            return (
              <div key={col.status} className={cn("rounded-xl border border-border/40 bg-card/50 border-t-2", col.accent)}>
                {/* Column Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", col.dotColor)} />
                    <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{colTasks.length}</span>
                </div>
                {/* Cards */}
                <div className="p-3 space-y-2.5 min-h-[200px]">
                  {colTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      expanded={expandedTask === task.id}
                      onToggleExpand={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                      onStatusChange={handleStatusChange}
                      onReportBlocker={(id) => setBlockerDialog({ open: true, taskId: id })}
                      onAddNote={(id) => setNoteDialog({ open: true, taskId: id })}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8 opacity-60">No tasks</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Blocker Dialog */}
      <Dialog open={blockerDialog.open} onOpenChange={(open) => { if (!open) setBlockerDialog({ open: false, taskId: null }); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-4 w-4" />
              Report Blocker
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Textarea
              placeholder="What's blocking this task? Include dependency if any…"
              value={blockerReason}
              onChange={(e) => setBlockerReason(e.target.value)}
              rows={3}
            />
            <p className="text-[11px] text-muted-foreground">MFO will be automatically notified.</p>
            <Button onClick={submitBlocker} variant="destructive" className="w-full">Mark as Blocked</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={noteDialog.open} onOpenChange={(open) => { if (!open) setNoteDialog({ open: false, taskId: null }); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-primary" />
              Execution Note
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Textarea
              placeholder="Add progress update, decision, or context…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
            />
            <Button onClick={submitNote} className="w-full">Save Note</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* Kanban Card */
const KanbanCard = ({
  task,
  expanded,
  onToggleExpand,
  onStatusChange,
  onReportBlocker,
  onAddNote,
}: {
  task: Task;
  expanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onReportBlocker: (taskId: string) => void;
  onAddNote: (taskId: string) => void;
}) => {
  const startup = startups.find((s) => s.id === task.linkedStartupId);
  const statusActions: { label: string; status: TaskStatus }[] = [];

  if (task.status !== "in-progress") statusActions.push({ label: "Start", status: "in-progress" });
  if (task.status !== "completed") statusActions.push({ label: "Done", status: "completed" });
  if (task.status !== "blocked") statusActions.push({ label: "Block", status: "blocked" });
  if (task.status !== "pending") statusActions.push({ label: "Reopen", status: "pending" });

  return (
    <div className={cn(
      "rounded-lg border border-border/40 bg-background p-3 transition-all duration-150 hover:border-border/70 hover:shadow-sm",
      task.status === "blocked" && "border-amber-500/30 bg-amber-500/5",
    )}>
      {/* Title + Expand */}
      <button onClick={onToggleExpand} className="w-full text-left flex items-start gap-1.5">
        {expanded ? <ChevronDown className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />}
        <span className="text-sm font-medium leading-snug">{task.title}</span>
      </button>

      {/* Meta */}
      <div className="flex items-center gap-2 mt-2 ml-5">
        {startup && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/40">
            {startup.name}
          </Badge>
        )}
        {task.deadline && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {task.deadline}
          </span>
        )}
      </div>

      {/* Assignee */}
      <div className="flex items-center gap-1 mt-1.5 ml-5 text-[10px] text-muted-foreground">
        <User className="h-2.5 w-2.5" />
        {task.assignee}
      </div>

      {/* Blocked reason */}
      {task.status === "blocked" && task.blockedReason && (
        <div className="mt-2 ml-5 rounded-md bg-amber-500/10 px-2 py-1.5">
          <p className="text-[10px] text-amber-600 font-medium">⚠ {task.blockedReason}</p>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 ml-5 space-y-2.5 border-t border-border/30 pt-2.5">
          {task.instructions && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Instructions</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{task.instructions}</p>
            </div>
          )}

          {/* Status Actions */}
          <div className="flex flex-wrap gap-1.5">
            {statusActions.map((a) => (
              <button
                key={a.status}
                onClick={() => onStatusChange(task.id, a.status)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-medium border transition-colors",
                  a.status === "completed" && "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10",
                  a.status === "in-progress" && "border-blue-500/30 text-blue-500 hover:bg-blue-500/10",
                  a.status === "blocked" && "border-amber-500/30 text-amber-500 hover:bg-amber-500/10",
                  a.status === "pending" && "border-border text-muted-foreground hover:bg-muted/50",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5">
            <button
              onClick={() => onReportBlocker(task.id)}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium text-amber-500 border border-amber-500/20 hover:bg-amber-500/10 transition-colors"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              Report Blocker
            </button>
            <button
              onClick={() => onAddNote(task.id)}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium text-muted-foreground border border-border/40 hover:bg-muted/50 transition-colors"
            >
              <StickyNote className="h-2.5 w-2.5" />
              Add Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, color }: { label: string; value: number; color?: string }) => (
  <div className="flex items-center gap-1.5 text-sm">
    <span className={cn("font-bold", color || "text-foreground")}>{value}</span>
    <span className="text-muted-foreground">{label}</span>
  </div>
);

export default PMDashboard;
