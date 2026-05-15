import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2, Send, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useUpdateReview,
  useSubmitReview,
  type PerformanceReview,
  type RatingsBreakdown,
} from "@/hooks/usePerformanceReviews";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  review: PerformanceReview;
}

const DIMENSIONS: { key: keyof RatingsBreakdown; label: string; hint: string }[] = [
  { key: "quality",       label: "Quality",       hint: "How well did they do the work?" },
  { key: "productivity",  label: "Productivity",  hint: "How much did they ship?" },
  { key: "collaboration", label: "Collaboration", hint: "How well did they work with others?" },
  { key: "initiative",    label: "Initiative",    hint: "Did they go beyond their assigned tasks?" },
];

export default function ReviewFormModal({ open, onOpenChange, review }: Props) {
  const update = useUpdateReview();
  const submit = useSubmitReview();

  const [overall, setOverall] = useState<number | null>(review.overall_rating);
  const [ratings, setRatings] = useState<RatingsBreakdown>(review.ratings ?? {});
  const [strengths, setStrengths] = useState(review.strengths ?? "");
  const [improvements, setImprovements] = useState(review.improvements ?? "");
  const [goals, setGoals] = useState(review.goals ?? "");
  const [notes, setNotes] = useState(review.reviewer_notes ?? "");

  // Sync state when the modal opens with a different review
  useEffect(() => {
    setOverall(review.overall_rating);
    setRatings(review.ratings ?? {});
    setStrengths(review.strengths ?? "");
    setImprovements(review.improvements ?? "");
    setGoals(review.goals ?? "");
    setNotes(review.reviewer_notes ?? "");
  }, [review.id, review.updated_at]);

  const setDim = (k: keyof RatingsBreakdown, v: number) => {
    setRatings((r) => ({ ...r, [k]: v }));
  };

  const collect = () => ({
    overall_rating: overall,
    ratings,
    strengths: strengths.trim() || null,
    improvements: improvements.trim() || null,
    goals: goals.trim() || null,
    reviewer_notes: notes.trim() || null,
  });

  const handleSaveDraft = () => {
    update.mutate(
      { id: review.id, patch: collect() },
      {
        onSuccess: () => toast.success("Draft saved"),
        onError: (e: any) => toast.error(e?.message ?? "Couldn't save"),
      }
    );
  };

  const handleSubmit = () => {
    if (!overall) {
      toast.error("Set an overall rating before submitting");
      return;
    }
    update.mutate(
      { id: review.id, patch: collect() },
      {
        onSuccess: () => {
          submit.mutate(review.id, {
            onSuccess: () => {
              toast.success("Review submitted to the reviewee");
              onOpenChange(false);
            },
            onError: (e: any) => toast.error(e?.message ?? "Submission failed"),
          });
        },
        onError: (e: any) => toast.error(e?.message ?? "Save failed"),
      }
    );
  };

  const isPending = update.isPending || submit.isPending;
  const revieweeName = review.reviewee?.full_name ?? "Employee";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Performance review · {revieweeName}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {review.cycle?.name}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Overall rating */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Overall rating
            </Label>
            <div className="mt-2">
              <StarRow value={overall ?? 0} onChange={setOverall} />
            </div>
          </div>

          {/* Per-dimension ratings */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Breakdown
            </Label>
            <div className="mt-2 space-y-2">
              {DIMENSIONS.map((d) => (
                <div key={d.key} className="grid grid-cols-[140px_1fr_auto] items-center gap-3">
                  <div>
                    <p className="text-sm font-medium">{d.label}</p>
                    <p className="text-[10px] text-muted-foreground">{d.hint}</p>
                  </div>
                  <StarRow value={(ratings[d.key] as number) ?? 0} onChange={(v) => setDim(d.key, v)} compact />
                  <span className="text-xs tabular-nums text-muted-foreground w-6 text-right">
                    {ratings[d.key] ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Strengths
            </Label>
            <Textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="What this person does really well…"
              className="mt-1 min-h-[70px]"
            />
          </div>

          {/* Areas for improvement */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Areas for improvement
            </Label>
            <Textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              placeholder="Specific, actionable feedback…"
              className="mt-1 min-h-[70px]"
            />
          </div>

          {/* Goals */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Goals for next period
            </Label>
            <Textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="What should they focus on next quarter…"
              className="mt-1 min-h-[70px]"
            />
          </div>

          {/* Private reviewer notes */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Private notes (visible to HR + you, not the reviewee)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything you want HR to know but not the employee…"
              className="mt-1 min-h-[50px] bg-amber-500/5 border-amber-500/20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" variant="outline" onClick={handleSaveDraft} disabled={isPending} className="gap-1.5">
            {update.isPending && !submit.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save draft
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending} className="gap-1.5">
            {submit.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Submit to reviewee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StarRow({
  value, onChange, compact,
}: {
  value: number;
  onChange: (v: number) => void;
  compact?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className={cn(
            "rounded p-0.5 transition",
            value >= n ? "text-amber-500" : "text-muted-foreground/30 hover:text-amber-500/50"
          )}
          aria-label={`${n} star`}
        >
          <Star className={cn(compact ? "h-4 w-4" : "h-5 w-5", value >= n && "fill-current")} />
        </button>
      ))}
    </div>
  );
}
