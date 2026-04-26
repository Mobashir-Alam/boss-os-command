import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask, useUpdateTask, useReassignTask, type ProjectTask, type TaskStatus } from "@/hooks/useProjectTasks";
import type { ProjectMember } from "@/hooks/useEmployeeProjects";
import { toast } from "sonner";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "done",        label: "Done" },
  { value: "blocked",     label: "Blocked" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectTitle: string;
  // Members of the project — used as the assignee picker
  projectMembers: ProjectMember[];
  // If editing an existing task; if undefined, we're creating
  task?: ProjectTask | null;
  // The viewer's role on this project — controls which fields are editable
  canManageAll: boolean;       // lead/creator: can edit anything, reassign, delete
  isAssignee: boolean;         // assignee: can update own progress fields only
  // When creating, optionally pre-select an assignee (e.g. clicking "+" on a member group)
  presetAssigneeId?: string | null;
}

export default function TaskFormModal({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  projectMembers,
  task,
  canManageAll,
  isAssignee,
  presetAssigneeId,
}: Props) {
  const isEdit = !!task;
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const reassignTask = useReassignTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("unassigned");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<TaskStatus>("not_started");
  const [completion, setCompletion] = useState(0);
  const [progressNote, setProgressNote] = useState("");
  const [blockedReason, setBlockedReason] = useState("");

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setAssigneeId(task.assignee_profile ?? "unassigned");
      setDeadline(task.deadline ?? "");
      setStatus(task.status);
      setCompletion(task.completion_percentage);
      setProgressNote(task.progress_note ?? "");
      setBlockedReason(task.blocked_reason ?? "");
    } else {
      setTitle("");
      setDescription("");
      setAssigneeId(presetAssigneeId ?? "unassigned");
      setDeadline("");
      setStatus("not_started");
      setCompletion(0);
      setProgressNote("");
      setBlockedReason("");
    }
  }, [open, task, presetAssigneeId]);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }

    if (isEdit && task) {
      // Build patch with ONLY the fields the viewer is allowed to change.
      // Definition fields (title/description/deadline) → leads & creators.
      // Progress fields (status/%/notes/blocker) → assignee only, even if
      // the viewer is the lead. Lead overwriting someone else's progress
      // breaks accountability.
      const patch: any = {};
      if (canManageAll) {
        patch.title = title.trim();
        patch.description = description.trim() || null;
        patch.deadline = deadline || null;
      }
      if (isAssignee) {
        patch.status = status;
        patch.completion_percentage = completion;
        patch.progress_note = progressNote.trim() || null;
        patch.blocked_reason = status === "blocked" ? blockedReason.trim() || null : null;
      }

      // Reassignment is a separate concern — runs through useReassignTask
      // so the new assignee gets a notification.
      const newAssigneeId = assigneeId === "unassigned" ? null : assigneeId;
      const currentAssigneeId = task.assignee_profile ?? null;
      const assigneeChanged = canManageAll && newAssigneeId !== currentAssigneeId;

      const finishWithToast = () => {
        toast.success("Task updated");
        onOpenChange(false);
      };

      const onErr = (e: any) => toast.error(e.message ?? "Failed to update task");

      const runReassign = (after: () => void) => {
        if (!assigneeChanged) return after();
        reassignTask.mutate(
          {
            taskId: task.id,
            projectId,
            projectTitle,
            taskTitle: (patch.title ?? task.title) as string,
            newAssigneeId,
          },
          { onSuccess: () => after(), onError: onErr }
        );
      };

      const runPatch = (after: () => void) => {
        if (Object.keys(patch).length === 0) return after();
        updateTask.mutate(
          { taskId: task.id, projectId, patch },
          { onSuccess: () => after(), onError: onErr }
        );
      };

      // Reassign first (so notification carries the new title if it changed)
      runReassign(() => runPatch(finishWithToast));
    } else {
      createTask.mutate(
        {
          project_id: projectId,
          project_title: projectTitle,
          title: title.trim(),
          description: description.trim() || null,
          assignee_profile: assigneeId === "unassigned" ? null : assigneeId,
          deadline: deadline || null,
          status,
        },
        {
          onSuccess: () => {
            toast.success("Task created");
            onOpenChange(false);
          },
          onError: (e: any) => toast.error(e.message ?? "Failed to create task"),
        }
      );
    }
  };

  const isPending = createTask.isPending || updateTask.isPending;
  const lockMeta = isEdit && !canManageAll;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "Add Task"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="mt-1"
              disabled={lockMeta}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Acceptance criteria, links, context..."
              className="mt-1 min-h-[70px]"
              disabled={lockMeta}
            />
          </div>

          {/* Assignee + Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned to
              </label>
              {!isEdit && presetAssigneeId ? (
                // Locked: this modal was opened from a specific member's "+"
                (() => {
                  const presetMember = projectMembers.find((m) => m.profile_id === presetAssigneeId);
                  return (
                    <div className="mt-1 flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                      <span className="font-medium">{presetMember?.profile_name ?? "Member"}</span>
                      {presetMember?.role === "lead" && (
                        <span className="text-[10px] text-amber-700">(lead)</span>
                      )}
                      <span className="ml-auto text-[10px] text-muted-foreground">Locked</span>
                    </div>
                  );
                })()
              ) : (
                <Select
                  value={assigneeId}
                  onValueChange={setAssigneeId}
                  disabled={isEdit ? !canManageAll : false}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {projectMembers.map((m) => (
                      <SelectItem key={m.profile_id} value={m.profile_id}>
                        {m.profile_name ?? "Member"} {m.role === "lead" ? "(lead)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deadline</label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1"
                disabled={lockMeta}
              />
            </div>
          </div>

          {/* Progress fields — only the assignee can update their own progress.
              Lead/creator who isn't the assignee sees a read-only summary instead. */}
          {isEdit && !isAssignee && (
            <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Progress (read-only)
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium capitalize">{status.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">·</span>
                <span className="tabular-nums font-semibold">{completion}%</span>
              </div>
              {progressNote && (
                <p className="text-xs text-muted-foreground italic mt-1">"{progressNote}"</p>
              )}
              {status === "blocked" && blockedReason && (
                <p className="text-xs text-amber-700 mt-1">⚠ {blockedReason}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Only the assignee can update progress.
              </p>
            </div>
          )}

          {isEdit && isAssignee && (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Completion
                  </label>
                  <span className="text-sm font-bold tabular-nums">{completion}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[completion]}
                  onValueChange={(v) => setCompletion(v[0])}
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Progress note
                </label>
                <Textarea
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  placeholder="What changed since last update?"
                  className="mt-1 min-h-[60px]"
                />
              </div>

              {status === "blocked" && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Blocker
                  </label>
                  <Textarea
                    value={blockedReason}
                    onChange={(e) => setBlockedReason(e.target.value)}
                    placeholder="What is blocking you?"
                    className="mt-1 min-h-[50px]"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Save" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
