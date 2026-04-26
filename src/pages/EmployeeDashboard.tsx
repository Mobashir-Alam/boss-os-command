import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  useMyProjects,
  useMyNotifications,
  useMarkNotificationRead,
  type Project,
} from "@/hooks/useEmployeeProjects";
import { useMyTasks, type TaskStatus } from "@/hooks/useProjectTasks";
import { cn } from "@/lib/utils";
import {
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  AlertTriangle,
  User,
  Plus,
  Crown,
} from "lucide-react";
import CreateProjectModal from "@/components/project/CreateProjectModal";

/* ── helpers ─────────────────────────────────────────────── */

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; dot: string }> = {
  not_started: { label: "Not Started", color: "text-muted-foreground", dot: "bg-muted-foreground" },
  in_progress:  { label: "In Progress", color: "text-blue-600",         dot: "bg-blue-500" },
  done:         { label: "Done",        color: "text-emerald-600",      dot: "bg-emerald-500" },
  blocked:      { label: "Blocked",     color: "text-amber-600",        dot: "bg-amber-500" },
};

const PROJECT_STATUS_COLOR: Record<string, string> = {
  active:    "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  paused:    "bg-amber-500/10 text-amber-700 border-amber-500/20",
  completed: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  cancelled: "bg-muted/40 text-muted-foreground border-border/40",
};

function deadlineLabel(deadline: string | null): string | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff <= 7) return `${diff}d left`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function isDeadlineUrgent(deadline: string | null): boolean {
  if (!deadline) return false;
  const d = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff <= 3;
}

/* ── sub-components ──────────────────────────────────────── */

export interface MyTaskStats {
  total: number;
  done: number;
  inProgress: number;
  blocked: number;
  notStarted: number;
  avgCompletion: number;
}

function rollupStatus(stats: MyTaskStats | undefined): TaskStatus {
  if (!stats || stats.total === 0) return "not_started";
  if (stats.blocked > 0) return "blocked";
  if (stats.done === stats.total) return "done";
  if (stats.inProgress > 0 || stats.done > 0) return "in_progress";
  return "not_started";
}

function ProjectCard({
  project,
  stats,
  onClick,
}: {
  project: Project;
  stats: MyTaskStats | undefined;
  onClick: () => void;
}) {
  const member = project.my_member_row;
  const myStatus = rollupStatus(stats);
  const cfg = STATUS_CONFIG[myStatus];
  const urgent = isDeadlineUrgent(project.deadline);
  const dl = deadlineLabel(project.deadline);

  return (
    <Card
      className={cn(
        "cursor-pointer border-border/40 hover:border-border/80 hover:shadow-sm transition-all",
        myStatus === "blocked" && "border-l-2 border-l-amber-500",
        urgent && myStatus !== "done" && "border-l-2 border-l-destructive"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold leading-tight">{project.title}</p>
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0 capitalize", PROJECT_STATUS_COLOR[project.status])}
              >
                {project.status}
              </Badge>
              {member?.role === "lead" && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-amber-500/30 bg-amber-500/10 text-amber-700"
                >
                  <Crown className="h-2.5 w-2.5 mr-0.5 inline" />
                  Lead
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {project.startup_name && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Building2 className="h-2.5 w-2.5" />
                  {project.startup_name}
                </span>
              )}
              {project.department_key && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Layers className="h-2.5 w-2.5" />
                  {project.department_key.replace(/_/g, " ")}
                </span>
              )}
              {dl && (
                <span
                  className={cn(
                    "flex items-center gap-1 text-[11px]",
                    urgent && myStatus !== "done" ? "text-destructive font-semibold" : "text-muted-foreground"
                  )}
                >
                  <Calendar className="h-2.5 w-2.5" />
                  {dl}
                </span>
              )}
            </div>

            {stats && stats.total > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                <span className="text-foreground/80">{stats.done}/{stats.total}</span> task{stats.total !== 1 ? "s" : ""} done
                {stats.blocked > 0 && (
                  <span className="text-amber-700 font-medium ml-1.5">· {stats.blocked} blocked</span>
                )}
              </p>
            )}
            {(!stats || stats.total === 0) && member && (
              <p className="text-xs text-muted-foreground italic mt-1.5">
                No tasks assigned to you yet
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Badge variant="outline" className={cn("text-[10px]", cfg.color)}>
              <span className={cn("h-1.5 w-1.5 rounded-full mr-1", cfg.dot)} />
              {cfg.label}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Team progress</span>
            <span>{project.overall_completion}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                project.overall_completion === 100
                  ? "bg-emerald-500"
                  : project.overall_completion >= 60
                  ? "bg-blue-500"
                  : "bg-primary"
              )}
              style={{ width: `${project.overall_completion}%` }}
            />
          </div>
        </div>

        {/* My completion (avg of my tasks on this project) */}
        {stats && stats.total > 0 && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>My progress (avg)</span>
              <span>{stats.avgCompletion}%</span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60 transition-all duration-500"
                style={{ width: `${stats.avgCompletion}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationBell({ count }: { count: number }) {
  return (
    <div className="relative inline-flex">
      <Bell className="h-5 w-5 text-muted-foreground" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </div>
  );
}

/* ── main page ───────────────────────────────────────────── */

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: projects = [], isLoading } = useMyProjects();
  const { data: myTasks = [] } = useMyTasks();
  const { data: notifications = [] } = useMyNotifications();
  const markRead = useMarkNotificationRead();

  const [showNotifications, setShowNotifications] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const canCreate = profile?.role === "project_manager" || profile?.role === "founder";

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Per-project task stats for the current user
  const statsByProject = useMemo(() => {
    const map = new Map<string, MyTaskStats>();
    for (const t of myTasks) {
      const s = map.get(t.project_id) ?? { total: 0, done: 0, inProgress: 0, blocked: 0, notStarted: 0, avgCompletion: 0 };
      s.total++;
      if (t.status === "done") s.done++;
      else if (t.status === "in_progress") s.inProgress++;
      else if (t.status === "blocked") s.blocked++;
      else s.notStarted++;
      s.avgCompletion += t.completion_percentage;
      map.set(t.project_id, s);
    }
    for (const s of map.values()) {
      s.avgCompletion = s.total > 0 ? Math.round(s.avgCompletion / s.total) : 0;
    }
    return map;
  }, [myTasks]);

  const activeProjects  = projects.filter((p) => p.status === "active");
  const otherProjects   = projects.filter((p) => p.status !== "active");

  // Stats bar across all my tasks (not project-roll-up)
  const myActiveCount = myTasks.filter((t) => t.status === "in_progress").length;
  const blockedCount  = myTasks.filter((t) => t.status === "blocked").length;
  const doneCount     = myTasks.filter((t) => t.status === "done").length;

  const handleNotificationClick = (id: string) => {
    markRead.mutate(id);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Projects</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {profile?.full_name ?? "Team Member"} · {profile?.department?.replace(/_/g, " ") ?? ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canCreate && (
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="h-8 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                New Project
              </Button>
            )}
            <button
              type="button"
              title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <NotificationBell count={unreadCount} />
            </button>
          </div>
        </div>

        {/* Notification panel */}
        {showNotifications && (
          <div className="mb-6 border border-border/50 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] text-muted-foreground">{unreadCount} unread</span>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet</div>
            ) : (
              <div className="divide-y divide-border/30">
                {notifications.slice(0, 8).map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-muted/20 transition-colors",
                      !n.read && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(n.id)}
                  >
                    <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0", n.read ? "bg-muted-foreground/30" : "bg-primary")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats strip */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: "Active", value: myActiveCount, icon: Clock, color: "text-blue-600" },
            { label: "Blocked", value: blockedCount, icon: AlertTriangle, color: "text-amber-600" },
            { label: "Done", value: doneCount, icon: CheckCircle2, color: "text-emerald-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3 text-center">
              <Icon className={cn("h-4 w-4 mx-auto mb-1", color)} />
              <p className="text-xl font-bold">{value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && projects.length === 0 && (
          <div className="text-center py-16">
            <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No projects assigned yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your manager will add you to projects when work is ready</p>
          </div>
        )}

        {/* Active projects */}
        {!isLoading && activeProjects.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Active — {activeProjects.length}
            </h2>
            <div className="space-y-3">
              {activeProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  stats={statsByProject.get(project.id)}
                  onClick={() => navigate(`/project/${project.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Other projects */}
        {!isLoading && otherProjects.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Other — {otherProjects.length}
            </h2>
            <div className="space-y-3 opacity-60">
              {otherProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  stats={statsByProject.get(project.id)}
                  onClick={() => navigate(`/project/${project.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {canCreate && (
        <CreateProjectModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(projectId) => navigate(`/project/${projectId}`)}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
