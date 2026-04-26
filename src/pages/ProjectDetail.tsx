import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProjectDetail,
  useRemoveProjectMember,
  type ProjectMember,
} from "@/hooks/useEmployeeProjects";
import {
  useProjectTasks,
  useDeleteTask,
  type ProjectTask,
  type TaskStatus,
} from "@/hooks/useProjectTasks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ProjectDiscussion from "@/components/project/ProjectDiscussion";
import { EditProjectModal, AddMemberModal } from "@/components/project/LeadControls";
import TaskFormModal from "@/components/project/TaskFormModal";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Layers,
  User,
  ChevronDown,
  ChevronUp,
  Edit3,
  Crown,
  UserPlus,
  Trash2,
  Plus,
  ListTodo,
  AlertTriangle,
} from "lucide-react";

/* ── helpers ─────────────────────────────────────────────── */

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; dot: string }> = {
  not_started: { label: "Not Started", color: "text-muted-foreground", bg: "bg-muted/40",       dot: "bg-muted-foreground" },
  in_progress: { label: "In Progress", color: "text-blue-700",         bg: "bg-blue-500/10",    dot: "bg-blue-500" },
  done:        { label: "Done",        color: "text-emerald-700",      bg: "bg-emerald-500/10", dot: "bg-emerald-500" },
  blocked:     { label: "Blocked",     color: "text-amber-700",        bg: "bg-amber-500/10",   dot: "bg-amber-500" },
};

function deadlineLabel(deadline: string | null): { text: string; urgent: boolean } | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const urgent = diff <= 3;
  if (diff < 0)   return { text: `${Math.abs(diff)}d overdue`, urgent: true };
  if (diff === 0) return { text: "Due today", urgent: true };
  if (diff === 1) return { text: "Due tomorrow", urgent: true };
  if (diff <= 7)  return { text: `${diff}d left`, urgent };
  return { text: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), urgent: false };
}

/* ── task row ────────────────────────────────────────────── */

function TaskRow({
  task,
  canEdit,
  canManageAll,
  onEdit,
  onDelete,
}: {
  task: ProjectTask;
  canEdit: boolean;
  canManageAll: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cfg = TASK_STATUS_CONFIG[task.status];
  const dl = deadlineLabel(task.deadline);
  const interactive = canEdit || canManageAll;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/40 bg-card p-3 transition-colors",
        interactive && "hover:border-border cursor-pointer",
        task.status === "blocked" && "border-l-2 border-l-amber-500",
      )}
      onClick={interactive ? onEdit : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium leading-tight">{task.title}</p>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", cfg.color, cfg.bg)}>
              <span className={cn("h-1.5 w-1.5 rounded-full mr-1", cfg.dot)} />
              {cfg.label}
            </Badge>
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {dl && (
              <span className={cn("flex items-center gap-1 text-[10px]", dl.urgent ? "text-destructive font-semibold" : "text-muted-foreground")}>
                <Calendar className="h-2.5 w-2.5" />
                {dl.text}
              </span>
            )}
            {task.progress_note && (
              <span className="text-[10px] text-muted-foreground italic truncate max-w-[200px]">
                "{task.progress_note}"
              </span>
            )}
          </div>
          {task.status === "blocked" && task.blocked_reason && (
            <div className="mt-2 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-1">
              <p className="text-[10px] text-amber-700">⚠ {task.blocked_reason}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-bold tabular-nums">{task.completion_percentage}%</span>
          {canManageAll && (
            <button
              type="button"
              title="Delete task"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded hover:bg-destructive/10 text-destructive/70"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            task.status === "done"        ? "bg-emerald-500" :
            task.status === "in_progress" ? "bg-blue-500" :
            task.status === "blocked"     ? "bg-amber-500" :
            "bg-muted-foreground/40"
          )}
          style={{ width: `${task.completion_percentage}%` }}
        />
      </div>
    </div>
  );
}

/* ── member group ─────────────────────────────────────────── */

function MemberGroup({
  member,
  tasks,
  isMe,
  canManageAll,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onRemoveMember,
  initialExpanded,
}: {
  member: ProjectMember | null;          // null for "Unassigned" group
  tasks: ProjectTask[];
  isMe: boolean;
  canManageAll: boolean;
  onAddTask?: () => void;                // lead can add new task pre-assigned
  onEditTask: (t: ProjectTask) => void;
  onDeleteTask: (t: ProjectTask) => void;
  onRemoveMember?: () => void;
  initialExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(initialExpanded ?? false);

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const blockedCount = tasks.filter((t) => t.status === "blocked").length;

  const name = member?.profile_name ?? "Unassigned";
  const initial = (name[0] ?? "?").toUpperCase();

  return (
    <div className={cn("rounded-xl border", isMe ? "border-primary/30 bg-primary/5" : "border-border/40 bg-muted/10")}>
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
          member ? (isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground") : "bg-amber-500/20 text-amber-700"
        )}>
          {member ? initial : "?"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">
              {name}
              {isMe && <span className="text-[10px] text-primary ml-1">(you)</span>}
            </p>
            {member?.role === "lead" && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 bg-amber-500/10 text-amber-700">
                <Crown className="h-2.5 w-2.5 mr-0.5 inline" />
                Lead
              </Badge>
            )}
            {blockedCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-700 bg-amber-500/10 border-amber-500/20">
                {blockedCount} blocked
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {tasks.length === 0
              ? "No tasks yet"
              : `${doneCount}/${tasks.length} done`}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {canManageAll && member && onAddTask && (
            <button
              type="button"
              title={`Assign a new task to ${name}`}
              onClick={(e) => { e.stopPropagation(); onAddTask(); }}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          {canManageAll && member && !isMe && onRemoveMember && (
            <button
              type="button"
              title={`Remove ${name} from project`}
              onClick={(e) => { e.stopPropagation(); onRemoveMember(); }}
              className="p-1 rounded hover:bg-destructive/10 text-destructive/70"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border/20 space-y-2">
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-3 text-center">No tasks assigned</p>
          ) : (
            <div className="space-y-2 pt-3">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  canEdit={isMe}
                  canManageAll={canManageAll}
                  onEdit={() => onEditTask(task)}
                  onDelete={() => onDeleteTask(task)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── main page ───────────────────────────────────────────── */

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isFounder } = useAuth();
  const { data: project, isLoading } = useProjectDetail(id);
  const { data: tasks = [], isLoading: tasksLoading } = useProjectTasks(id);
  const removeMember = useRemoveProjectMember();
  const deleteTask = useDeleteTask();

  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskEditing, setTaskEditing] = useState<ProjectTask | null>(null);
  const [presetAssigneeId, setPresetAssigneeId] = useState<string | null>(null);

  const myMember = project?.members?.find((m) => m.profile_id === user?.id) ?? null;
  const isLead = myMember?.role === "lead";
  const canManageAll = isLead || isFounder;
  const dl = project ? deadlineLabel(project.deadline) : null;

  const myTasks = useMemo(
    () => tasks.filter((t) => t.assigned_to_profile === user?.id),
    [tasks, user?.id]
  );

  // Group tasks by assignee for the team view
  const tasksByAssignee = useMemo(() => {
    const map = new Map<string, ProjectTask[]>();
    for (const t of tasks) {
      const key = t.assigned_to_profile ?? "__unassigned__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks]);

  const openCreateTask = (forAssigneeId?: string | null) => {
    setTaskEditing(null);
    setPresetAssigneeId(forAssigneeId ?? null);
    setTaskFormOpen(true);
  };

  const openEditTask = (task: ProjectTask) => {
    setTaskEditing(task);
    setPresetAssigneeId(null);
    setTaskFormOpen(true);
  };

  const handleDeleteTask = (task: ProjectTask) => {
    if (!project) return;
    if (!confirm(`Delete task "${task.title}"?`)) return;
    deleteTask.mutate(
      { taskId: task.id, projectId: project.id },
      {
        onSuccess: () => toast.success("Task deleted"),
        onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
      }
    );
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!project) return;
    if (!confirm(`Remove ${memberName} from this project? Their assigned tasks will become unassigned.`)) return;
    removeMember.mutate(
      { memberId, projectId: project.id },
      {
        onSuccess: () => toast.success(`${memberName} removed`),
        onError: (e: any) => toast.error(e.message ?? "Failed to remove"),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-2xl px-5 py-10 space-y-4">
          <div className="h-8 w-48 rounded-lg bg-muted/30 animate-pulse" />
          <div className="h-32 rounded-xl bg-muted/30 animate-pulse" />
          <div className="h-48 rounded-xl bg-muted/30 animate-pulse" />
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-2xl px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">Project not found or you don't have access.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/employee")}>
            Back to My Projects
          </Button>
        </main>
      </div>
    );
  }

  const members = project.members ?? [];
  const totalMembers = members.length;
  const taskTotal = tasks.length;
  const taskDone = tasks.filter((t) => t.status === "done").length;
  const taskBlocked = tasks.filter((t) => t.status === "blocked").length;

  // Render order for the team groups: current user first, then leads, then by name
  const sortedMembers = [...members].sort((a, b) => {
    if (a.profile_id === user?.id) return -1;
    if (b.profile_id === user?.id) return 1;
    if (a.role === "lead" && b.role !== "lead") return -1;
    if (b.role === "lead" && a.role !== "lead") return 1;
    return (a.profile_name ?? "").localeCompare(b.profile_name ?? "");
  });

  const unassignedTasks = tasksByAssignee.get("__unassigned__") ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 py-10">

        <button
          type="button"
          onClick={() => navigate("/employee")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          My Projects
        </button>

        {/* Project header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight flex-1">{project.title}</h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isLead && (
                <Badge variant="outline" className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-700">
                  <Crown className="h-2.5 w-2.5 mr-0.5 inline" />
                  You lead this
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] capitalize",
                  project.status === "active"    && "text-emerald-700 bg-emerald-500/10 border-emerald-500/20",
                  project.status === "paused"    && "text-amber-700 bg-amber-500/10 border-amber-500/20",
                  project.status === "completed" && "text-blue-700 bg-blue-500/10 border-blue-500/20",
                )}
              >
                {project.status}
              </Badge>
              {canManageAll && (
                <Button size="sm" variant="outline" onClick={() => setEditProjectOpen(true)} className="h-7 text-xs gap-1">
                  <Edit3 className="h-3 w-3" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {project.startup_name && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" /> {project.startup_name}
              </span>
            )}
            {project.department_key && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Layers className="h-3 w-3" /> {project.department_key.replace(/_/g, " ")}
              </span>
            )}
            {dl && (
              <span className={cn("flex items-center gap-1 text-xs", dl.urgent ? "text-destructive font-semibold" : "text-muted-foreground")}>
                <Calendar className="h-3 w-3" /> {dl.text}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" /> {totalMembers} member{totalMembers !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ListTodo className="h-3 w-3" /> {taskDone}/{taskTotal} task{taskTotal !== 1 ? "s" : ""}
            </span>
          </div>

          {project.description && (
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{project.description}</p>
          )}
        </div>

        {/* Overall progress */}
        <Card className="border-border/40 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Overall Progress (avg of tasks)
              </span>
              <span className="text-2xl font-bold tabular-nums">{project.overall_completion}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  project.overall_completion === 100 ? "bg-emerald-500" :
                  project.overall_completion >= 60  ? "bg-blue-500"    : "bg-primary"
                )}
                style={{ width: `${project.overall_completion}%` }}
              />
            </div>
            {taskBlocked > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{taskBlocked} task{taskBlocked !== 1 ? "s" : ""} blocked</span>
              </div>
            )}
            {project.overall_completion === 100 && taskTotal > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">All tasks complete</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Tasks */}
        {user && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              My Tasks{myTasks.length > 0 && ` — ${myTasks.length}`}
            </h2>
            {tasksLoading ? (
              <p className="text-xs text-muted-foreground italic">Loading tasks...</p>
            ) : myTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-6 text-center">
                <p className="text-xs text-muted-foreground italic">No tasks assigned to you on this project yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    canEdit={true}
                    canManageAll={canManageAll}
                    onEdit={() => openEditTask(task)}
                    onDelete={() => handleDeleteTask(task)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Team Tasks (grouped by member) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Team Tasks{taskTotal > 0 && ` — ${taskTotal}`}
            </h2>
            <div className="flex items-center gap-2">
              {canManageAll && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setAddMemberOpen(true)} className="h-7 text-xs gap-1">
                    <UserPlus className="h-3 w-3" />
                    Add Member
                  </Button>
                  <Button size="sm" onClick={() => openCreateTask()} className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" />
                    Add Task
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {unassignedTasks.length > 0 && (
              <MemberGroup
                member={null}
                tasks={unassignedTasks}
                isMe={false}
                canManageAll={canManageAll}
                onEditTask={openEditTask}
                onDeleteTask={handleDeleteTask}
                initialExpanded={true}
              />
            )}
            {sortedMembers.map((member) => {
              const memberTasks = tasksByAssignee.get(member.profile_id) ?? [];
              const isMe = member.profile_id === user?.id;
              return (
                <MemberGroup
                  key={member.id}
                  member={member}
                  tasks={memberTasks}
                  isMe={isMe}
                  canManageAll={canManageAll}
                  onAddTask={canManageAll ? () => openCreateTask(member.profile_id) : undefined}
                  onEditTask={openEditTask}
                  onDeleteTask={handleDeleteTask}
                  onRemoveMember={canManageAll ? () => handleRemoveMember(member.id, member.profile_name ?? "Member") : undefined}
                  initialExpanded={isMe}
                />
              );
            })}
          </div>
        </div>

        {/* Discussion */}
        {id && <ProjectDiscussion projectId={id} />}

      </main>

      {/* Lead controls */}
      {canManageAll && (
        <>
          <EditProjectModal project={project} open={editProjectOpen} onOpenChange={setEditProjectOpen} />
          <AddMemberModal
            project={project}
            open={addMemberOpen}
            onOpenChange={setAddMemberOpen}
            existingMemberIds={members.map((m) => m.profile_id)}
          />
        </>
      )}

      {/* Task form (create or edit) */}
      <TaskFormModal
        open={taskFormOpen}
        onOpenChange={(v) => {
          setTaskFormOpen(v);
          if (!v) {
            setTaskEditing(null);
            setPresetAssigneeId(null);
          }
        }}
        projectId={project.id}
        projectTitle={project.title}
        projectMembers={members}
        task={taskEditing}
        canManageAll={canManageAll}
        isAssignee={taskEditing?.assigned_to_profile === user?.id}
        presetAssigneeId={presetAssigneeId}
        key={taskEditing?.id ?? presetAssigneeId ?? "new"}
      />
    </div>
  );
};

export default ProjectDetail;
