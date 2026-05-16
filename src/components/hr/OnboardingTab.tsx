import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  UserPlus, CheckCircle2, Circle, Loader2, Trash2, Sparkles, Plus,
  Briefcase, FileText, Laptop, GraduationCap, Users as UsersIcon, Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useOnboardingForProfile,
  useApplyDefaultOnboarding,
  useAddOnboardingItem,
  useUpdateOnboardingItem,
  useDeleteOnboardingItem,
  type OnboardingCategory,
  type OnboardingItem,
  type OnboardingStatus,
} from "@/hooks/useOnboarding";
import { useEmployeeDirectory } from "@/hooks/useEmployeeDirectory";

const CATEGORY_ICON: Record<OnboardingCategory, typeof FileText> = {
  paperwork: FileText,
  it_setup: Laptop,
  training: GraduationCap,
  introductions: UsersIcon,
  equipment: Box,
  other: Briefcase,
};

const CATEGORY_LABEL: Record<OnboardingCategory, string> = {
  paperwork: "Paperwork",
  it_setup: "IT setup",
  training: "Training",
  introductions: "Introductions",
  equipment: "Equipment",
  other: "Other",
};

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function OnboardingTab() {
  const { data: directory = [] } = useEmployeeDirectory();
  const [selectedId, setSelectedId] = useState<string>("");

  // Default to first profile if nothing picked
  const activeProfile = selectedId
    ? directory.find((e) => e.id === selectedId) ?? null
    : directory[0] ?? null;
  const activeId = activeProfile?.id ?? "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Onboarding
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Create a checklist for each new hire. They can mark items done themselves.
          </p>
        </div>
        <Select value={activeId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Pick an employee" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {directory.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.full_name}{e.department && ` · ${e.department}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeProfile ? (
        <ChecklistFor profile={activeProfile} />
      ) : (
        <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-10 text-center">
          <UserPlus className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Pick someone from the directory to view their checklist.</p>
        </div>
      )}
    </div>
  );
}

function ChecklistFor({ profile }: { profile: { id: string; full_name: string; department: string | null } }) {
  const { data: items = [], isLoading } = useOnboardingForProfile(profile.id);
  const applyDefault = useApplyDefaultOnboarding();
  const update = useUpdateOnboardingItem();
  const remove = useDeleteOnboardingItem();
  const [addOpen, setAddOpen] = useState(false);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.status === "done").length;
    return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  }, [items]);

  // Group by category
  const byCategory = useMemo(() => {
    const m = new Map<OnboardingCategory, OnboardingItem[]>();
    items.forEach((i) => {
      const arr = m.get(i.category) ?? [];
      arr.push(i);
      m.set(i.category, arr);
    });
    return m;
  }, [items]);

  const handleToggleDone = (item: OnboardingItem) => {
    const next: OnboardingStatus = item.status === "done" ? "pending" : "done";
    update.mutate(
      { id: item.id, profileId: profile.id, patch: { status: next } },
      { onError: (e: any) => toast.error(e?.message ?? "Couldn't update") }
    );
  };

  const handleDelete = (item: OnboardingItem) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    remove.mutate(
      { id: item.id, profileId: profile.id },
      { onSuccess: () => toast.success("Removed"), onError: (e: any) => toast.error(e?.message ?? "Couldn't delete") }
    );
  };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-xl border border-border/40 bg-card p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link to={`/profile/${profile.id}`} className="flex items-center gap-3 hover:underline">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-xs">{initials(profile.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{profile.full_name}</p>
              <p className="text-[11px] text-muted-foreground">{profile.department ?? "—"}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {items.length === 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  applyDefault.mutate(profile.id, {
                    onSuccess: () => toast.success("Default checklist applied (8 items)"),
                    onError: (e: any) => toast.error(e?.message ?? "Couldn't apply"),
                  })
                }
                disabled={applyDefault.isPending}
                className="gap-1.5"
              >
                {applyDefault.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Apply default
              </Button>
            ) : null}
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add item
            </Button>
          </div>
        </div>
        {items.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{stats.done} of {stats.total} done</span>
              <span className="font-bold tabular-nums">{stats.pct}%</span>
            </div>
            <Progress value={stats.pct} className="h-1.5" />
          </div>
        )}
      </div>

      {/* Items grouped by category */}
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-8 text-center">
          <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No onboarding items yet.</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Click "Apply default" to seed 8 standard items, or "Add item" for a custom one.
          </p>
        </div>
      ) : (
        (Object.keys(CATEGORY_LABEL) as OnboardingCategory[]).map((cat) => {
          const list = byCategory.get(cat) ?? [];
          if (list.length === 0) return null;
          const Icon = CATEGORY_ICON[cat];
          return (
            <div key={cat}>
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <Icon className="h-3 w-3" /> {CATEGORY_LABEL[cat]}
              </p>
              <div className="space-y-1.5">
                {list.map((item) => {
                  const done = item.status === "done";
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-lg border bg-card p-3 flex items-start gap-3 group",
                        done ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-border/40 hover:border-border"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleDone(item)}
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
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          {item.due_date && <span>due {new Date(item.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                          {done && item.done_at && <Badge variant="outline" className="text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-700">done</Badge>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                        aria-label="Delete item"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <AddItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        profileId={profile.id}
      />
    </div>
  );
}

function AddItemDialog({
  open,
  onOpenChange,
  profileId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profileId: string;
}) {
  const add = useAddOnboardingItem();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<OnboardingCategory>("other");
  const [dueDate, setDueDate] = useState("");

  const reset = () => { setTitle(""); setDescription(""); setCategory("other"); setDueDate(""); };

  const handleSubmit = () => {
    if (!title.trim()) { toast.error("Item needs a title"); return; }
    add.mutate(
      { profileId, title, description: description || undefined, category, dueDate: dueDate || null },
      {
        onSuccess: () => { toast.success("Item added"); onOpenChange(false); reset(); },
        onError: (e: any) => toast.error(e?.message ?? "Couldn't add"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add onboarding item</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sign NDA" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 min-h-[50px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as OnboardingCategory)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABEL) as OnboardingCategory[]).map((k) => (
                    <SelectItem key={k} value={k}>{CATEGORY_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Due date (optional)</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={add.isPending}>
            {add.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
