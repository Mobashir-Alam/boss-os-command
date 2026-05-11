import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { TechMember } from "@/hooks/useTechTeam";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  members: TechMember[];
}

const UNASSIGNED = "__unassigned__";

export const AssignTaskModal = ({ open, onOpenChange, members }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [assignee, setAssignee] = useState<string>(UNASSIGNED);
  const [deadline, setDeadline] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const { data: leadProjects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["lead-projects", user?.id],
    enabled: !!user?.id && open,
    queryFn: async () => {
      const { data: pm, error: e1 } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("profile_id", user!.id)
        .eq("role", "lead");
      if (e1) throw e1;
      const ids = Array.from(new Set((pm ?? []).map((r) => r.project_id)));
      if (ids.length === 0) return [];
      const { data: projects, error: e2 } = await supabase
        .from("projects")
        .select("id, title")
        .in("id", ids)
        .order("title");
      if (e2) throw e2;
      return projects ?? [];
    },
  });

  useEffect(() => {
    if (leadProjects.length > 0 && !projectId) {
      setProjectId(leadProjects[0].id);
    }
  }, [leadProjects, projectId]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setAssignee(UNASSIGNED);
    setDeadline("");
    setProjectId(leadProjects[0]?.id ?? "");
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!projectId) {
      toast.error("Pick a project");
      return;
    }
    if (!user?.id) return;

    setSubmitting(true);
    try {
      const assigneeId = assignee === UNASSIGNED ? null : assignee;
      const { error } = await supabase.from("project_tasks").insert({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        assignee_profile: assigneeId,
        deadline: deadline || null,
        status: "not_started",
        completion_percentage: 0,
        created_by: user.id,
      });
      if (error) throw error;

      if (assigneeId && assigneeId !== user.id) {
        await supabase.from("notifications").insert({
          recipient_profile_id: assigneeId,
          type: "project_assigned",
          project_id: projectId,
          message: `New task: ${title.trim()}`,
        });
      }

      toast.success("Task assigned");
      qc.invalidateQueries({ queryKey: ["tech-tasks"] });
      qc.invalidateQueries({ queryKey: ["tech-members"] });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to assign task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-background/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle>Assign new task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional context"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Project *</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={loadingProjects}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingProjects
                      ? "Loading…"
                      : leadProjects.length === 0
                        ? "You don't lead any projects"
                        : "Pick a project"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {leadProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                      <span className="ml-2 text-xs text-muted-foreground">{m.role}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-deadline">Deadline</Label>
              <Input
                id="task-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || leadProjects.length === 0}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
