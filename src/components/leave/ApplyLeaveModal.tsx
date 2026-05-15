import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployeeDirectory } from "@/hooks/useEmployeeDirectory";
import { useCreateLeaveRequest, type LeaveType } from "@/hooks/useLeaveRequests";
import { toast } from "sonner";
import { Plane, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When set, locks the applicant picker to a specific person */
  lockedProfileId?: string;
  /** When true, HR can pick any employee; when false, locked to current user */
  hrMode?: boolean;
}

const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: "casual",   label: "Casual leave (CL)" },
  { value: "sick",     label: "Sick leave (SL)" },
  { value: "earned",   label: "Earned / privilege leave (EL)" },
  { value: "wfh",      label: "Work from home" },
  { value: "half_day", label: "Half day" },
  { value: "unpaid",   label: "Unpaid leave (LOP)" },
  { value: "other",    label: "Other" },
];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ApplyLeaveModal({ open, onOpenChange, lockedProfileId, hrMode }: Props) {
  const { user, profile } = useAuth();
  const { data: directory = [] } = useEmployeeDirectory();
  const create = useCreateLeaveRequest();

  const isHR =
    profile?.role === "founder" ||
    (profile?.role === "functional_head" && profile?.department === "hr");
  const showPicker = !!hrMode && isHR && !lockedProfileId;
  const showAutoApprove = !!hrMode && isHR;

  const [profileId, setProfileId] = useState<string>(lockedProfileId ?? user?.id ?? "");
  const [leaveType, setLeaveType] = useState<LeaveType>("casual");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [halfDayPart, setHalfDayPart] = useState<"morning" | "afternoon" | "">("");
  const [reason, setReason] = useState("");
  const [autoApprove, setAutoApprove] = useState(true); // default ON in HR mode

  useEffect(() => {
    if (!open) return;
    setProfileId(lockedProfileId ?? user?.id ?? "");
    setLeaveType("casual");
    setStartDate(todayISO());
    setEndDate(todayISO());
    setHalfDayPart("");
    setReason("");
    setAutoApprove(true);
  }, [open, lockedProfileId, user?.id]);

  // Keep end_date >= start_date
  useEffect(() => {
    if (endDate < startDate) setEndDate(startDate);
  }, [startDate, endDate]);

  // For half_day, force end == start
  useEffect(() => {
    if (leaveType === "half_day" && endDate !== startDate) {
      setEndDate(startDate);
    }
  }, [leaveType, startDate, endDate]);

  const dayCount = useMemo(() => {
    const s = new Date(startDate + "T00:00:00").getTime();
    const e = new Date(endDate + "T00:00:00").getTime();
    return Math.max(1, Math.round((e - s) / 864e5) + 1);
  }, [startDate, endDate]);

  const handleSubmit = () => {
    if (!profileId) {
      toast.error("Pick the employee");
      return;
    }
    if (leaveType === "half_day" && !halfDayPart) {
      toast.error("Pick morning or afternoon for the half day");
      return;
    }
    create.mutate(
      {
        profileId,
        leaveType,
        startDate,
        endDate,
        halfDayPart: leaveType === "half_day" ? (halfDayPart as "morning" | "afternoon") : null,
        reason,
        autoApprove: showAutoApprove ? autoApprove : false,
      },
      {
        onSuccess: () => {
          const action = showAutoApprove && autoApprove ? "added (approved)" : "submitted for approval";
          toast.success(`Leave ${action}`);
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e?.message ?? "Couldn't submit"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            {hrMode ? "Add leave on someone's behalf" : "Apply for leave"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Employee picker (HR only) */}
          {showPicker && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Employee</Label>
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pick someone" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {directory.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name}{e.department && ` · ${e.department}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
            <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAVE_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">End date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
                disabled={leaveType === "half_day"}
                min={startDate}
              />
            </div>
          </div>

          {leaveType === "half_day" && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Which half?</Label>
              <Select value={halfDayPart} onValueChange={(v) => setHalfDayPart(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Morning or afternoon" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            {dayCount} day{dayCount > 1 ? "s" : ""} requested
          </p>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Family event, medical, personal…"
              className="mt-1 min-h-[60px]"
            />
          </div>

          {showAutoApprove && (
            <label className="flex items-start gap-2 rounded-md border border-border/40 bg-muted/20 p-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="mt-0.5"
              />
              <div className="text-xs">
                <p className="font-medium">Auto-approve immediately</p>
                <p className="text-muted-foreground">
                  Marks the request as approved on submit and writes the attendance days directly.
                  Use when the employee already cleared it with you over email/Slack.
                </p>
              </div>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={create.isPending} className="gap-1.5">
            {create.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            {hrMode && autoApprove ? "Add & approve" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
