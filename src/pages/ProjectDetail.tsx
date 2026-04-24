import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProjectDetail,
  useUpdateMyTask,
  type ProjectMember,
  type MemberStatus,
} from "@/hooks/useEmployeeProjects";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  User,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit3,
} from "lucide-react";

/* ── helpers ─────────────────────────────────────────────── */

const STATUS_CONFIG: Record<MemberStatus, { label: string; color: string; bg: string; dot: string }> = {
  not_started: { label: "Not Started", color: "text-muted-foreground", bg: "bg-muted/40",          dot: "bg-muted-foreground" },
  in_progress:  { label: "In Progress", color: "text-blue-700",         bg: "bg-blue-500/10",       dot: "bg-blue-500" },
  done:         { label: "Done",        color: "text-emerald-700",      bg: "bg-emerald-500/10",    dot: "bg-emerald-500" },
  blocked:      { label: "Blocked",     color: "text-amber-700",        bg: "bg-amber-500/10",      dot: "bg-amber-500" },
};

const NEXT_STATUS: Partial<Record<MemberStatus, MemberStatus>> = {
  not_started: "in_progress",
  in_progress:  "done",
  blocked:      "in_progress",
};

function deadlineLabel(deadline: string | null): { text: string; urgent: boolean } | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const urgent = diff <= 3;
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, urgent: true };
  if (diff === 0) return { text: "Due today", urgent: true };
  if (diff === 1) return { text: "Due tomorrow", urgent: true };
  if (diff <= 7) return { text: `${diff}d left`, urgent };
  return { text: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), urgent: false };
}

/* ── member row ──────────────────────────────────────────── */

function MemberRow({
  member,
  isMe,
  onEdit,
}: {
  member: ProjectMember;
  isMe: boolean;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[member.status];

  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        isMe ? "border-primary/30 bg-primary/5" : "border-border/40 bg-muted/10"
      )}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Avatar */}
        <div
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
            isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {(member.profile_name ?? "?")[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">
              {member.profile_name ?? "Team Member"}
              {isMe && <span className="text-[10px] text-primary ml-1">(you)</span>}
            </p>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", cfg.color, cfg.bg)}>
              <span className={cn("h-1.5 w-1.5 rounded-full mr-1", cfg.dot)} />
              {cfg.label}
            </Badge>
            {member.role === "lead" && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-purple-700 bg-purple-500/10">
                Lead
              </Badge>
            )}
          </div>
          {member.task_title && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{member.task_title}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-bold tabular-nums">{member.completion_percentage}%</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border/20 mt-0">
          {/* Progress bar */}
          <div className="space-y-1 pt-3">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  member.status === "done" ? "bg-emerald-500" : member.status === "in_progress" ? "bg-blue-500" : "bg-muted-foreground/40"
                )}
                style={{ width: `${member.completion_percentage}%` }}
              />
            </div>
          </div>

          {member.task_description && (
            <p className="text-xs text-muted-foreground leading-relaxed">{member.task_description}</p>
          )}

          {member.progress_note && (
            <div className="rounded-lg bg-muted/30 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Latest update</p>
              <p className="text-xs">{member.progress_note}</p>
            </div>
          )}

          {member.status === "blocked" && member.blocked_reason && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-0.5">Blocker</p>
              <p className="text-xs text-amber-700">{member.blocked_reason}</p>
            </div>
          )}

          {isMe && (
            <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={onEdit}>
              <Edit3 className="h-3 w-3 mr-1" />
              Update My Progress
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── update dialog ───────────────────────────────────────── */

function UpdateDialog({
  member,
  open,
  onClose,
}: {
  member: ProjectMember;
  open: boolean;
  onClose: () => void;
}) {
  const updateTask = useUpdateMyTask();
  const [status, setStatus] = useState<MemberStatus>(member.status);
  const [pct, setPct] = useState(member.completion_percentage);
  const [note, setNote] = useState(member.progress_note ?? "");
  const [blockedReason, setBlockedReason] = useState(member.blocked_reason ?? "");

  const handleSave = async () => {
    try {
      await updateTask.mutateAsync({
        memberId: member.id,
        projectId: member.project_id,
        status,
        completion_percentage: pct,
        progress_note: note.trim() || undefined,
        blocked_reason: status === "blocked" ? blockedReason.trim() : "",
      });
      toast.success("Progress updated");
      onClose();
    } catch {
      toast.error("Failed to save update");
    }
  };

  const statusOptions: MemberStatus[] = ["not_started", "in_progress", "done", "blocked"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Update My Progress</DialogTitle>
        </DialogHeader>

        {member.task_title && (
          <p className="text-sm font-medium text-muted-foreground -mt-2">{member.task_title}</p>
        )}

        <div className="space-y-4">
          {/* Status */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-medium text-left transition-all",
                      status === s
                        ? `${cfg.bg} ${cfg.color} border-current`
                        : "border-border/40 text-muted-foreground hover:border-border"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full inline-block mr-1.5 align-middle", cfg.dot)} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Completion */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Completion
              </label>
              <span className="text-sm font-bold tabular-nums">{pct}%</span>
            </div>
            <Slider
              value={[pct]}
              onValueChange={([v]) => setPct(v)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Blocker reason */}
          {status === "blocked" && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                What's blocking you?
              </label>
              <Textarea
                placeholder="Describe the blocker..."
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                className="text-sm resize-none"
                rows={2}
              />
            </div>
          )}

          {/* Progress note */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Progress note (optional)
            </label>
            <Textarea
              placeholder="What did you work on? Any updates for the team..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-sm resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={updateTask.isPending}>
            {updateTask.isPending ? "Saving..." : "Save Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── main page ───────────────────────────────────────────── */

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: project, isLoading } = useProjectDetail(id);
  const [editOpen, setEditOpen] = useState(false);

  const myMember = project?.members?.find((m) => m.profile_id === user?.id) ?? null;
  const dl = project ? deadlineLabel(project.deadline) : null;

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
  const lead = members.find((m) => m.role === "lead");
  const totalMembers = members.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 py-10">

        {/* Back */}
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
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] capitalize flex-shrink-0",
                project.status === "active"    && "text-emerald-700 bg-emerald-500/10 border-emerald-500/20",
                project.status === "paused"    && "text-amber-700 bg-amber-500/10 border-amber-500/20",
                project.status === "completed" && "text-blue-700 bg-blue-500/10 border-blue-500/20",
              )}
            >
              {project.status}
            </Badge>
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
                Overall Team Progress
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
            {project.overall_completion === 100 && (
              <div className="mt-2 flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">All tasks complete</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My task quick-update strip */}
        {myMember && myMember.status !== "done" && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">My Task</p>
                <p className="text-sm font-medium mt-0.5">{myMember.task_title ?? "Assigned task"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tabular-nums">{myMember.completion_percentage}%</span>
                <Button size="sm" className="h-8 text-xs" onClick={() => setEditOpen(true)}>
                  Update
                </Button>
              </div>
            </div>
            {NEXT_STATUS[myMember.status] && (
              <p className="text-[10px] text-muted-foreground mt-2">
                Tip: open the update dialog to advance your status or log a note for your team.
              </p>
            )}
          </div>
        )}

        {myMember && myMember.status === "done" && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">Your task is complete</p>
              {myMember.task_title && (
                <p className="text-xs text-emerald-600/70">{myMember.task_title}</p>
              )}
            </div>
            <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          </div>
        )}

        {/* Team members */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Team — {totalMembers} member{totalMembers !== 1 ? "s" : ""}
          </h2>
          <div className="space-y-2">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isMe={member.profile_id === user?.id}
                onEdit={() => setEditOpen(true)}
              />
            ))}
          </div>
        </div>

      </main>

      {/* Update dialog */}
      {myMember && (
        <UpdateDialog
          member={myMember}
          open={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
