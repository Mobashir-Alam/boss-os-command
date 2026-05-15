import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus, Plane, CheckCircle2, XCircle, Clock, Loader2, Ban, Home, Heart, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useAllLeaveRequests,
  useReviewLeaveRequest,
  type LeaveRequest,
  type LeaveType,
  type LeaveStatus,
} from "@/hooks/useLeaveRequests";
import ApplyLeaveModal from "./ApplyLeaveModal";

const TYPE_LABEL: Record<LeaveType, string> = {
  casual: "Casual",
  sick: "Sick",
  earned: "Earned",
  wfh: "WFH",
  half_day: "Half day",
  unpaid: "Unpaid",
  other: "Other",
};

const TYPE_ICON: Record<LeaveType, typeof Plane> = {
  casual: Plane,
  sick: Heart,
  earned: Briefcase,
  wfh: Home,
  half_day: Clock,
  unpaid: Ban,
  other: Plane,
};

const STATUS_CHIP: Record<LeaveStatus, string> = {
  pending:   "bg-amber-500/15 text-amber-700 border-amber-500/30",
  approved:  "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  rejected:  "bg-rose-500/15 text-rose-700 border-rose-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function formatDateRange(start: string, end: string): string {
  if (start === end) return new Date(start).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const s = new Date(start).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const e = new Date(end).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${s} – ${e}`;
}

function dayCount(start: string, end: string): number {
  const s = new Date(start + "T00:00:00").getTime();
  const e = new Date(end + "T00:00:00").getTime();
  return Math.max(1, Math.round((e - s) / 864e5) + 1);
}

export default function LeaveRequestsTab() {
  const { data: leaves = [], isLoading } = useAllLeaveRequests();
  const review = useReviewLeaveRequest();
  const [hrModalOpen, setHrModalOpen] = useState(false);

  const [pending, history] = useMemo(() => {
    const p = leaves.filter((l) => l.status === "pending");
    const h = leaves.filter((l) => l.status !== "pending");
    return [p, h];
  }, [leaves]);

  const handleAction = (id: string, action: "approve" | "reject") => {
    review.mutate(
      { id, action },
      {
        onSuccess: () => toast.success(action === "approve" ? "Approved" : "Rejected"),
        onError: (e: any) => toast.error(e?.message ?? "Couldn't update"),
      }
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Pending requests {pending.length > 0 && `· ${pending.length}`}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Approve / reject employee requests, or add a leave on someone's behalf below.
          </p>
        </div>
        <Button size="sm" onClick={() => setHrModalOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add leave for someone
        </Button>
      </div>

      {/* Pending */}
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : pending.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-emerald-600/60" />
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((l) => (
            <LeaveRow
              key={l.id}
              leave={l}
              actionable
              onApprove={() => handleAction(l.id, "approve")}
              onReject={() => handleAction(l.id, "reject")}
              isPending={review.isPending}
            />
          ))}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 mt-6">
            History
          </h3>
          <div className="space-y-2">
            {history.slice(0, 50).map((l) => (
              <LeaveRow key={l.id} leave={l} />
            ))}
          </div>
        </div>
      )}

      <ApplyLeaveModal
        open={hrModalOpen}
        onOpenChange={setHrModalOpen}
        hrMode
      />
    </div>
  );
}

function LeaveRow({
  leave,
  actionable,
  onApprove,
  onReject,
  isPending,
}: {
  leave: LeaveRequest;
  actionable?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  isPending?: boolean;
}) {
  const Icon = TYPE_ICON[leave.leave_type] ?? Plane;
  const applicantName = leave.applicant?.full_name ?? leave.applicant?.email ?? "Unknown";
  const reviewerName = leave.reviewer?.full_name ?? leave.reviewer?.email ?? null;
  return (
    <div className="rounded-xl border border-border/40 bg-card p-3">
      <div className="flex items-start gap-3">
        <Link to={`/profile/${leave.profile_id}`} className="shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-[10px]">{initials(applicantName)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/profile/${leave.profile_id}`} className="text-sm font-semibold hover:underline">
              {applicantName}
            </Link>
            <Badge variant="outline" className={cn("text-[10px] gap-1", STATUS_CHIP[leave.status])}>
              {leave.status}
            </Badge>
            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
              <Icon className="h-3 w-3" /> {TYPE_LABEL[leave.leave_type]}
              {leave.leave_type === "half_day" && leave.half_day_part && ` (${leave.half_day_part})`}
            </span>
          </div>
          <p className="mt-1 text-sm">
            <span className="font-medium">{formatDateRange(leave.start_date, leave.end_date)}</span>
            <span className="text-muted-foreground"> · {dayCount(leave.start_date, leave.end_date)} day{dayCount(leave.start_date, leave.end_date) > 1 ? "s" : ""}</span>
          </p>
          {leave.reason && (
            <p className="mt-1 text-xs italic text-muted-foreground">"{leave.reason}"</p>
          )}
          {leave.review_note && leave.status !== "pending" && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {leave.status} note: {leave.review_note}
            </p>
          )}
          {reviewerName && leave.status !== "pending" && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {leave.status} by {reviewerName}{leave.reviewed_at && ` · ${new Date(leave.reviewed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
            </p>
          )}
        </div>
        {actionable && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/10"
              onClick={onApprove}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-rose-700 border-rose-500/30 hover:bg-rose-500/10"
              onClick={onReject}
              disabled={isPending}
            >
              <XCircle className="h-3 w-3" /> Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
