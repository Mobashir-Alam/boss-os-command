import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useUpdateProject,
  useAddProjectMember,
  useAssignableProfiles,
  type Project,
  type ProjectStatus,
} from "@/hooks/useEmployeeProjects";
import { Search } from "lucide-react";
import { toast } from "sonner";

const DEPARTMENTS: { key: string; label: string }[] = [
  { key: "social_media",              label: "Social Media" },
  { key: "video_production_editing",  label: "Video Production / Editing" },
  { key: "content_management",        label: "Content Management" },
  { key: "studio",                    label: "Studio" },
  { key: "tech",                      label: "Tech" },
  { key: "creators_brands_outreach",  label: "Creators & Brands" },
  { key: "hr",                        label: "HR" },
  { key: "graphic_designing",         label: "Graphic Design" },
  { key: "office_management",         label: "Office Management" },
  { key: "finance",                   label: "Finance" },
];

/* ── EditProjectModal ───────────────────────────────────── */

export function EditProjectModal({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const updateProject = useUpdateProject();
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [departmentKey, setDepartmentKey] = useState<string>(project.department_key ?? "none");
  const [deadline, setDeadline] = useState(project.deadline ?? "");

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    updateProject.mutate(
      {
        projectId: project.id,
        patch: {
          title: title.trim(),
          description: description.trim() || null,
          status,
          deadline: deadline || null,
          department_key: departmentKey === "none" ? null : departmentKey,
        },
      },
      {
        onSuccess: () => {
          toast.success("Project updated");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message ?? "Failed to update"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Department</label>
              <Select value={departmentKey} onValueChange={setDepartmentKey}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deadline</label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={updateProject.isPending}>
            {updateProject.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── AddMemberModal ─────────────────────────────────────── */

export function AddMemberModal({
  project,
  open,
  onOpenChange,
  existingMemberIds,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingMemberIds: string[];
}) {
  const { data: profiles = [] } = useAssignableProfiles();
  const addMember = useAddProjectMember();
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pickedName, setPickedName] = useState<string>("");
  const [taskTitle, setTaskTitle] = useState("");

  const options = useMemo(() => {
    const taken = new Set(existingMemberIds);
    const q = query.toLowerCase().trim();
    return profiles.filter((p) => {
      if (taken.has(p.id)) return false;
      if (!q) return true;
      return (
        (p.full_name ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [profiles, existingMemberIds, query]);

  const handleSave = () => {
    if (!pickedId) {
      toast.error("Pick a person first");
      return;
    }
    addMember.mutate(
      {
        projectId: project.id,
        projectTitle: project.title,
        member: {
          profile_id: pickedId,
          role: "member",
          task_title: taskTitle.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success(`${pickedName} added`);
          setPickedId(null);
          setPickedName("");
          setTaskTitle("");
          setQuery("");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message ?? "Failed to add member"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {pickedId ? (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-sm font-semibold">{pickedName}</p>
              <button
                type="button"
                onClick={() => { setPickedId(null); setPickedName(""); }}
                className="text-[10px] text-muted-foreground hover:text-foreground mt-1"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people..."
                  className="pl-9"
                  autoFocus
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border/40 bg-card">
                {options.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-3">No matches.</p>
                ) : (
                  options.slice(0, 20).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setPickedId(p.id); setPickedName(p.full_name ?? p.email ?? "Unknown"); }}
                      className="w-full text-left px-3 py-2 hover:bg-muted/40"
                    >
                      <p className="text-sm font-medium">{p.full_name ?? "—"}</p>
                      {p.email && <p className="text-[10px] text-muted-foreground">{p.email}</p>}
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Task (optional)
            </label>
            <Input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="What will they work on?"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!pickedId || addMember.isPending}>
            {addMember.isPending ? "Adding..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
