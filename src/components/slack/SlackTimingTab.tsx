import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import InfoTooltip from "@/components/social/InfoTooltip";
import type { SlackHeatmapCell } from "@/hooks/useSlack";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function fmtHour(h: number) {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function heatColor(count: number, maxVal: number): string {
  if (count === 0 || maxVal === 0) return "#f1f5f9"; // slate-100
  const intensity = Math.min(count / maxVal, 1);
  // indigo palette: 50 → 600
  if (intensity < 0.2) return "#e0e7ff"; // indigo-100
  if (intensity < 0.4) return "#a5b4fc"; // indigo-300
  if (intensity < 0.6) return "#818cf8"; // indigo-400
  if (intensity < 0.8) return "#6366f1"; // indigo-500
  return "#4338ca"; // indigo-700
}

interface Props {
  data:
    | {
        cells: SlackHeatmapCell[];
        maxVal: number;
        peak_hour: number;
        peak_dow: number;
      }
    | undefined;
  isLoading: boolean;
}

export default function SlackTimingTab({ data, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!data?.cells.length) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        No timing data yet — sync Slack first.
      </div>
    );
  }

  // Build lookup: day × hour → count
  const cellMap = new Map<string, number>();
  for (const c of data.cells) {
    cellMap.set(`${c.day}:${c.hour}`, c.count);
  }

  return (
    <div className="space-y-6">
      {/* Insight banner */}
      <Card className="bg-indigo-50 border-indigo-200">
        <CardContent className="flex items-center gap-3 py-3 px-4">
          <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
          <span className="text-sm text-indigo-800">
            Peak activity: <strong>{DAYS[data.peak_dow]}</strong> at{" "}
            <strong>{fmtHour(data.peak_hour)} UTC</strong> — best time to post
            announcements for maximum visibility.
          </span>
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1">
            Message heatmap
            <InfoTooltip size="xs">
              Each cell shows relative message volume for that day + hour (UTC). Darker = more activity. Based on each channel&apos;s recorded peak hour per day.
            </InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="text-left pr-2 font-normal text-muted-foreground w-10" />
                  {HOURS.map((h) => (
                    <th key={h} className="text-center font-normal text-muted-foreground pb-1" style={{ minWidth: 28 }}>
                      {h % 3 === 0 ? fmtHour(h) : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, dow) => (
                  <tr key={dow}>
                    <td className="pr-2 text-muted-foreground text-right py-0.5">{day}</td>
                    {HOURS.map((h) => {
                      const count = cellMap.get(`${dow}:${h}`) ?? 0;
                      const color = heatColor(count, data.maxVal);
                      return (
                        <td key={h} className="p-0.5" title={`${day} ${fmtHour(h)} — ${count} msg`}>
                          <div
                            className="rounded"
                            style={{ width: 24, height: 18, background: color }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span>Less</span>
            {["#f1f5f9", "#e0e7ff", "#a5b4fc", "#818cf8", "#6366f1", "#4338ca"].map((c) => (
              <div key={c} className="w-5 h-3 rounded" style={{ background: c }} />
            ))}
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Hour breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">By hour of day (UTC)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
            {[
              { label: "Morning (6am–12pm)", hours: [6, 7, 8, 9, 10, 11] },
              { label: "Afternoon (12pm–6pm)", hours: [12, 13, 14, 15, 16, 17] },
              { label: "Evening (6pm–12am)", hours: [18, 19, 20, 21, 22, 23] },
              { label: "Night (12am–6am)", hours: [0, 1, 2, 3, 4, 5] },
            ].map(({ label, hours }) => {
              const total = hours.reduce((s, h) => {
                return s + DAYS.reduce((ds, _, d) => ds + (cellMap.get(`${d}:${h}`) ?? 0), 0);
              }, 0);
              const max = 1000; // relative bar just for UX
              return (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className="w-44 text-muted-foreground shrink-0">{label}</span>
                  <div className="flex-1 bg-muted h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full"
                      style={{ width: `${Math.min((total / (max || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right">{total}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
