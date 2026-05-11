import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, GitPullRequest, RefreshCw, Zap, AlertCircle, CheckCircle2, Clock, Settings } from "lucide-react";
import { useStartups } from "@/hooks/useStartups";
import {
  useConnectorCredentials,
  useOpenPRs,
  useRecentMergedPRs,
  useMetrics,
  useKaiInsights,
  useTriggerSync,
  useDismissInsight,
} from "@/hooks/useConnectors";
import type { KaiInsight, GithubRecord } from "@/connectors/types";
import { toast } from "sonner";
import ConnectorSetupModal from "@/components/tech/ConnectorSetupModal";

// ─── helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function stateColor(state: string | null) {
  if (state === "open") return "text-emerald-600";
  if (state === "merged") return "text-purple-600";
  if (state === "closed") return "text-muted-foreground";
  return "text-muted-foreground";
}

// ─── sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub }: { label: string; value: number | null; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold tabular-nums">{value ?? "—"}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function PRRow({ pr }: { pr: GithubRecord }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0">
      <GitPullRequest className={`mt-0.5 h-4 w-4 shrink-0 ${stateColor(pr.state)}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug truncate">{pr.title ?? "Untitled PR"}</p>
        <p className="text-xs text-muted-foreground">
          {pr.repo_name} · {pr.author_login ?? "unknown"} · {relativeTime(pr.updated_at_source ?? pr.created_at_source)}
        </p>
      </div>
      {pr.labels.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-end">
          {pr.labels.slice(0, 2).map((l) => (
            <Badge key={l} variant="secondary" className="text-[10px] px-1.5 py-0">{l}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight, onDismiss }: { insight: KaiInsight; onDismiss: () => void }) {
  const iconMap: Record<string, typeof AlertCircle> = {
    risk: AlertCircle,
    opportunity: CheckCircle2,
    action: Zap,
    prediction: Clock,
    summary: CheckCircle2,
  };
  const Icon = iconMap[insight.insight_type] ?? Zap;
  const colorMap: Record<string, string> = {
    risk: "text-red-500",
    opportunity: "text-emerald-500",
    action: "text-amber-500",
    prediction: "text-blue-500",
    summary: "text-muted-foreground",
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${colorMap[insight.insight_type] ?? "text-muted-foreground"}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">
            {insight.insight_type}
          </span>
          {insight.confidence && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{insight.confidence}</Badge>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          dismiss
        </button>
      </div>
      {insight.title && <p className="text-sm font-semibold">{insight.title}</p>}
      <p className="text-sm text-muted-foreground leading-relaxed">{insight.body}</p>
      <p className="text-[10px] text-muted-foreground">{relativeTime(insight.generated_at)}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TechDashboard() {
  const navigate = useNavigate();
  const [setupOpen, setSetupOpen] = useState(false);

  const { dbStartups } = useStartups();
  const nasheedio = dbStartups.find((s) => s.slug === "nasheedio");
  const startupId = nasheedio?.id;

  const { data: credentials = [] } = useConnectorCredentials(startupId);
  const githubCred = credentials.find((c) => c.connector_type === "github");
  const slackCred = credentials.find((c) => c.connector_type === "slack");

  const { data: openPRs = [], isLoading: loadingPRs } = useOpenPRs(startupId);
  const { data: mergedPRs = [] } = useRecentMergedPRs(startupId);
  const { data: metrics = [] } = useMetrics(startupId, "tech");
  const { data: insights = [] } = useKaiInsights(startupId, "tech");

  const triggerSync = useTriggerSync();
  const dismissInsight = useDismissInsight();

  const openPRCount = metrics.find((m) => m.metric_name === "open_prs")?.metric_value ?? openPRs.length;
  const mergedCount = metrics.find((m) => m.metric_name === "merged_prs_7d")?.metric_value ?? mergedPRs.length;
  const contributors = metrics.find((m) => m.metric_name === "active_contributors_7d")?.metric_value ?? null;

  const hasGitHub = !!githubCred;
  const hasSlack = !!slackCred;

  const handleSync = async (type: "github" | "slack") => {
    if (!startupId) return;
    triggerSync.mutate(
      { startupId, connectorType: type },
      {
        onSuccess: (d) => toast.success(`Synced ${d.recordsUpserted} records`),
        onError: (e: any) => toast.error(e.message ?? "Sync failed"),
      }
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/50 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Tech Department</h1>
          <p className="text-xs text-muted-foreground">Nasheedio · Internal tools & web systems</p>
        </div>
        <div className="flex items-center gap-2">
          {hasGitHub && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSync("github")}
              disabled={triggerSync.isPending}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${triggerSync.isPending ? "animate-spin" : ""}`} />
              Sync GitHub
            </Button>
          )}
          {hasSlack && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSync("slack")}
              disabled={triggerSync.isPending}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${triggerSync.isPending ? "animate-spin" : ""}`} />
              Sync Slack
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSetupOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">
        {/* Connector status banner */}
        {!hasGitHub && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              GitHub is not connected. Add a Personal Access Token to start syncing PR and issue data.
            </p>
            <Button size="sm" variant="outline" onClick={() => setSetupOpen(true)}>
              Connect
            </Button>
          </div>
        )}

        {/* KPIs */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            This week
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Open PRs" value={openPRCount as number} sub="across all repos" />
            <MetricCard label="Merged PRs (7d)" value={mergedCount as number} sub="closed this week" />
            <MetricCard label="Active contributors" value={contributors} sub="in last 7 days" />
          </div>
        </div>

        <Separator />

        {/* Two-column layout: PRs + KAI insights */}
        <div className="grid grid-cols-[1fr_340px] gap-6">
          {/* Open PRs */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Open pull requests
            </h2>
            <div className="rounded-xl border border-border/50 bg-card p-4">
              {loadingPRs && (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
              )}
              {!loadingPRs && openPRs.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {hasGitHub ? "No open PRs right now — sync to refresh" : "Connect GitHub to see PRs"}
                </p>
              )}
              {openPRs.map((pr) => <PRRow key={pr.id} pr={pr} />)}
            </div>

            {mergedPRs.length > 0 && (
              <>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-5 mb-3">
                  Merged this week
                </h2>
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  {mergedPRs.map((pr) => <PRRow key={pr.id} pr={pr} />)}
                </div>
              </>
            )}
          </div>

          {/* KAI insights sidebar */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                KAI insights
              </h2>
              {githubCred?.last_synced_at && (
                <span className="text-[10px] text-muted-foreground">
                  Last sync {relativeTime(githubCred.last_synced_at)}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {insights.length === 0 && (
                <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No insights yet. Insights are generated after the first sync.
                  </p>
                </div>
              )}
              {insights.map((ins) => (
                <InsightCard
                  key={ins.id}
                  insight={ins}
                  onDismiss={() =>
                    startupId && dismissInsight.mutate({ insightId: ins.id, startupId })
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConnectorSetupModal
        open={setupOpen}
        onOpenChange={setSetupOpen}
        startupId={startupId ?? ""}
        existingCredentials={credentials}
      />
    </div>
  );
}
