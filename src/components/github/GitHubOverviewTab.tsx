import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, GitCommit, GitPullRequest, GitMerge, Users } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import InfoTooltip from "@/components/social/InfoTooltip";
import type { GitHubKpi } from "@/hooks/useGitHub";

const HELP: Record<string, string> = {
  commits: "Commits to default branches across active repos in the window. A rough activity signal — not a productivity score.",
  prs_merged: "Pull requests merged in the window — closer to 'shipped work' than raw commits.",
  prs_opened: "Pull requests opened — work entering review.",
  active: "Distinct people with at least one commit in the window.",
};
const ICON: Record<string, React.ReactNode> = {
  commits: <GitCommit className="w-4 h-4" />,
  prs_merged: <GitMerge className="w-4 h-4" />,
  prs_opened: <GitPullRequest className="w-4 h-4" />,
  active: <Users className="w-4 h-4" />,
};

function Delta({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct > 0, flat = pct === 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded",
      flat ? "bg-gray-100 text-gray-500" : up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600")}>
      {flat ? <Minus className="w-3 h-3" /> : up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {flat ? "0%" : `${up ? "+" : ""}${pct}%`}
    </span>
  );
}

function KpiCard({ kpi }: { kpi: GitHubKpi }) {
  return (
    <Card className="p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {ICON[kpi.key]}{kpi.label}
          <InfoTooltip size="xs">{HELP[kpi.key]}</InfoTooltip>
        </div>
        <Delta pct={kpi.delta_pct} />
      </div>
      <div className="text-2xl font-bold">{kpi.value.toLocaleString()}</div>
      <div className="text-xs text-muted-foreground">Baseline {kpi.baseline.toLocaleString()}</div>
      {kpi.series.length > 1 && (
        <div className="h-12 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={kpi.series}>
              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={1.5} dot={false} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white border rounded shadow-sm text-xs px-2 py-1">
                  <div className="text-muted-foreground">{label}</div>
                  <div className="font-semibold">{payload[0].value as number}</div>
                </div>) : null} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

interface Props {
  data: { kpis: GitHubKpi[]; anomalies: { who: string; message: string }[] } | undefined;
  isLoading: boolean;
  baselineDays: 7 | 28;
  onBaselineChange: (d: 7 | 28) => void;
}

export default function GitHubOverviewTab({ data, isLoading, baselineDays, onBaselineChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">Last 14 days vs baseline</p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-md p-1">
          {([7, 28] as const).map((d) => (
            <button key={d} onClick={() => onBaselineChange(d)}
              className={cn("px-3 py-1 text-xs rounded font-medium transition-colors",
                baselineDays === d ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {d}d baseline
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{data?.kpis.map((k) => <KpiCard key={k.key} kpi={k} />)}</div>
      )}

      {!isLoading && (data?.anomalies.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> What&apos;s unusual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data!.anomalies.map((a, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="font-medium text-muted-foreground shrink-0">{a.who}</span>
                <span>{a.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!isLoading && !data?.kpis.length && (
        <div className="text-center py-16 text-muted-foreground text-sm">No data yet — click "Sync GitHub".</div>
      )}
    </div>
  );
}
