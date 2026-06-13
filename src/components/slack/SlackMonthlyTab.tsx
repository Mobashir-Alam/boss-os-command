import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import InfoTooltip from "@/components/social/InfoTooltip";
import type { MonthlySheet, AttendanceStatus } from "@/hooks/useSlack";

// Status → cell color
const CELL: Record<AttendanceStatus, string> = {
  checked_in: "bg-green-500",
  active_no_checkin: "bg-amber-400",
  absent: "bg-red-400",
};
const CELL_LABEL: Record<AttendanceStatus, string> = {
  checked_in: "Checked in",
  active_no_checkin: "Active, no check-in",
  absent: "Absent",
};

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dayNum(date: string): string {
  return String(Number(date.split("-")[2]));
}

function dowShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return ["S", "M", "T", "W", "T", "F", "S"][new Date(y, m - 1, d).getDay()];
}

function toCsv(sheet: MonthlySheet): string {
  const header = ["Name", ...sheet.dates.map(dayNum), "Present", "NoCheckin", "Absent", "Updates", "Covered"];
  const lines = [header.join(",")];
  for (const row of sheet.rows) {
    const cells = sheet.dates.map((d) => {
      const c = row.byDate[d];
      if (!c) return "";
      const base = c.status === "checked_in" ? "P" : c.status === "active_no_checkin" ? "A-NC" : "ABS";
      const upd = c.update_state === "posted" ? "+U" : c.update_state === "catchup" ? "~U" : "";
      return base + upd;
    });
    lines.push([
      `"${row.name.replace(/"/g, '""')}"`,
      ...cells,
      row.present_days, row.active_no_checkin_days, row.absent_days, row.update_days, row.covered_days,
    ].join(","));
  }
  return lines.join("\n");
}

interface Props {
  sheet: MonthlySheet | undefined;
  isLoading: boolean;
  month: string;
  onMonthChange: (month: string) => void;
  configured: boolean;
}

export default function SlackMonthlyTab({ sheet, isLoading, month, onMonthChange, configured }: Props) {
  const thisMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  function downloadCsv() {
    if (!sheet) return;
    const blob = new Blob([toCsv(sheet)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slack-attendance-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!configured) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Set up attendance monitoring first (Today tab → Setup).
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header / controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMonthChange(shiftMonth(month, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-40 text-center">{monthLabel(month)}</span>
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            disabled={month >= thisMonth}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!sheet?.rows.length} className="gap-1.5">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <span className="text-muted-foreground font-medium">Fill = attendance:</span>
          {(Object.keys(CELL) as AttendanceStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={cn("w-3 h-3 rounded", CELL[s])} />
              {CELL_LABEL[s]}
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-300" /> Self-reported
            <InfoTooltip size="xs">Checked in via a later bulk message (lighter green), not a live same-day check-in. Hover a cell to see the claim.</InfoTooltip>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-muted" /> No data / off
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <span className="text-muted-foreground font-medium">Ring = work update:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-muted ring-2 ring-emerald-600" /> Reported
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-muted ring-2 ring-amber-500" /> Caught up
            <InfoTooltip size="xs">A later batched update covered this day within the grace window.</InfoTooltip>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-muted ring-2 ring-red-500" /> Not reported
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : !sheet?.rows.length ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No attendance records for {monthLabel(month)}.
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="border-collapse text-xs">
              <thead>
                <tr className="border-b">
                  <th className="sticky left-0 bg-background text-left font-medium px-3 py-2 min-w-[140px] z-10">Name</th>
                  {sheet.dates.map((d) => (
                    <th key={d} className="px-0 py-1 font-normal text-muted-foreground text-center" style={{ minWidth: 22 }}>
                      <div className="text-[9px] leading-tight">{dowShort(d)}</div>
                      <div>{dayNum(d)}</div>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center font-medium border-l" title="Present days (checked in)">P</th>
                  <th className="px-2 py-2 text-center font-medium" title="Absent days">Ab</th>
                  <th className="px-2 py-2 text-center font-medium" title="Days an update was actually posted">Up</th>
                  <th className="px-2 py-2 text-center font-medium" title="Days covered by an update incl. catch-up backfill">Cov</th>
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((row) => (
                  <tr key={row.user_id} className="border-b hover:bg-muted/40">
                    <td className="sticky left-0 bg-background px-3 py-1.5 font-medium truncate max-w-[140px] z-10">{row.name}</td>
                    {sheet.dates.map((d) => {
                      const c = row.byDate[d];
                      const selfReported = !!c && c.status === "checked_in" && c.check_in_source === "self_reported";
                      const fill = !c
                        ? "bg-muted"
                        : selfReported
                        ? "bg-green-300" // lighter = claimed later, not live
                        : CELL[c.status];
                      const ring =
                        c && c.status !== "absent"
                          ? c.update_state === "posted"
                            ? "ring-2 ring-emerald-600"
                            : c.update_state === "catchup"
                            ? "ring-2 ring-amber-500"
                            : "ring-2 ring-red-500"
                          : "";
                      const updLabel = !c
                        ? ""
                        : c.update_state === "posted"
                        ? " · update ✓"
                        : c.update_state === "catchup"
                        ? " · caught up"
                        : c.status !== "absent"
                        ? " · no update"
                        : "";
                      const checkLabel = selfReported
                        ? ` · self-reported${c?.check_in_claim_text ? `: "${c.check_in_claim_text.slice(0, 80)}"` : ""}`
                        : "";
                      return (
                        <td key={d} className="p-0.5 text-center">
                          <div
                            className={cn("w-4 h-4 mx-auto rounded", fill, ring)}
                            title={c ? `${d}: ${CELL_LABEL[c.status]}${checkLabel}${updLabel}` : `${d}: no data`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center font-semibold border-l text-green-600">{row.present_days}</td>
                    <td className="px-2 py-1.5 text-center text-red-500">{row.absent_days}</td>
                    <td className="px-2 py-1.5 text-center text-indigo-600">{row.update_days}</td>
                    <td className="px-2 py-1.5 text-center text-amber-600">{row.covered_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
