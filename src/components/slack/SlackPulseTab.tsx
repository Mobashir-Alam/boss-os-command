import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, MessageSquare, Users, Heart, CornerDownRight } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import InfoTooltip from "@/components/social/InfoTooltip";
import type { SlackPulseSnapshot, SlackKpi } from "@/hooks/useSlack";

const METRIC_HELP: Record<string, string> = {
  messages: "Total messages posted across all channels in the period (excludes bots and system messages).",
  active_users: "Unique members who posted at least one message. Summed across channels — one person active in 3 channels counts 3× here.",
  reactions: "Total emoji reactions given. High reactions indicate content resonating with the team.",
  replies: "Total thread reply counts. A high reply-to-message ratio suggests engaged, back-and-forth conversation.",
};

const KPI_ICONS: Record<string, React.ReactNode> = {
  messages: <MessageSquare className="w-4 h-4" />,
  active_users: <Users className="w-4 h-4" />,
  reactions: <Heart className="w-4 h-4" />,
  replies: <CornerDownRight className="w-4 h-4" />,
};

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function DeltaChip({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct > 0;
  const flat = pct === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded",
        flat ? "bg-gray-100 text-gray-500" : up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
      )}
    >
      {flat ? <Minus className="w-3 h-3" /> : up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {flat ? "0%" : `${up ? "+" : ""}${pct}%`}
    </span>
  );
}

function KpiCard({ kpi }: { kpi: SlackKpi }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
          {KPI_ICONS[kpi.key]}
          {kpi.label}
          <InfoTooltip size="xs">{METRIC_HELP[kpi.key]}</InfoTooltip>
        </div>
        <DeltaChip pct={kpi.delta_pct} />
      </div>
      <div className="text-2xl font-bold">{fmtNum(kpi.value)}</div>
      <div className="text-xs text-muted-foreground">
        Baseline {fmtNum(kpi.baseline)}
      </div>
      {kpi.series.length > 1 && (
        <div className="h-12 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={kpi.series}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={1.5}
                dot={false}
              />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="bg-white border rounded shadow-sm text-xs px-2 py-1">
                      <div className="text-muted-foreground">{label}</div>
                      <div className="font-semibold">{fmtNum(payload[0].value as number)}</div>
                    </div>
                  ) : null
                }
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

interface Props {
  snapshot: SlackPulseSnapshot | undefined;
  isLoading: boolean;
  baselineDays: 7 | 28;
  onBaselineChange: (d: 7 | 28) => void;
}

export default function SlackPulseTab({ snapshot, isLoading, baselineDays, onBaselineChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Pulse</h2>
          <p className="text-sm text-muted-foreground">14-day activity vs baseline</p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-md p-1">
          {([7, 28] as const).map((d) => (
            <button
              key={d}
              onClick={() => onBaselineChange(d)}
              className={cn(
                "px-3 py-1 text-xs rounded font-medium transition-colors",
                baselineDays === d
                  ? "bg-white shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {d}d baseline
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {snapshot?.kpis.map((kpi) => <KpiCard key={kpi.key} kpi={kpi} />)}
        </div>
      )}

      {/* Anomalies */}
      {!isLoading && (snapshot?.anomalies?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              What&apos;s unusual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {snapshot!.anomalies.map((a, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="font-medium text-muted-foreground shrink-0">#{a.channel}</span>
                <span>{a.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!isLoading && !snapshot?.kpis.length && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No data yet — click "Sync Slack" to load analytics.
        </div>
      )}
    </div>
  );
}
