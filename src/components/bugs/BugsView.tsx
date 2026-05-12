import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTechMembers } from "@/hooks/useTechTeam";
import {
  useBugs,
  useUpdateBugStatus,
  useUpdateBugAssignee,
  useCreateBug,
  type Bug,
  type BugType,
  type BugStatus,
  type BugArea,
} from "@/hooks/useBugs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Loader2, Bug as BugIcon, Search } from "lucide-react";

const TYPES: BugType[] = [
  "bug",
  "new_feature",
  "critical_security",
  "high_priority",
  "product_ux",
  "new_implementation",
];
const STATUSES: BugStatus[] = ["open", "in_progress", "solved"];
const AREAS: BugArea[] = ["frontend", "backend", "mobile", "infra", "devops", "security", "other"];

const TYPE_LABEL: Record<BugType, string> = {
  bug: "Bug",
  new_feature: "New feature",
  critical_security: "Critical security",
  high_priority: "High priority",
  product_ux: "Product / UX",
  new_implementation: "New implementation",
};

// left-border + chip color per type
const TYPE_BORDER: Record<BugType, string> = {
  critical_security: "border-l-[#dc2626]",
  high_priority: "border-l-[#f97316]",
  bug: "border-l-[#f59e0b]",
  product_ux: "border-l-[#3b82f6]",
  new_feature: "border-l-[#10b981]",
  new_implementation: "border-l-[#64748b]",
};
const TYPE_CHIP: Record<BugType, string> = {
  critical_security: "border-[#dc2626]/40 text-[#fca5a5] bg-[#dc2626]/10",
  high_priority: "border-[#f97316]/40 text-[#fdba74] bg-[#f97316]/10",
  bug: "border-[#f59e0b]/40 text-[#fcd34d] bg-[#f59e0b]/10",
  product_ux: "border-[#3b82f6]/40 text-[#93c5fd] bg-[#3b82f6]/10",
  new_feature: "border-[#10b981]/40 text-[#6ee7b7] bg-[#10b981]/10",
  new_implementation: "border-[#64748b]/40 text-slate-300 bg-slate-500/10",
};

const STATUS_CHIP: Record<BugStatus, string> = {
  open: "border-white/15 bg-white/5 text-muted-foreground",
  in_progress: "border-blue-400/40 bg-blue-500/10 text-blue-300",
  solved: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300 line-through",
};

const FILE_REF_RE = /[a-zA-Z0-9_./-]+\.(?:ts|tsx|js|jsx|sql|json)\s*\(line\s+\d+\)/g;

const initials = (n: string) =>
  n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const relTime = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
};

const GlassCard = ({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
  <Card
    className={cn(
      "border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.25)]",
      className,
    )}
    {...rest}
  >
    {children}
  </Card>
);

interface Props {
  projectId?: string;
}

export default function BugsView({ projectId }: Props) {
  const { user, profile } = useAuth();
  const { data: members = [] } = useTechMembers();
  const { data: bugs = [], isLoading } = useBugs(projectId);

  const [typeFilter, setTypeFilter] = useState<Set<BugType>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<BugStatus>>(new Set(["open", "in_progress"]));
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Bug | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  // Profile lookup for reporter/assignee names (covers non-tech profiles too)
  const profileIds = useMemo(() => {
    const ids = new Set<string>();
    bugs.forEach((b) => {
      if (b.assignee_profile) ids.add(b.assignee_profile);
      if (b.reporter_profile) ids.add(b.reporter_profile);
    });
    return Array.from(ids);
  }, [bugs]);

  const { data: profileRows = [] } = useQuery({
    queryKey: ["bug-profile-names", profileIds.sort().join(",")],
    enabled: profileIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", profileIds);
      return data ?? [];
    },
  });
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    profileRows.forEach((p: any) => m.set(p.id, p.full_name ?? p.email ?? "Unknown"));
    members.forEach((mem) => m.set(mem.id, mem.full_name));
    return m;
  }, [profileRows, members]);

  // Project titles (only needed for the all-bugs view, but harmless when projectId set)
  const projectIds = useMemo(
    () => Array.from(new Set(bugs.map((b) => b.project_id).filter(Boolean) as string[])),
    [bugs],
  );
  const { data: projectRows = [] } = useQuery({
    queryKey: ["bug-project-titles", projectIds.sort().join(",")],
    enabled: !projectId && projectIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, title").in("id", projectIds);
      return data ?? [];
    },
  });
  const projectTitleById = useMemo(() => {
    const m = new Map<string, string>();
    projectRows.forEach((p: any) => m.set(p.id, p.title));
    return m;
  }, [projectRows]);

  const isTechRole =
    profile?.role === "founder" ||
    ((profile?.role === "functional_head" || profile?.role === "team_member") &&
      profile?.department === "tech");
  const canReport = !!isTechRole;

  const toggle = <T,>(set: Set<T>, v: T): Set<T> => {
    const n = new Set(set);
    n.has(v) ? n.delete(v) : n.add(v);
    return n;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bugs.filter((b) => {
      if (typeFilter.size && !typeFilter.has(b.type)) return false;
      if (statusFilter.size && !statusFilter.has(b.status)) return false;
      if (q) {
        const hay = `${b.title} ${b.description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bugs, typeFilter, statusFilter, search]);

  return (
    <div className="space-y-4">
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter((s) => toggle(s, t))}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition",
                  typeFilter.has(t)
                    ? TYPE_CHIP[t]
                    : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10",
                )}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="h-5 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter((set) => toggle(set, s))}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider transition",
                  statusFilter.has(s)
                    ? STATUS_CHIP[s]
                    : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10",
                )}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bugs…"
                className="h-8 w-56 pl-7 text-xs"
              />
            </div>
            {canReport && (
              <Button size="sm" onClick={() => setReportOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Report Bug
              </Button>
            )}
          </div>
        </div>
      </GlassCard>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : filtered.length === 0 ? (
        <GlassCard className="p-10 text-center text-sm text-muted-foreground">
          <BugIcon className="mx-auto mb-2 h-6 w-6 opacity-40" />
          No bugs match the current filters.
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => {
            const assigneeName = b.assignee_profile ? nameById.get(b.assignee_profile) : null;
            const reporterName = b.reporter_profile ? nameById.get(b.reporter_profile) : null;
            const isSolved = b.status === "solved";
            return (
              <button
                key={b.id}
                onClick={() => setSelected(b)}
                className={cn(
                  "group block w-full rounded-lg border border-l-4 border-white/10 bg-white/[0.03] p-3 text-left backdrop-blur transition hover:border-white/20 hover:bg-white/[0.05]",
                  TYPE_BORDER[b.type],
                  isSolved && "opacity-60",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={cn("text-[10px]", TYPE_CHIP[b.type])}>
                        {TYPE_LABEL[b.type]}
                      </Badge>
                      <Badge variant="outline" className="border-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {b.area}
                      </Badge>
                      {!projectId && b.project_id && (
                        <span className="text-[10px] text-muted-foreground">
                          · {projectTitleById.get(b.project_id) ?? "Project"}
                        </span>
                      )}
                    </div>
                    <p className={cn("text-sm font-semibold", isSolved && "line-through")}>{b.title}</p>
                    {b.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{b.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider", STATUS_CHIP[b.status])}>
                      {b.status.replace("_", " ")}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      {assigneeName ? (
                        <>
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">{initials(assigneeName)}</AvatarFallback>
                          </Avatar>
                          <span>{assigneeName}</span>
                        </>
                      ) : (
                        <span className="italic">Unassigned</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{relTime(b.created_at)}</span>
                  </div>
                </div>
                {reporterName && (
                  <p className="mt-1 text-right text-[10px] text-muted-foreground/70">
                    reported by {reporterName}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      <BugDetailSheet
        bug={selected}
        onClose={() => setSelected(null)}
        members={members}
        nameById={nameById}
        canManage={canReport}
        userId={user?.id ?? null}
      />

      <ReportBugDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        members={members}
        projectId={projectId}
        userId={user?.id ?? null}
      />
    </div>
  );
}

/* ─────────── Detail sheet ─────────── */

function BugDetailSheet({
  bug,
  onClose,
  members,
  nameById,
  canManage,
  userId,
}: {
  bug: Bug | null;
  onClose: () => void;
  members: { id: string; full_name: string }[];
  nameById: Map<string, string>;
  canManage: boolean;
  userId: string | null;
}) {
  const updateStatus = useUpdateBugStatus();
  const updateAssignee = useUpdateBugAssignee();
  if (!bug) return null;

  const editable =
    canManage || bug.reporter_profile === userId || bug.assignee_profile === userId;

  const renderDescription = (text: string) => {
    const parts: React.ReactNode[] = [];
    let last = 0;
    text.replace(FILE_REF_RE, (match, _ext, offset) => {
      if (offset > last) parts.push(text.slice(last, offset));
      parts.push(
        <code
          key={`${offset}`}
          className="mx-0.5 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-primary"
        >
          {match}
        </code>,
      );
      last = offset + match.length;
      return match;
    });
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  };

  return (
    <Sheet open={!!bug} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl bg-background/95 backdrop-blur-xl border-l border-white/10 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px]", TYPE_CHIP[bug.type])}>
              {TYPE_LABEL[bug.type]}
            </Badge>
            <Badge variant="outline" className="border-white/10 bg-white/5 text-[10px] uppercase">
              {bug.area}
            </Badge>
            <span className="block w-full text-base font-semibold">{bug.title}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Description
            </h4>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {renderDescription(bug.description ?? "")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</Label>
              <Select
                value={bug.status}
                disabled={!editable || updateStatus.isPending}
                onValueChange={(v) =>
                  updateStatus.mutate(
                    { id: bug.id, status: v as BugStatus },
                    {
                      onSuccess: () => toast.success("Status updated"),
                      onError: (e: any) => toast.error(e?.message ?? "Failed"),
                    },
                  )
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Assignee</Label>
              <Select
                value={bug.assignee_profile ?? "__unassigned__"}
                disabled={!editable || updateAssignee.isPending}
                onValueChange={(v) =>
                  updateAssignee.mutate(
                    { id: bug.id, assignee: v === "__unassigned__" ? null : v },
                    {
                      onSuccess: () => toast.success("Assignee updated"),
                      onError: (e: any) => toast.error(e?.message ?? "Failed"),
                    },
                  )
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-white/10 pt-3 text-[11px] text-muted-foreground">
            created {relTime(bug.created_at)}
            {bug.reporter_profile && nameById.get(bug.reporter_profile) && (
              <> by <span className="text-foreground">{nameById.get(bug.reporter_profile)}</span></>
            )}
            {" · "}last updated {relTime(bug.updated_at)}
            {bug.solved_at && (
              <> · solved {relTime(bug.solved_at)}</>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─────────── Report bug dialog ─────────── */

function ReportBugDialog({
  open,
  onOpenChange,
  members,
  projectId,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  members: { id: string; full_name: string }[];
  projectId?: string;
  userId: string | null;
}) {
  const create = useCreateBug();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<BugType>("bug");
  const [area, setArea] = useState<BugArea>("frontend");
  const [assignee, setAssignee] = useState<string>("__unassigned__");
  const [chosenProject, setChosenProject] = useState<string>("");

  const { data: projectOptions = [] } = useQuery({
    queryKey: ["bug-report-projects"],
    enabled: open && !projectId,
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, title").order("title");
      return data ?? [];
    },
  });

  const reset = () => {
    setTitle("");
    setDescription("");
    setType("bug");
    setArea("frontend");
    setAssignee("__unassigned__");
    setChosenProject("");
  };

  const submit = () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    if (!userId) return;
    const pid = projectId ?? (chosenProject || null);
    create.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        type,
        area,
        project_id: pid,
        assignee_profile: assignee === "__unassigned__" ? null : assignee,
        reporter_profile: userId,
      },
      {
        onSuccess: () => {
          toast.success("Bug reported");
          reset();
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e?.message ?? "Failed to report"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-lg bg-background/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle>Report bug</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Steps to reproduce, file refs like src/foo.tsx (line 42), expected vs actual…"
              rows={5}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as BugType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Area</Label>
              <Select value={area} onValueChange={(v) => setArea(v as BugArea)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!projectId && (
              <div className="space-y-1.5">
                <Label>Project</Label>
                <Select value={chosenProject} onValueChange={setChosenProject}>
                  <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
                  <SelectContent>
                    {projectOptions.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
