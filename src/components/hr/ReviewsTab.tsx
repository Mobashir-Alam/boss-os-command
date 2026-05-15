import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Loader2, ClipboardCheck, Edit3, Eye, RotateCcw, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useReviewCycles,
  useCreateReviewCycle,
  useToggleCycleStatus,
  useAllReviews,
  useCreateReview,
  useReopenReview,
  type PerformanceReview,
  type ReviewStatus,
} from "@/hooks/usePerformanceReviews";
import { useEmployeeDirectory } from "@/hooks/useEmployeeDirectory";
import ReviewFormModal from "@/components/reviews/ReviewFormModal";
import ReviewDetailModal from "@/components/reviews/ReviewDetailModal";

const STATUS_CHIP: Record<ReviewStatus, string> = {
  draft:        "bg-muted text-muted-foreground border-border",
  submitted:    "bg-blue-500/15 text-blue-700 border-blue-500/30",
  acknowledged: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

function initials(n: string): string {
  return n.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function ReviewsTab() {
  const { data: cycles = [] } = useReviewCycles();
  const { data: reviews = [], isLoading } = useAllReviews();
  const reopen = useReopenReview();

  const [cycleFilter, setCycleFilter] = useState<string>("all");
  const [createCycleOpen, setCreateCycleOpen] = useState(false);
  const [createReviewOpen, setCreateReviewOpen] = useState(false);
  const [editing, setEditing] = useState<PerformanceReview | null>(null);
  const [viewing, setViewing] = useState<PerformanceReview | null>(null);

  const filtered = useMemo(() => {
    if (cycleFilter === "all") return reviews;
    return reviews.filter((r) => r.cycle_id === cycleFilter);
  }, [reviews, cycleFilter]);

  // Per-cycle progress
  const cycleProgress = useMemo(() => {
    const m = new Map<string, { total: number; done: number }>();
    reviews.forEach((r) => {
      const e = m.get(r.cycle_id) ?? { total: 0, done: 0 };
      e.total += 1;
      if (r.status === "acknowledged") e.done += 1;
      m.set(r.cycle_id, e);
    });
    return m;
  }, [reviews]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Performance reviews
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Open a cycle, assign reviewers, track who's submitted and who's acknowledged.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setCreateCycleOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Cycle
          </Button>
          <Button size="sm" onClick={() => setCreateReviewOpen(true)} disabled={cycles.length === 0} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Assign review
          </Button>
        </div>
      </div>

      {/* Cycles strip */}
      {cycles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Cycles</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCycleFilter("all")}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition",
                cycleFilter === "all"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              )}
            >
              All ({reviews.length})
            </button>
            {cycles.map((c) => {
              const prog = cycleProgress.get(c.id) ?? { total: 0, done: 0 };
              const active = cycleFilter === c.id;
              return (
                <div key={c.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCycleFilter(c.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition inline-flex items-center gap-1.5",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {c.name}
                    <span className="text-[10px] opacity-70">{prog.done}/{prog.total}</span>
                    {c.status === "closed" && <Badge variant="outline" className="text-[9px]">closed</Badge>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews list */}
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-10 text-center">
          <ClipboardCheck className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {cycles.length === 0 ? "No cycles yet — open one to get started." : "No reviews in this cycle."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-border/40 bg-card p-3">
              <div className="flex items-center gap-3">
                <Link to={`/profile/${r.reviewee_id}`} className="shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-[10px]">{initials(r.reviewee?.full_name ?? "?")}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/profile/${r.reviewee_id}`} className="text-sm font-semibold hover:underline">
                      {r.reviewee?.full_name ?? "Unknown"}
                    </Link>
                    <Badge variant="outline" className={cn("text-[10px]", STATUS_CHIP[r.status])}>
                      {r.status}
                    </Badge>
                    {r.overall_rating && (
                      <span className="inline-flex items-center gap-0.5 text-amber-600 text-[11px]">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="tabular-nums font-bold">{r.overall_rating}</span>
                        <span className="text-muted-foreground">/5</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {r.cycle?.name} · reviewed by {r.reviewer?.full_name ?? "—"}
                    {r.submitted_at && ` · submitted ${new Date(r.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {r.status === "draft" || r.status === "submitted" ? (
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setEditing(r)}>
                      <Edit3 className="h-3 w-3" /> Edit
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setViewing(r)}>
                      <Eye className="h-3 w-3" /> View
                    </Button>
                  )}
                  {r.status !== "draft" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 text-xs text-muted-foreground"
                      onClick={() =>
                        reopen.mutate(r.id, {
                          onSuccess: () => toast.success("Reopened to draft"),
                          onError: (e: any) => toast.error(e?.message ?? "Couldn't reopen"),
                        })
                      }
                      title="Reset to draft"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateCycleDialog open={createCycleOpen} onOpenChange={setCreateCycleOpen} />
      <AssignReviewDialog open={createReviewOpen} onOpenChange={setCreateReviewOpen} />
      {editing && (
        <ReviewFormModal
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          review={editing}
        />
      )}
      {viewing && (
        <ReviewDetailModal
          open={!!viewing}
          onOpenChange={(v) => !v && setViewing(null)}
          review={viewing}
        />
      )}
    </div>
  );
}

/* ───────── Create cycle dialog ───────── */

function CreateCycleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateReviewCycle();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const today = new Date();
  const [startDate, setStartDate] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`);
  const [endDate, setEndDate] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()}`);

  const reset = () => { setName(""); setDescription(""); };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Name the cycle"); return; }
    create.mutate(
      { name, description, startDate, endDate },
      {
        onSuccess: () => { toast.success(`Opened cycle "${name}"`); onOpenChange(false); reset(); },
        onError: (e: any) => toast.error(e?.message ?? "Couldn't create"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Open a review cycle</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q2 2026, Annual 2026" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Start</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">End</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Goals, scope, focus areas…" className="mt-1 min-h-[50px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Open cycle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Assign review dialog ───────── */

function AssignReviewDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: cycles = [] } = useReviewCycles();
  const { data: directory = [] } = useEmployeeDirectory();
  const create = useCreateReview();

  const openCycles = cycles.filter((c) => c.status === "open");
  const [cycleId, setCycleId] = useState<string>(openCycles[0]?.id ?? "");
  const [revieweeId, setRevieweeId] = useState<string>("");
  const [reviewerId, setReviewerId] = useState<string>("");

  const reset = () => { setRevieweeId(""); setReviewerId(""); };

  const handleSubmit = () => {
    if (!cycleId || !revieweeId || !reviewerId) {
      toast.error("Pick cycle, reviewee, and reviewer");
      return;
    }
    if (revieweeId === reviewerId) {
      toast.error("Reviewer can't be the same person as the reviewee");
      return;
    }
    create.mutate(
      { cycleId, revieweeId, reviewerId },
      {
        onSuccess: () => { toast.success("Review assigned"); onOpenChange(false); reset(); },
        onError: (e: any) => toast.error(e?.message ?? "Couldn't create — duplicate?"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Assign a review</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cycle</Label>
            <Select value={cycleId} onValueChange={setCycleId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pick cycle" /></SelectTrigger>
              <SelectContent>
                {openCycles.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground italic">No open cycles</div>
                ) : openCycles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Reviewee</Label>
            <Select value={revieweeId} onValueChange={setRevieweeId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Who's being reviewed" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {directory.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name}{e.department && ` · ${e.department}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Reviewer</Label>
            <Select value={reviewerId} onValueChange={setReviewerId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Who's writing the review" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {directory.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name}{e.department && ` · ${e.department}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Usually the reviewee's department head or project lead.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
