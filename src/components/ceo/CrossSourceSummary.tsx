import { Youtube, MessageSquare, Github, AlertTriangle } from "lucide-react";
import { useCeoInsights } from "@/hooks/useCeoInsights";

function fmt(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

function SummaryCard({
  icon,
  title,
  rows,
  footer,
  riskFlag,
}: {
  icon: React.ReactNode;
  title: string;
  rows: Array<{ label: string; value: string }>;
  footer?: string;
  riskFlag?: string | null;
}) {
  return (
    <article className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <dl className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-2">
            <dt className="text-[11px] text-muted-foreground">{r.label}</dt>
            <dd className="text-right text-xs font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
      {riskFlag && (
        <p className="mt-3 flex items-start gap-1.5 rounded-md bg-red-500/5 px-2 py-1.5 text-[11px] text-red-600 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {riskFlag}
        </p>
      )}
      {footer && (
        <p className="mt-3 border-t border-[hsl(var(--border))] pt-2 text-[11px] leading-relaxed text-foreground/75">
          {footer}
        </p>
      )}
    </article>
  );
}

// Section C — one AI-generated summary card per source for the selected period
// (same edge function as the Insights Feed; separate summaries prompt).
export default function CrossSourceSummary({
  startupId,
  periodDays,
}: {
  startupId: string | undefined;
  periodDays: 7 | 15 | 30;
}) {
  const { data, isLoading } = useCeoInsights(startupId, periodDays);
  const s = data?.summaries;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40" />
        ))}
      </div>
    );
  }
  if (!s) {
    return (
      <p className="rounded-lg border border-dashed border-[hsl(var(--border))] p-4 text-center text-xs text-muted-foreground">
        Source summaries appear here once insights are generated.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <SummaryCard
        icon={<Youtube className="h-4 w-4 text-red-600" />}
        title={`YouTube · ${periodDays}d`}
        rows={[
          { label: "Total views", value: fmt(s.youtube?.total_views) },
          { label: "Top video", value: s.youtube?.top_video ?? "—" },
          { label: "Fastest-growing channel", value: s.youtube?.channel_with_most_growth ?? "—" },
        ]}
        footer={s.youtube?.recommendation}
      />
      <SummaryCard
        icon={<MessageSquare className="h-4 w-4 text-[#4A154B] dark:text-purple-300" />}
        title={`Slack · ${periodDays}d`}
        rows={[
          {
            label: "Attendance rate",
            value: s.slack?.attendance_rate_pct != null ? `${s.slack.attendance_rate_pct}%` : "—",
          },
          { label: "Most active channel", value: s.slack?.most_active_channel ?? "—" },
          { label: "Most check-ins", value: s.slack?.top_checkin_person ?? "—" },
          { label: "Trend", value: s.slack?.trend ?? "—" },
        ]}
        riskFlag={s.slack?.risk_flag ?? null}
      />
      <SummaryCard
        icon={<Github className="h-4 w-4" />}
        title={`GitHub · ${periodDays}d`}
        rows={[
          { label: "Total commits", value: fmt(s.github?.total_commits) },
          { label: "PRs merged", value: fmt(s.github?.prs_merged) },
          { label: "Most active", value: s.github?.most_active_contributor ?? "—" },
          {
            label: "Dormant repos",
            value: s.github?.dormant_repos?.length ? String(s.github.dormant_repos.length) : "0",
          },
        ]}
        footer={s.github?.code_health}
      />
    </div>
  );
}
