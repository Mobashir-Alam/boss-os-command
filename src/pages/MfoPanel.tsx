import { useState, useCallback } from "react";
import KaiRoleInsights from "@/components/KaiRoleInsights";
import EscalationLog from "@/components/EscalationLog";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTaskContext } from "@/contexts/TaskContext";
import { useEscalations } from "@/contexts/EscalationContext";
import { startups } from "@/data/startups";
import { assigneeOptions, type Task, type TaskStatus, taskStatusConfig } from "@/data/tasks";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
  Filter,
  GripVertical,
  Megaphone,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BoardColumn = "pending" | "in-progress" | "blocked" | "completed";

const columnConfig: Record<BoardColumn, { label: string; accent: string; bg: string }> = {
  pending: { label: "Open", accent: "border-t-muted-foreground", bg: "bg-muted/20" },
  "in-progress": { label: "In Progress", accent: "border-t-blue-500", bg: "bg-blue-500/5" },
  blocked: { label: "Blocked", accent: "border-t-amber-500", bg: "bg-amber-500/5" },
  completed: { label: "Done", accent: "border-t-emerald-500", bg: "bg-emerald-500/5" },
};

const MfoPanel = () => {
  const { tasks, updateTaskStatus, notifications } = useTaskContext();
  const { escalateTask } = useEscalations();
  const [filterStartup, setFilterStartup] = useState("all");
  const [filterOwner, setFilterOwner] = useState("all");
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [reassignTask, setReassignTask] = useState<Task | null>(null);
  const [newAssignee, setNewAssignee] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [escalateTarget, setEscalateTarget] = useState<Task | null>(null);
  const [escalateReason, setEscalateReason] = useState("");

  const filtered = tasks.filter((t) => {
    if (filterStartup !== "all" && t.linkedStartupId !== filterStartup) return false;
    if (filterOwner !== "all" && t.assignee !== filterOwner) return false;
    return true;
  });

  const columns: BoardColumn[] = ["pending", "in-progress", "blocked", "completed"];

  const getColumnTasks = (col: BoardColumn) => filtered.filter((t) => t.status === col);

  // Drag handlers
  const handleDragStart = (taskId: string) => setDraggedTask(taskId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (col: BoardColumn) => {
    if (draggedTask) {
      updateTaskStatus(draggedTask, col as TaskStatus);
      toast.success(`Task moved to ${columnConfig[col].label}`);
    }
    setDraggedTask(null);
  };

  const handleEscalate = (task: Task) => {
    setEscalateTarget(task);
    setEscalateReason(task.blockedReason || "");
  };

  const submitEscalation = () => {
    if (!escalateTarget || !escalateReason.trim()) return;
    escalateTask(escalateTarget, "MFO", escalateReason.trim());
    toast.success(`Escalated "${escalateTarget.title}" to Founder`, {
      description: escalateReason,
    });
    setEscalateTarget(null);
    setEscalateReason("");
  };

  const handleReassign = () => {
    if (!reassignTask) return;
    // In a real app this would update the task assignee/deadline
    toast.success(`Reassigned "${reassignTask.title}" to ${newAssignee || reassignTask.assignee}`);
    setReassignTask(null);
    setNewAssignee("");
    setNewDeadline("");
  };

  const handleBulkAssign = () => {
    if (!bulkAssignee || selectedIds.size === 0) return;
    toast.success(`${selectedIds.size} tasks reassigned to ${bulkAssignee}`);
    setSelectedIds(new Set());
    setBulkMode(false);
    setBulkAssignee("");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Dependencies
  const dependencies = tasks.filter((t) => t.blocksTaskIds && t.blocksTaskIds.length > 0);

  // Deadlines
  const upcoming = filtered.filter(
    (t) => t.status !== "completed" && t.deadline && t.deadline <= "Apr 18, 2026" && t.deadline >= "Apr 15, 2026"
  );
  const overdue = filtered.filter(
    (t) => t.status !== "completed" && t.deadline && t.deadline < "Apr 15, 2026"
  );

  const uniqueOwners = [...new Set(tasks.map((t) => t.assignee))];

  const startupName = (id: string) => startups.find((s) => s.id === id)?.name || id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Execution Control Panel</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Coordinate work, track blockers, and keep delivery on schedule.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <select
                value={filterStartup}
                onChange={(e) => setFilterStartup(e.target.value)}
                className="bg-transparent text-xs font-medium outline-none cursor-pointer"
              >
                <option value="all">All Startups</option>
                {startups.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5">
              <User className="h-3 w-3 text-muted-foreground" />
              <select
                value={filterOwner}
                onChange={(e) => setFilterOwner(e.target.value)}
                className="bg-transparent text-xs font-medium outline-none cursor-pointer"
              >
                <option value="all">All Owners</option>
                {uniqueOwners.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <Button
              variant={bulkMode ? "default" : "outline"}
              size="sm"
              className="text-xs h-8"
              onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
            >
              <Users className="h-3 w-3 mr-1" />
              {bulkMode ? "Cancel Bulk" : "Bulk Assign"}
            </Button>
          </div>
        </div>

        {/* Bulk assign bar */}
        {bulkMode && selectedIds.size > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5">
            <span className="text-xs font-medium">{selectedIds.size} selected</span>
            <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
              <SelectTrigger className="h-7 w-40 text-xs">
                <SelectValue placeholder="Assign to..." />
              </SelectTrigger>
              <SelectContent>
                {assigneeOptions.map((a) => (
                  <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 text-xs" onClick={handleBulkAssign} disabled={!bulkAssignee}>
              Reassign
            </Button>
          </div>
        )}

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {columns.map((col) => {
            const colTasks = getColumnTasks(col);
            const cfg = columnConfig[col];
            return (
              <div
                key={col}
                className={cn("rounded-xl border border-border/40 border-t-2", cfg.accent, cfg.bg, "p-3 min-h-[200px]")}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(col)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {cfg.label}
                  </h3>
                  <Badge variant="outline" className="text-[10px] border-border/40">
                    {colTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <Card
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className={cn(
                        "cursor-grab active:cursor-grabbing border-border/30 transition-all hover:border-border/60 hover:shadow-sm",
                        draggedTask === task.id && "opacity-40",
                        bulkMode && selectedIds.has(task.id) && "ring-2 ring-primary/50"
                      )}
                      onClick={() => bulkMode && toggleSelect(task.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                                {startupName(task.linkedStartupId)}
                              </span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <User className="h-2.5 w-2.5" />{task.assignee}
                              </span>
                            </div>
                            {task.deadline && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-1">
                                <Calendar className="h-2.5 w-2.5" />{task.deadline}
                              </span>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{task.instructions}</p>
                            {task.status === "blocked" && task.blockedReason && (
                              <div className="mt-1.5 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-1">
                                <p className="text-[10px] text-amber-600 font-medium">{task.blockedReason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {!bulkMode && (
                          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/20">
                            {task.status === "blocked" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-amber-600 hover:text-amber-700 px-2"
                                onClick={(e) => { e.stopPropagation(); handleEscalate(task); }}
                              >
                                <Megaphone className="h-3 w-3 mr-0.5" />Escalate
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={(e) => { e.stopPropagation(); setReassignTask(task); }}
                            >
                              Reassign
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Dependencies */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Dependencies
            </h2>
            {dependencies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dependencies detected.</p>
            ) : (
              <div className="space-y-2">
                {dependencies.map((t) => (
                  <Card key={t.id} className="border-border/40">
                    <CardContent className="p-3">
                      {(t.blocksTaskIds || []).map((blockedId) => {
                        const blocked = tasks.find((x) => x.id === blockedId);
                        return (
                          <div key={blockedId} className="flex items-center gap-2 text-xs">
                            <span className="font-medium truncate max-w-[40%]">{t.title}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground truncate">
                              blocks "{blocked?.title || blockedId}"
                            </span>
                            {blocked?.status === "blocked" && (
                              <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/30 ml-auto flex-shrink-0">
                                Blocked
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Deadlines */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Upcoming & Overdue
            </h2>
            {overdue.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-semibold text-red-500 uppercase tracking-widest mb-1.5">Overdue</p>
                <div className="space-y-1.5">
                  {overdue.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                      <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                      <span className="text-xs font-medium truncate flex-1">{t.title}</span>
                      <span className="text-[10px] text-muted-foreground">{t.assignee}</span>
                      <span className="text-[10px] text-red-500 flex-shrink-0">{t.deadline}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest mb-1.5">Due Soon</p>
                <div className="space-y-1.5">
                  {upcoming.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                      <Clock className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      <span className="text-xs font-medium truncate flex-1">{t.title}</span>
                      <span className="text-[10px] text-muted-foreground">{t.assignee}</span>
                      <span className="text-[10px] text-amber-500 flex-shrink-0">{t.deadline}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {overdue.length === 0 && upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">No upcoming deadlines or overdue tasks.</p>
            )}
          </div>
        </div>

        {/* Escalation Log */}
        <EscalationLog className="mt-6" />

        {/* KAI MFO Insights */}
        <KaiRoleInsights role="mfo" className="mt-6" />
      </main>

      {/* Reassign Modal */}
      <Dialog open={!!reassignTask} onOpenChange={() => setReassignTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Reassign Task</DialogTitle>
          </DialogHeader>
          {reassignTask && (
            <div className="space-y-4">
              <p className="text-sm font-medium">{reassignTask.title}</p>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">New Owner</label>
                <Select value={newAssignee} onValueChange={setNewAssignee}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={reassignTask.assignee} />
                  </SelectTrigger>
                  <SelectContent>
                    {assigneeOptions.map((a) => (
                      <SelectItem key={a} value={a} className="text-sm">{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">New Deadline</label>
                <Input
                  type="text"
                  placeholder={reassignTask.deadline || "e.g. Apr 20, 2026"}
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReassignTask(null)}>Cancel</Button>
            <Button size="sm" onClick={handleReassign}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate Modal */}
      <Dialog open={!!escalateTarget} onOpenChange={() => setEscalateTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Escalate to Founder</DialogTitle>
          </DialogHeader>
          {escalateTarget && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{escalateTarget.title}</p>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Reason for escalation
                </label>
                <Textarea
                  placeholder="e.g. Blocked for 3 days, needs founder approval to proceed"
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  className="text-sm min-h-[60px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEscalateTarget(null)}>Cancel</Button>
            <Button size="sm" onClick={submitEscalation} disabled={!escalateReason.trim()}>
              <Megaphone className="h-3 w-3 mr-1" /> Escalate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MfoPanel;
