import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStartups } from "@/hooks/useStartups";
import {
  useAssignableProfiles,
  useCreateProject,
  type NewMemberInput,
} from "@/hooks/useEmployeeProjects";
import { useAuth } from "@/contexts/AuthContext";
import { Crown, Plus, X, Search, Layers } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (projectId: string) => void;
  // For PMs we lock the startup (they can only create in their own).
  // For founders we let them pick from any startup they own.
  lockedStartupId?: string;
}

interface DraftMember extends NewMemberInput {
  display_name: string;
}

export default function CreateProjectModal({ open, onOpenChange, onCreated, lockedStartupId }: Props) {
  const { user, profile } = useAuth();
  const { dbStartups } = useStartups();
  const { data: profiles = [] } = useAssignableProfiles();
  const createProject = useCreateProject();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentKey, setDepartmentKey] = useState<string>("none");
  const [deadline, setDeadline] = useState("");
  const [startupId, setStartupId] = useState<string>(lockedStartupId ?? "");
  const [memberQuery, setMemberQuery] = useState("");
  const [members, setMembers] = useState<DraftMember[]>([]);
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});

  const reset = () => {
    setTitle("");
    setDescription("");
    setDepartmentKey("none");
    setDeadline("");
    setStartupId(lockedStartupId ?? "");
    setMemberQuery("");
    setMembers([]);
    setTaskInputs({});
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const availableStartups = useMemo(() => {
    if (lockedStartupId) {
      return dbStartups.filter((s) => s.id === lockedStartupId);
    }
    return dbStartups;
  }, [dbStartups, lockedStartupId]);

  const memberOptions = useMemo(() => {
    const selectedIds = new Set(members.map((m) => m.profile_id));
    const q = memberQuery.toLowerCase().trim();
    return profiles.filter((p) => {
      if (selectedIds.has(p.id)) return false;
      if (!q) return true;
      return (
        (p.full_name ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [profiles, members, memberQuery]);

  const addMember = (profileId: string, displayName: string) => {
    // First member added becomes the lead unless one already exists.
    // Founders MUST explicitly pick a lead — but the simplest UX is: first added = lead, can be changed.
    const hasLead = members.some((m) => m.role === "lead");
    setMembers((prev) => [
      ...prev,
      { profile_id: profileId, role: hasLead ? "member" : "lead", display_name: displayName },
    ]);
    setMemberQuery("");
  };

  const removeMember = (profileId: string) => {
    setMembers((prev) => prev.filter((m) => m.profile_id !== profileId));
    setTaskInputs((prev) => {
      const { [profileId]: _, ...rest } = prev;
      return rest;
    });
  };

  const setLead = (profileId: string) => {
    setMembers((prev) =>
      prev.map((m) => ({ ...m, role: m.profile_id === profileId ? "lead" : "member" }))
    );
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Project title is required");
      return;
    }
    if (!startupId) {
      toast.error("Pick a startup");
      return;
    }
    if (members.length === 0) {
      toast.error("Add at least one team member");
      return;
    }
    if (!members.some((m) => m.role === "lead")) {
      toast.error("Pick a lead");
      return;
    }

    createProject.mutate(
      {
        startup_id: startupId,
        department_key: departmentKey === "none" ? null : departmentKey,
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline || null,
        members: members.map((m) => ({
          profile_id: m.profile_id,
          role: m.role,
          task_title: taskInputs[m.profile_id]?.trim() || null,
        })),
      },
      {
        onSuccess: (projectId) => {
          toast.success("Project created");
          reset();
          onOpenChange(false);
          onCreated?.(projectId);
        },
        onError: (e: any) => toast.error(e.message ?? "Failed to create project"),
      }
    );
  };

  // PM auto-add: include themselves as lead by default
  const ensureSelfAsLead = () => {
    if (!user?.id) return;
    if (members.some((m) => m.profile_id === user.id)) return;
    setMembers((prev) => [
      {
        profile_id: user.id,
        role: "lead",
        display_name: profile?.full_name ?? "You",
      },
      ...prev.map((m) => ({ ...m, role: "member" as const })),
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Create New Project
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Creator Analytics Dashboard v2"
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is the goal? What does done look like?"
              className="mt-1 min-h-[80px]"
            />
          </div>

          {/* Startup + Department + Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Startup
              </label>
              <Select value={startupId} onValueChange={setStartupId} disabled={!!lockedStartupId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pick a startup" />
                </SelectTrigger>
                <SelectContent>
                  {availableStartups.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Department
              </label>
              <Select value={departmentKey} onValueChange={setDepartmentKey}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Deadline
              </label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Team Members
              </label>
              <button
                type="button"
                onClick={ensureSelfAsLead}
                className="text-[10px] text-primary hover:underline"
              >
                + Add me as lead
              </button>
            </div>

            {/* Selected members */}
            {members.length > 0 && (
              <div className="space-y-2 mb-3">
                {members.map((m) => (
                  <div key={m.profile_id} className="rounded-lg border border-border/50 p-3 bg-muted/20">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">{m.display_name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] capitalize",
                            m.role === "lead"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                              : "border-border bg-card text-muted-foreground"
                          )}
                        >
                          {m.role === "lead" && <Crown className="h-2.5 w-2.5 mr-1 inline" />}
                          {m.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {m.role !== "lead" && (
                          <button
                            type="button"
                            onClick={() => setLead(m.profile_id)}
                            className="text-[10px] text-amber-700 hover:underline px-1"
                            title="Make this person the lead"
                          >
                            Make lead
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeMember(m.profile_id)}
                          className="p-1 rounded hover:bg-destructive/10 text-destructive/70"
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <Input
                      value={taskInputs[m.profile_id] ?? ""}
                      onChange={(e) =>
                        setTaskInputs((prev) => ({ ...prev, [m.profile_id]: e.target.value }))
                      }
                      placeholder="Their task on this project (optional)"
                      className="mt-2 h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Picker */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Search people to add..."
                className="pl-9 h-9 text-sm"
              />
            </div>
            {memberQuery && (
              <div className="mt-1 max-h-[180px] overflow-y-auto rounded-lg border border-border/40 bg-card">
                {memberOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-3">No matches.</p>
                ) : (
                  memberOptions.slice(0, 20).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addMember(p.id, p.full_name ?? p.email ?? "Unknown")}
                      className="w-full text-left px-3 py-2 hover:bg-muted/40 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.full_name ?? "—"}</p>
                        {p.email && (
                          <p className="text-[10px] text-muted-foreground truncate">{p.email}</p>
                        )}
                      </div>
                      {p.role && (
                        <Badge variant="outline" className="text-[10px] capitalize flex-shrink-0">
                          {p.role.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              Pick one lead and any number of members. Lead has full control over the project.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={createProject.isPending} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {createProject.isPending ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
