import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask, useUpdateTask, type ProjectTask, type TaskStatus } from "@/hooks/useProjectTasks";
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
      setAssigneeId(task.assigned_to_profile ?? "unassigned");
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
      // Build patch with only the fields the viewer is allowed to change
      const patch: any = {};
      if (canManageAll) {
        patch.title = title.trim();
        patch.description = description.trim() || null;
        patch.deadline = deadline || null;
      }
      if (canManageAll || isAssignee) {
        patch.status = status;
        patch.completion_percentage = completion;
        patch.progress_note = progressNote.trim() || null;
        patch.blocked_reason = status === "blocked" ? blockedReason.trim() || null : null;
      }
      updateTask.mutate(
        { taskId: task.id, projectId, patch },
        {
          onSuccess: () => {
            toast.success("Task updated");
            onOpenChange(false);
          },
          onError: (e: any) => toast.error(e.message ?? "Failed to update task"),
        }
      );
    } else {
      createTask.mutate(
        {
          project_id: projectId,
          project_title: projectTitle,
          title: title.trim(),
          description: description.trim() || null,
          assigned_to_profile: assigneeId === "unassigned" ? null : assigneeId,
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

          {/* Progress fields — visible only when editing or for new task default */}
          {isEdit && (
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
