import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, GitCommit, GitPullRequest, GitMerge,
  Users, FolderGit2, Hash, Clock, Moon, ShieldAlert,
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, CartesianGrid, Legend,
} from "recharts";
import InfoTooltip from "@/components/social/InfoTooltip";
import type { GitHubOverview, GitHubKpi, GitHubRepo, OpenPR } from "@/hooks/useGitHub";

const HELP: Record<string, string> = {
  commits: "Commits to default branches in the last 14 days. Activity signal, not a productivity score.",
  prs_merged: "Pull requests merged in the last 14 days — closer to 'shipped work'.",
  prs_opened: "Pull requests opened — work entering review.",
  active: "Distinct people with at least one commit in the last 14 days.",
};
const ICON: Record<string, React.ReactNode> = {
  commits: <GitCommit className="w-4 h-4" />,
  prs_merged: <GitMerge className="w-4 h-4" />,
  prs_opened: <GitPullRequest className="w-4 h-4" />,
  active: <Users className="w-4 h-4" />,
};

function windowLabel(d: number) { return d >= 365 ? "all time" : `${d}d`; }

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
        <div className="h-10 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={kpi.series}>
              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function StatCard({ icon, label, value, tone, help }: { icon: React.ReactNode; label: string; value: number | string; tone?: string; help?: string }) {
  return (
    <Card className="p-4">
      <div className={cn("flex items-center gap-1.5 text-sm", tone ?? "text-muted-foreground")}>
        {icon}{label}{help && <InfoTooltip size="xs">{help}</InfoTooltip>}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}

function BarRow({ name, value, max, sub }: { name: string; value: number; max: number; sub?: string }) {
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate">{name}</span>
          <span className="text-sm font-semibold shrink-0 ml-2">{value.toLocaleString()}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

interface Props {
  data: GitHubOverview | undefined;
  isLoading: boolean;
  baselineDays: 7 | 28;
  onBaselineChange: (d: 7 | 28) => void;
  repos: GitHubRepo[] | undefined;
  focus: { openPrs: OpenPR[]; stale_count: number } | undefined;
  windowDays: number;
}

export default function GitHubOverviewTab({ data, isLoading, baselineDays, onBaselineChange, repos, focus, windowDays }: Props) {
  const activeRepos = (repos ?? []).filter((r) => r.active);
  const busFactor = (repos ?? []).filter((r) => r.bus_factor_risk);
  const dormant = (repos ?? []).filter((r) => !r.active && !r.is_archived);
  const topRepos = activeRepos.slice(0, 6);
  const win = windowLabel(windowDays);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">Headline KPIs vs baseline · trend &amp; breakdowns over {win}</p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-md p-1">
          {([7, 28] as const).map((d) => (
            <button key={d} type="button" onClick={() => onBaselineChange(d)}
              className={cn("px-3 py-1 text-xs rounded font-medium transition-colors",
                baselineDays === d ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {d}d baseline
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {data?.kpis.map((k) => <KpiCard key={k.key} kpi={k} />)}
            <StatCard icon={<FolderGit2 className="w-4 h-4" />} label="Active repos" value={activeRepos.length}
              help={`Repos with commits/PRs in the selected window (${win}).`} />
            <StatCard icon={<GitPullRequest className="w-4 h-4" />} label="Open PRs" value={focus?.openPrs.length ?? 0}
              tone={(focus?.stale_count ?? 0) > 0 ? "text-amber-600" : undefined}
              help="Pull requests currently open across the org." />
          </div>

          {/* Activity trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                Activity trend — {win}
                <InfoTooltip size="xs">Daily commits (area) and merged PRs (line) over the selected window. The shape tells you if the team is accelerating or slowing.</InfoTooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.series.length ?? 0) > 1 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data!.series} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="commitsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => String(d).slice(5)} minTickGap={24} />
                      <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                        <div className="bg-white border rounded shadow-sm text-xs px-2 py-1.5">
                          <div className="text-muted-foreground mb-0.5">{label}</div>
                          {payload.map((p) => <div key={p.name} className="font-medium">{p.name}: {p.value as number}</div>)}
                        </div>
                      ) : null} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="commits" name="Commits" stroke="#6366f1" strokeWidth={2} fill="url(#commitsFill)" />
                      <Line type="monotone" dataKey="prs_merged" name="PRs merged" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">Not enough data for a trend yet.</div>
              )}
            </CardContent>
          </Card>

          {/* Where effort's going */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                Where effort's going <span className="text-xs font-normal text-muted-foreground">({win})</span>
                <InfoTooltip size="xs">Repos with the most commits over the window — where the team is actually spending time. Full list in the Repos tab.</InfoTooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topRepos.length > 0 ? topRepos.map((r) => (
                <BarRow key={r.repo_name} name={r.repo_name} value={r.commits} max={topRepos[0].commits}
                  sub={`${r.contributors} contributor${r.contributors === 1 ? "" : "s"}${r.bus_factor_risk ? " · bus-factor risk" : ""}`} />
              )) : <p className="text-sm text-muted-foreground py-4 text-center">No repo activity in this window.</p>}
            </CardContent>
          </Card>

          {/* Risk strip */}
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" /> Risk & health
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Clock className="w-4 h-4" />} label="Stuck PRs (≥7d)" value={focus?.stale_count ?? 0}
                tone={(focus?.stale_count ?? 0) > 0 ? "text-red-500" : undefined}
                help="Open PRs sitting a week or more — likely blocked on review." />
              <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Bus-factor repos" value={busFactor.length}
                tone={busFactor.length > 0 ? "text-red-500" : undefined}
                help="Active repos where one person owns ≥80% of commits — key-person risk." />
              <StatCard icon={<Moon className="w-4 h-4" />} label="Dormant repos" value={dormant.length}
                help="Repos with no activity in the window (excludes archived)." />
              <StatCard icon={<Hash className="w-4 h-4" />} label="Top-3 commit share"
                value={data?.concentration.top3_share_pct != null ? `${data.concentration.top3_share_pct}%` : "—"}
                tone={(data?.concentration.top3_share_pct ?? 0) >= 80 ? "text-amber-600" : undefined}
                help="Share of all commits from the top 3 people. High = output concentrated in few hands." />
            </div>
          </div>

          {/* Anomalies */}
          {(data?.anomalies.length ?? 0) > 0 && (
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

          {!data?.kpis.length && (
            <div className="text-center py-16 text-muted-foreground text-sm">No data yet — click "Sync GitHub".</div>
          )}
        </>
      )}
    </div>
  );
}
