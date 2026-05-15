import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Plane, Heart, Briefcase, Home, Clock, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllLeaveRequests, type LeaveRequest, type LeaveType } from "@/hooks/useLeaveRequests";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

const TYPE_DOT: Record<LeaveType, string> = {
  casual:   "bg-amber-500",
  sick:     "bg-rose-500",
  earned:   "bg-blue-500",
  wfh:      "bg-violet-500",
  half_day: "bg-cyan-500",
  unpaid:   "bg-slate-500",
  other:    "bg-muted-foreground",
};

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

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysInMonth(year: number, monthZeroIndexed: number): number {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

function dayOfWeek(year: number, monthZeroIndexed: number, day: number): number {
  // 0 = Sunday … 6 = Saturday — Indian convention often starts week Monday;
  // we'll start Sunday for grid simplicity.
  return new Date(year, monthZeroIndexed, day).getDay();
}

export default function LeaveCalendar() {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const { data: leaves = [] } = useAllLeaveRequests();

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // Build a map: dateISO → list of leaves overlapping that day (approved + pending)
  const leavesByDay = useMemo(() => {
    const m = new Map<string, LeaveRequest[]>();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month, daysInMonth(year, month));
    leaves.forEach((l) => {
      if (l.status === "rejected" || l.status === "cancelled") return;
      const start = new Date(l.start_date + "T00:00:00");
      const end = new Date(l.end_date + "T00:00:00");
      if (end < monthStart || start > monthEnd) return;
      // intersect with this month
      const from = start < monthStart ? monthStart : start;
      const to = end > monthEnd ? monthEnd : end;
      const cur = new Date(from);
      while (cur.getTime() <= to.getTime()) {
        const key = isoDate(cur);
        const arr = m.get(key) ?? [];
        arr.push(l);
        m.set(key, arr);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return m;
  }, [leaves, year, month]);

  // Build the grid: leading blanks for weekday alignment + each day cell
  const numDays = daysInMonth(year, month);
  const leadingBlanks = dayOfWeek(year, month, 1); // 0..6 (Sun..Sat)
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: numDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayISO = isoDate(today);

  // Stats for this month
  const monthStats = useMemo(() => {
    let approved = 0;
    let pending = 0;
    const byType: Record<string, number> = {};
    leavesByDay.forEach((arr) => {
      arr.forEach((l) => {
        if (l.status === "approved") approved += 1;
        else if (l.status === "pending") pending += 1;
        byType[l.leave_type] = (byType[l.leave_type] ?? 0) + 1;
      });
    });
    return { approved, pending, byType };
  }, [leavesByDay]);

  return (
    <div className="space-y-4">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">{monthLabel}</h3>
          <p className="text-[11px] text-muted-foreground">
            {monthStats.approved} approved · {monthStats.pending} pending leave-days this month
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="h-8 text-xs"
          >
            Today
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        <div className="grid grid-cols-7 bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-2 py-2 text-center font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={i} className="min-h-[80px] border-t border-l border-border/20 bg-muted/5" />;
            }
            const dateISO = isoDate(new Date(year, month, day));
            const dayLeaves = leavesByDay.get(dateISO) ?? [];
            const isToday = dateISO === todayISO;
            return (
              <Popover key={i}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "min-h-[80px] border-t border-l border-border/20 p-1.5 text-left transition hover:bg-muted/20",
                      isToday && "bg-primary/5 ring-1 ring-primary/30",
                      dayLeaves.length === 0 && "cursor-default"
                    )}
                    disabled={dayLeaves.length === 0}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-xs font-semibold tabular-nums",
                        isToday ? "text-primary" : "text-foreground"
                      )}>
                        {day}
                      </span>
                      {dayLeaves.length > 0 && (
                        <span className="text-[9px] font-bold tabular-nums text-muted-foreground">
                          {dayLeaves.length}
                        </span>
                      )}
                    </div>
                    {dayLeaves.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {dayLeaves.slice(0, 3).map((l, j) => (
                          <div key={j} className="flex items-center gap-1 text-[9px] truncate">
                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", TYPE_DOT[l.leave_type])} />
                            <span className="truncate text-muted-foreground">
                              {l.applicant?.full_name?.split(" ")[0] ?? "?"}
                            </span>
                          </div>
                        ))}
                        {dayLeaves.length > 3 && (
                          <p className="text-[9px] text-muted-foreground italic">
                            +{dayLeaves.length - 3} more
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" side="bottom" align="start">
                  <div className="p-3 border-b border-border/30">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {new Date(year, month, day).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric", weekday: "short",
                      })}
                    </p>
                    <p className="text-sm font-medium mt-0.5">
                      {dayLeaves.length} {dayLeaves.length === 1 ? "person" : "people"} on leave
                    </p>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border/20">
                    {dayLeaves.map((l) => {
                      const Icon = TYPE_ICON[l.leave_type];
                      return (
                        <Link
                          key={l.id}
                          to={`/profile/${l.profile_id}`}
                          className="flex items-center gap-2 p-2.5 hover:bg-muted/20"
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px]">
                              {initials(l.applicant?.full_name ?? "?")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{l.applicant?.full_name ?? "Unknown"}</p>
                            <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                              <Icon className="h-2.5 w-2.5" />
                              {TYPE_LABEL[l.leave_type]}
                              {l.status === "pending" && (
                                <Badge variant="outline" className="ml-1 text-[9px] border-amber-500/30 bg-amber-500/15 text-amber-700">
                                  pending
                                </Badge>
                              )}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="font-semibold">Legend:</span>
        {(Object.keys(TYPE_DOT) as LeaveType[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-full", TYPE_DOT[t])} />
            {TYPE_LABEL[t]}
          </span>
        ))}
      </div>
    </div>
  );
}
