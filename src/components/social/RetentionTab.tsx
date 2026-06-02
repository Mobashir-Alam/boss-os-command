import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Activity, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine,
} from "recharts";
import { useRetentionCurves, type VideoRetentionCurve } from "@/hooks/useYouTube";

interface Props {
  startupId: string;
  channelFilterUuid: string | null;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtPct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

function fmtDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type SortKey = "views" | "avg_retention" | "mid_retention" | "relative_perf";

const SORT_LABEL: Record<SortKey, string> = {
  views: "Views (highest first)",
  avg_retention: "Avg retention (highest)",
  mid_retention: "Mid-video hold (highest)",
  relative_perf: "Performance vs YouTube avg",
};

// Heuristic: color a curve card by how its avg retention compares to the
// global avg across the visible set
function retentionTone(avg: number, mean: number): "good" | "ok" | "bad" {
  if (avg > mean * 1.15) return "good";
  if (avg < mean * 0.85) return "bad";
  return "ok";
}

export default function RetentionTab({ startupId, channelFilterUuid }: Props) {
  const { data: curves = [], isLoading } = useRetentionCurves(startupId, channelFilterUuid);
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const arr = [...curves];
    arr.sort((a, b) => {
      switch (sortKey) {
        case "views":          return b.view_count - a.view_count;
        case "avg_retention":  return b.avg_audience_watch_ratio - a.avg_audience_watch_ratio;
        case "mid_retention":  return (b.retention_at_50pct ?? 0) - (a.retention_at_50pct ?? 0);
        case "relative_perf":  return (b.avg_relative_performance ?? 0) - (a.avg_relative_performance ?? 0);
      }
    });
    return arr;
  }, [curves, sortKey]);

  const meanRetention = useMemo(() => {
    if (curves.length === 0) return 0;
    return curves.reduce((acc, c) => acc + c.avg_audience_watch_ratio, 0) / curves.length;
  }, [curves]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
      </div>
    );
  }

  if (curves.length === 0) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">No retention curves for this scope yet.</p>
            <p className="text-muted-foreground mt-0.5">
              Retention is pulled for the top 25 videos by views during analytics
              sync. Click <b>Sync analytics</b> on the header. Shorts and very
              low-watch videos typically don't get curves from YouTube.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-sm">
            <span className="font-semibold">{curves.length}</span>{" "}
            <span className="text-muted-foreground">video{curves.length === 1 ? "" : "s"} with retention data · </span>
            <span className="text-muted-foreground">cohort avg </span>
            <span className="font-semibold tabular-nums">{fmtPct(meanRetention, 1)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Sort</p>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-8 w-[220px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>{SORT_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cohort orientation strip */}
      <p className="text-[11px] text-muted-foreground">
        Each card shows the % of the original audience still watching at each point in the video.
        Steeper drops = worse hooks. Colored by retention vs the cohort average.
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((c) => (
          <CurveCard
            key={c.video_uuid}
            curve={c}
            cohortMean={meanRetention}
            onExpand={() => setExpanded(c.video_uuid)}
          />
        ))}
      </div>

      {/* Detail modal-ish overlay */}
      {expanded && (
        <DetailDialog
          curve={sorted.find((c) => c.video_uuid === expanded)!}
          onClose={() => setExpanded(null)}
        />
      )}
    </div>
  );
}

/* ──────── small components ──────── */

function CurveCard({
  curve, cohortMean, onExpand,
}: {
  curve: VideoRetentionCurve;
  cohortMean: number;
  onExpand: () => void;
}) {
  const tone = retentionTone(curve.avg_audience_watch_ratio, cohortMean);
  const stroke =
    tone === "good" ? "rgb(16 185 129)"
    : tone === "bad"  ? "rgb(239 68 68)"
    : "rgb(59 130 246)";

  const data = curve.points.map((p) => ({
    x: p.elapsed_ratio,
    y: p.audience_watch_ratio,
  }));

  return (
    <button
      onClick={onExpand}
      className={cn(
        "text-left rounded-xl border bg-card hover:bg-muted/10 transition overflow-hidden",
        tone === "good" ? "border-emerald-500/30"
        : tone === "bad" ? "border-red-500/30"
        : "border-border/50"
      )}
    >
      {/* Thumbnail strip */}
      <div className="relative aspect-video bg-muted">
        {curve.thumbnail_url ? (
          <img
            src={curve.thumbnail_url}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : null}
        <Badge className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] tabular-nums">
          {fmtNum(curve.view_count)} views
        </Badge>
        {curve.duration_seconds != null && (
          <Badge className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] tabular-nums">
            {fmtDuration(curve.duration_seconds)}
          </Badge>
        )}
      </div>

      <div className="p-3 space-y-2">
        <p className="text-xs font-semibold line-clamp-2 leading-snug">{curve.video_title ?? "Untitled"}</p>
        <p className="text-[10px] text-muted-foreground truncate">{curve.channel_title ?? "—"}</p>

        {/* Curve */}
        <div className="h-20 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="x" hide domain={[0, 1]} type="number" />
              <YAxis hide domain={[0, "auto"]} />
              <ReferenceLine y={1} stroke="rgb(148 163 184)" strokeDasharray="2 2" strokeOpacity={0.5} />
              <Line type="monotone" dataKey="y" stroke={stroke} strokeWidth={1.75} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Inline stats */}
        <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
          <Stat label="Start" value={fmtPct(curve.points[0]?.audience_watch_ratio ?? 0)} />
          <Stat label="Mid" value={curve.retention_at_50pct != null ? fmtPct(curve.retention_at_50pct) : "—"} />
          <Stat label="End" value={fmtPct(curve.points[curve.points.length - 1]?.audience_watch_ratio ?? 0)} />
        </div>
        <div className="flex items-center justify-between pt-0.5 text-[10px]">
          <span className="text-muted-foreground">
            Avg <span className="font-semibold tabular-nums text-foreground">{fmtPct(curve.avg_audience_watch_ratio, 1)}</span>
          </span>
          {curve.avg_relative_performance != null && (
            <PerformanceChip value={curve.avg_relative_performance} />
          )}
        </div>
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/30 bg-muted/10 py-0.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none mt-0.5">{label}</p>
      <p className="text-xs font-semibold tabular-nums leading-tight">{value}</p>
    </div>
  );
}

function PerformanceChip({ value }: { value: number }) {
  // relative_retention_performance is reported by YouTube as 0–1, where 0.5
  // means "average vs comparable videos". Map to a familiar +/- delta.
  const delta = (value - 0.5) * 2; // -1 to +1
  const pct = delta * 100;
  const isUp = pct >= 0;
  const cls = Math.abs(pct) < 3
    ? "text-muted-foreground bg-muted/30 border-border/40"
    : isUp ? "text-emerald-700 bg-emerald-500/15 border-emerald-500/30"
           : "text-red-700 bg-red-500/15 border-red-500/30";
  const Icon = Math.abs(pct) < 3 ? Minus : isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <Badge variant="outline" className={cn("h-4 px-1 gap-0.5 text-[10px] tabular-nums", cls)}>
      <Icon className="h-2.5 w-2.5" />
      {Math.abs(pct) < 1 ? "0%" : `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`}
      <span className="hidden sm:inline ml-0.5 font-normal opacity-70">vs YT avg</span>
    </Badge>
  );
}

function DetailDialog({
  curve, onClose,
}: { curve: VideoRetentionCurve; onClose: () => void }) {
  const data = curve.points.map((p) => ({
    x: p.elapsed_ratio,
    pct_label: `${(p.elapsed_ratio * 100).toFixed(0)}%`,
    y: p.audience_watch_ratio,
    rel: p.relative_retention_performance,
  }));
  const durSec = curve.duration_seconds ?? 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl rounded-xl bg-card border border-border/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 h-7 w-7 rounded-full bg-background/80 border border-border/40 flex items-center justify-center hover:bg-background"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-start gap-3 p-5 pb-3">
          {curve.thumbnail_url && (
            <img
              src={curve.thumbnail_url}
              alt=""
              referrerPolicy="no-referrer"
              className="w-32 aspect-video object-cover rounded-md border border-border/40 shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug line-clamp-2">
              {curve.video_title ?? "Untitled"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {curve.channel_title} · {fmtNum(curve.view_count)} views · {fmtDuration(curve.duration_seconds)}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] tabular-nums gap-1">
                Avg retention {fmtPct(curve.avg_audience_watch_ratio, 1)}
              </Badge>
              {curve.avg_relative_performance != null && <PerformanceChip value={curve.avg_relative_performance} />}
              <a
                href={`https://youtube.com/watch?v=${curve.video_id}`}
                target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-blue-600 hover:underline"
              >
                Open on YouTube ↗
              </a>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Audience retention by elapsed time
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={[0, 1]}
                  ticks={[0, 0.25, 0.5, 0.75, 1]}
                  tickFormatter={(v) =>
                    durSec > 0
                      ? `${Math.round(v * durSec)}s`
                      : `${(v * 100).toFixed(0)}%`
                  }
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                  tick={{ fontSize: 11 }}
                  domain={[0, "auto"]}
                  width={42}
                />
                <Tooltip
                  formatter={(v: any, name) => {
                    if (name === "y") return [`${(Number(v) * 100).toFixed(1)}%`, "Audience"];
                    if (name === "rel" && v != null) return [`${(Number(v) * 100).toFixed(0)}%`, "vs YT avg"];
                    return [v, name];
                  }}
                  labelFormatter={(_v, payload: any) => {
                    const x = payload?.[0]?.payload?.x ?? 0;
                    if (durSec > 0) return `At ${Math.round(x * durSec)}s (${(x * 100).toFixed(0)}%)`;
                    return `At ${(x * 100).toFixed(0)}% of video`;
                  }}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <ReferenceLine y={1} stroke="rgb(148 163 184)" strokeDasharray="2 2" />
                <ReferenceLine y={0.5} stroke="rgb(148 163 184)" strokeDasharray="2 2" strokeOpacity={0.5} />
                <Line type="monotone" dataKey="y" stroke="rgb(59 130 246)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
