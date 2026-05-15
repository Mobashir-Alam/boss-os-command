import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAcknowledgeReview, type PerformanceReview } from "@/hooks/usePerformanceReviews";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  review: PerformanceReview;
  /** Hide the private reviewer_notes (the reviewee should never see them) */
  hidePrivateNotes?: boolean;
}

const DIM_LABELS: Record<string, string> = {
  quality: "Quality",
  productivity: "Productivity",
  collaboration: "Collaboration",
  initiative: "Initiative",
};

export default function ReviewDetailModal({ open, onOpenChange, review, hidePrivateNotes }: Props) {
  const { user, profile } = useAuth();
  const ack = useAcknowledgeReview();
  const [note, setNote] = useState("");

  const isReviewee = user?.id === review.reviewee_id;
  const isHR =
    profile?.role === "founder" ||
    (profile?.role === "functional_head" && profile?.department === "hr");
  const showPrivate = !hidePrivateNotes && (isHR || user?.id === review.reviewer_id);
  const canAcknowledge = isReviewee && review.status === "submitted";
  const reviewerName = review.reviewer?.full_name ?? "Reviewer";
  const revieweeName = review.reviewee?.full_name ?? "Reviewee";

  const handleAck = () => {
    ack.mutate(
      { id: review.id, note },
      {
        onSuccess: () => {
          toast.success("Acknowledged");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e?.message ?? "Couldn't acknowledge"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Performance review
            <Badge variant="outline" className="text-[10px] capitalize">
              {review.status}
            </Badge>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {revieweeName} · {review.cycle?.name} · written by {reviewerName}
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Overall + breakdown */}
          <div className="rounded-xl border border-border/40 bg-card p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Overall rating</p>
            <div className="mt-1 flex items-center gap-2">
              <StarRowReadonly value={review.overall_rating ?? 0} />
              <span className="text-2xl font-bold tabular-nums">
                {review.overall_rating ?? "—"}
                <span className="text-sm font-normal text-muted-foreground">/5</span>
              </span>
            </div>
            {Object.keys(review.ratings ?? {}).length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {Object.entries(review.ratings ?? {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded border border-border/30 px-2 py-1.5">
                    <span className="text-muted-foreground">{DIM_LABELS[k] ?? k}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <StarRowReadonly value={Number(v) ?? 0} compact />
                      <span className="tabular-nums w-3 text-right">{v ?? "—"}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {review.strengths && (
            <Block label="Strengths" body={review.strengths} />
          )}
          {review.improvements && (
            <Block label="Areas for improvement" body={review.improvements} />
          )}
          {review.goals && (
            <Block label="Goals for next period" body={review.goals} />
          )}

          {showPrivate && review.reviewer_notes && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-amber-700">
                <ShieldCheck className="h-3 w-3" /> Private notes (HR + reviewer only)
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{review.reviewer_notes}</p>
            </div>
          )}

          {review.acknowledgment_note && (
            <Block
              label={`Reviewee response${review.acknowledged_at ? ` · ${new Date(review.acknowledged_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}`}
              body={review.acknowledgment_note}
            />
          )}

          {canAcknowledge && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Acknowledge & add a note (optional)
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Disagree with anything? Want to add context? Optional — leave blank if you just want to acknowledge."
                className="mt-1 min-h-[60px]"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
          {canAcknowledge && (
            <Button size="sm" onClick={handleAck} disabled={ack.isPending} className="gap-1.5">
              {ack.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
              Acknowledge
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function StarRowReadonly({ value, compact }: { value: number; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            compact ? "h-3 w-3" : "h-4 w-4",
            value >= n ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"
          )}
        />
      ))}
    </span>
  );
}
