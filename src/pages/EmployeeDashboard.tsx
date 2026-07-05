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
  Circle,
  ClipboardCheck,
  Clock,
  Crown,
  Edit3,
  Layers,
  AlertTriangle,
  Plane,
  Plus,
  Star,
  User,
  UserPlus,
} from "lucide-react";
import CreateProjectModal from "@/components/project/CreateProjectModal";
import ApplyLeaveModal from "@/components/leave/ApplyLeaveModal";
import { useMyLeaveRequests, useCancelLeaveRequest, type LeaveStatus } from "@/hooks/useLeaveRequests";
import { useMyReviews, useReviewsToWrite, type PerformanceReview } from "@/hooks/usePerformanceReviews";
import ReviewDetailModal from "@/components/reviews/ReviewDetailModal";
import ReviewFormModal from "@/components/reviews/ReviewFormModal";
import { useOnboardingForProfile, useUpdateOnboardingItem, type OnboardingItem, type OnboardingStatus } from "@/hooks/useOnboarding";
import MyActivity from "@/components/employee/MyActivity";
import { toast } from "sonner";

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
  const { profile, user } = useAuth();
  const { data: projects = [], isLoading } = useMyProjects();
  const { data: myTasks = [] } = useMyTasks();
  const { data: notifications = [] } = useMyNotifications();
  const markRead = useMarkNotificationRead();

  const [showNotifications, setShowNotifications] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const { data: myLeaves = [] } = useMyLeaveRequests();
  const cancelLeave = useCancelLeaveRequest();
  const { data: myReviews = [] } = useMyReviews();
  const { data: reviewsToWrite = [] } = useReviewsToWrite();
  const [openReview, setOpenReview] = useState<PerformanceReview | null>(null);
  const [openReviewToWrite, setOpenReviewToWrite] = useState<PerformanceReview | null>(null);
  const { data: myOnboarding = [] } = useOnboardingForProfile(user?.id);
  const updateOnboarding = useUpdateOnboardingItem();

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
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLeaveOpen(true)}
              className="h-8 gap-1.5 text-xs"
            >
              <Plane className="h-3.5 w-3.5" />
              Apply Leave
            </Button>
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

        {/* My Activity — GitHub commits + Slack attendance (last 30 days) */}
        <div className="mb-6">
          <MyActivity />
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

        {/* My recent leaves */}
        {myLeaves.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              My leaves
            </h2>
            <div className="space-y-1.5">
              {myLeaves.slice(0, 5).map((l) => {
                const statusChip: Record<LeaveStatus, string> = {
                  pending:   "bg-amber-500/15 text-amber-700 border-amber-500/30",
                  approved:  "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
                  rejected:  "bg-rose-500/15 text-rose-700 border-rose-500/30",
                  cancelled: "bg-muted text-muted-foreground border-border",
                };
                const sameDay = l.start_date === l.end_date;
                const dateStr = sameDay
                  ? new Date(l.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                  : `${new Date(l.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${new Date(l.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
                return (
                  <div key={l.id} className="rounded-lg border border-border/40 bg-card p-3 flex items-center gap-3">
                    <Plane className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium capitalize">{l.leave_type.replace("_", " ")}</span>
                        <span className="text-muted-foreground"> · {dateStr}</span>
                      </p>
                      {l.reason && (
                        <p className="text-[11px] text-muted-foreground italic truncate">"{l.reason}"</p>
                      )}
                    </div>
                    <Badge variant="outline" className={cn("text-[10px]", statusChip[l.status])}>
                      {l.status}
                    </Badge>
                    {l.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] text-muted-foreground"
                        onClick={() =>
                          cancelLeave.mutate(l.id, {
                            onSuccess: () => toast.success("Cancelled"),
                            onError: (e: any) => toast.error(e?.message ?? "Couldn't cancel"),
                          })
                        }
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* My onboarding (only shows if HR has set items up for this user) */}
        {myOnboarding.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <UserPlus className="h-3.5 w-3.5" /> My onboarding
              {(() => {
                const done = myOnboarding.filter((i) => i.status === "done").length;
                return <span className="text-muted-foreground/70 normal-case font-normal">· {done}/{myOnboarding.length} done</span>;
              })()}
            </h2>
            <div className="space-y-1.5">
              {myOnboarding.slice(0, 8).map((item: OnboardingItem) => {
                const done = item.status === "done";
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-lg border p-3 flex items-start gap-3",
                      done ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-border/40 bg-card"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const next: OnboardingStatus = done ? "pending" : "done";
                        updateOnboarding.mutate(
                          { id: item.id, profileId: user!.id, patch: { status: next } },
                          { onError: (e: any) => toast.error(e?.message ?? "Couldn't update") }
                        );
                      }}
                      className="mt-0.5"
                    >
                      {done
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600 fill-emerald-100" />
                        : <Circle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", done && "line-through text-muted-foreground")}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reviews to write (only shows if this user is assigned as a reviewer) */}
        {reviewsToWrite.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <Edit3 className="h-3.5 w-3.5" /> Reviews you need to write
            </h2>
            <div className="space-y-1.5">
              {reviewsToWrite.map((r) => {
                const isDraft = r.status === "draft";
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setOpenReviewToWrite(r)}
                    className={cn(
                      "w-full rounded-lg border p-3 flex items-center gap-3 text-left transition hover:border-border",
                      isDraft ? "border-amber-500/40 bg-amber-500/[0.04]" : "border-border/40 bg-card hover:bg-muted/20"
                    )}
                  >
                    <Edit3 className={cn("h-3.5 w-3.5 shrink-0", isDraft ? "text-amber-600" : "text-muted-foreground")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{r.reviewee?.full_name ?? "Reviewee"}</span>
                        <span className="text-muted-foreground"> · {r.cycle?.name}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        Status: {r.status}{isDraft ? " — needs writing + submit" : " — submitted, awaiting acknowledgment"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* My reviews */}
        {myReviews.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <ClipboardCheck className="h-3.5 w-3.5" /> My reviews
            </h2>
            <div className="space-y-1.5">
              {myReviews.slice(0, 5).map((r) => {
                const needsAction = r.status === "submitted";
                const reviewerName = r.reviewer?.full_name ?? "Reviewer";
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setOpenReview(r)}
                    className={cn(
                      "w-full rounded-lg border p-3 flex items-center gap-3 text-left transition hover:border-border",
                      needsAction
                        ? "border-primary/40 bg-primary/[0.04]"
                        : "border-border/40 bg-card hover:bg-muted/20"
                    )}
                  >
                    <ClipboardCheck className={cn("h-3.5 w-3.5 shrink-0", needsAction ? "text-primary" : "text-muted-foreground")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{r.cycle?.name ?? "Review"}</span>
                        <span className="text-muted-foreground"> · written by {reviewerName}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {needsAction ? "New — please review and acknowledge" : `Status: ${r.status}`}
                        {r.overall_rating && ` · ${r.overall_rating}/5`}
                      </p>
                    </div>
                    {r.overall_rating && (
                      <span className="inline-flex items-center gap-0.5 text-amber-600 text-xs font-bold tabular-nums">
                        <Star className="h-3 w-3 fill-current" /> {r.overall_rating}
                      </span>
                    )}
                  </button>
                );
              })}
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

      <ApplyLeaveModal open={leaveOpen} onOpenChange={setLeaveOpen} />

      {openReview && (
        <ReviewDetailModal
          open={!!openReview}
          onOpenChange={(v) => !v && setOpenReview(null)}
          review={openReview}
          hidePrivateNotes
        />
      )}

      {openReviewToWrite && (
        <ReviewFormModal
          open={!!openReviewToWrite}
          onOpenChange={(v) => !v && setOpenReviewToWrite(null)}
          review={openReviewToWrite}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
