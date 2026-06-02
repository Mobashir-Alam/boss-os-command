import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye, Clock, DollarSign, UserPlus, ThumbsUp, MessageSquare,
  ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, Flame, TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import { usePulseSnapshot, type PulseMetricSnapshot, type PulseAnomaly } from "@/hooks/useYouTube";

interface Props {
  startupId: string;
  channelFilterUuid: string | null;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtMinutes(n: number): string {
  if (n >= 60_000) return `${(n / 60_000).toFixed(1)}M hrs`;
  if (n >= 60) return `${(n / 60).toFixed(1)} hrs`;
  return `${Math.round(n)} min`;
}

function deltaTone(pct: number): "up" | "down" | "flat" {
  if (Math.abs(pct) < 1) return "flat";
  return pct > 0 ? "up" : "down";
}

const METRIC_DEFS: Array<{
  key: keyof PulseMetricSnapshot;
  label: string;
  icon: any;
  format: (n: number) => string;
  // Whether a positive delta is "good"
  positiveIsGood: boolean;
}> = [
  { key: "views",                    label: "Views",       icon: Eye,           format: fmtNum,     positiveIsGood: true  },
  { key: "estimated_minutes_watched",label: "Watch time",  icon: Clock,         format: fmtMinutes, positiveIsGood: true  },
  { key: "estimated_revenue_usd",    label: "Revenue",     icon: DollarSign,    format: fmtMoney,   positiveIsGood: true  },
  { key: "subscribers_gained",       label: "Subs gained", icon: UserPlus,      format: fmtNum,     positiveIsGood: true  },
  { key: "likes",                    label: "Likes",       icon: ThumbsUp,      format: fmtNum,     positiveIsGood: true  },
  { key: "comments",                 label: "Comments",    icon: MessageSquare, format: fmtNum,     positiveIsGood: true  },
];

const METRIC_LABELS: Record<keyof PulseMetricSnapshot, string> = {
  views: "views",
  estimated_minutes_watched: "watch time",
  estimated_revenue_usd: "revenue",
  subscribers_gained: "subscribers gained",
  subscribers_lost: "subscribers lost",
  likes: "likes",
  comments: "comments",
  shares: "shares",
};

export default function PulseTab({ startupId, channelFilterUuid }: Props) {
  const [baselineDays, setBaselineDays] = useState<7 | 30>(7);
  const { data: pulse, isLoading } = usePulseSnapshot(startupId, channelFilterUuid, baselineDays);

  const sparkSeries = useMemo(() => {
    if (!pulse) return {} as Record<keyof PulseMetricSnapshot, Array<{ v: number }>>;
    const result = {} as Record<keyof PulseMetricSnapshot, Array<{ v: number }>>;
    for (const def of METRIC_DEFS) {
      result[def.key] = pulse.trend.map((p) => ({ v: (p as any)[def.key] as number }));
    }
    return result;
  }, [pulse]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!pulse || !pulse.latest_date) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">No analytics data yet for this scope.</p>
            <p className="text-muted-foreground mt-0.5">
              Authorize at least one channel and click <b>Sync analytics</b> to populate this view.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ymd = pulse.latest_date;
  let dateLabel = ymd;
  try { dateLabel = format(parseISO(ymd), "MMM d, yyyy"); } catch { /* keep ymd */ }

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Most recent reported day
          </p>
          <p className="text-sm font-semibold">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-muted-foreground">Baseline window</p>
          <div className="inline-flex rounded-md border border-border/50 bg-card overflow-hidden">
            {([7, 30] as const).map((n) => (
              <Button
                key={n}
                variant={baselineDays === n ? "default" : "ghost"}
                size="sm"
                onClick={() => setBaselineDays(n)}
                className="h-7 px-3 rounded-none text-xs"
              >
                {n}d
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {METRIC_DEFS.map((def) => {
          const cur = (pulse.current as any)[def.key] as number;
          const base = (pulse.baseline as any)[def.key] as number;
          const pct = (pulse.delta_pct as any)[def.key] as number;
          const tone = deltaTone(pct);
          const goodOrBad =
            tone === "flat" ? "flat" : (tone === "up") === def.positiveIsGood ? "good" : "bad";
          const Icon = def.icon;
          const points = sparkSeries[def.key] ?? [];
          return (
            <Card key={def.key} className="border-border/60">
              <CardContent className="p-3.5">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  <span className="text-[10px] uppercase tracking-widest">{def.label}</span>
                </div>
                <p className="text-2xl font-bold tabular-nums mt-1.5">{def.format(cur)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <DeltaChip pct={pct} tone={goodOrBad} />
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    vs {def.format(base)}
                  </span>
                </div>
                <div className="h-8 mt-2 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={points}>
                      <YAxis hide domain={["auto", "auto"]} />
                      <Line
                        type="monotone"
                        dataKey="v"
                        stroke={
                          goodOrBad === "good" ? "rgb(16 185 129)"
                          : goodOrBad === "bad"  ? "rgb(239 68 68)"
                          : "rgb(148 163 184)"
                        }
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Anomalies */}
      {pulse.anomalies.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            What's unusual today
          </h3>
          <div className="space-y-2">
            {pulse.anomalies.map((a, idx) => (
              <AnomalyRow
                key={`${a.channel_uuid}-${a.metric}-${idx}`}
                anomaly={a}
                baselineDays={baselineDays}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty-state for anomalies */}
      {pulse.anomalies.length === 0 && !channelFilterUuid && (
        <Card className="border-border/40">
          <CardContent className="p-5 flex items-center gap-3">
            <Minus className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No channel-level anomalies — every channel is within ±50% of its {baselineDays}-day baseline.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DeltaChip({ pct, tone }: { pct: number; tone: "good" | "bad" | "flat" }) {
  const Icon = tone === "flat" ? Minus : pct > 0 ? ArrowUpRight : ArrowDownRight;
  const cls =
    tone === "good" ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
    : tone === "bad" ? "text-red-600 bg-red-500/10 border-red-500/20"
    : "text-muted-foreground bg-muted/50 border-border/40";
  return (
    <Badge variant="outline" className={cn("h-4 px-1 text-[10px] gap-0.5 font-medium tabular-nums", cls)}>
      <Icon className="h-2.5 w-2.5" />
      {Math.abs(pct) < 1 ? "0%" : `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`}
    </Badge>
  );
}

function AnomalyRow({ anomaly, baselineDays }: { anomaly: PulseAnomaly; baselineDays: number }) {
  const isUp = anomaly.delta_pct > 0;
  const Icon = isUp ? Flame : TrendingDown;
  const tone = isUp ? "text-amber-600 border-amber-500/30 bg-amber-500/10"
                    : "text-red-600 border-red-500/30 bg-red-500/10";
  const metricLabel = METRIC_LABELS[anomaly.metric];
  const isMoney = anomaly.metric === "estimated_revenue_usd";
  const fmt = (n: number) =>
    isMoney ? fmtMoney(n) : anomaly.metric === "estimated_minutes_watched" ? fmtMinutes(n) : fmtNum(n);
  return (
    <Card className={cn("border", tone.replace("text-", "border-").replace(/\sbg-.*$/, ""))}>
      <CardContent className="p-3.5 flex items-center gap-3">
        {anomaly.channel_thumbnail ? (
          <img
            src={anomaly.channel_thumbnail}
            alt=""
            referrerPolicy="no-referrer"
            className="h-10 w-10 rounded-full shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-semibold">{anomaly.channel_title ?? "Unknown channel"}</span>{" "}
            <span className="text-muted-foreground">{metricLabel}</span>{" "}
            <span className={cn("font-semibold tabular-nums", isUp ? "text-amber-600" : "text-red-600")}>
              {isUp ? "spiked" : "dropped"} {Math.abs(anomaly.delta_pct).toFixed(0)}%
            </span>{" "}
            <span className="text-muted-foreground">vs {baselineDays}-day baseline</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
            {fmt(anomaly.current)} today · {fmt(anomaly.baseline)} avg
          </p>
        </div>
        <Icon className={cn("h-5 w-5 shrink-0", isUp ? "text-amber-600" : "text-red-600")} />
      </CardContent>
    </Card>
  );
}
