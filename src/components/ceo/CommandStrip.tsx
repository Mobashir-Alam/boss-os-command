import { Youtube, MessageSquare, Github, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import SparkLine from "@/components/SparkLine";
import { useCeoCommandStrip } from "@/hooks/useCeoCommandStrip";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function DeltaChip({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        up
          ? "bg-emerald-500/10 text-emerald-600"
          : "bg-red-500/10 text-red-500"
      )}
    >
      {up ? "+" : ""}
      {pct}%
    </span>
  );
}

function Tile({
  icon,
  label,
  value,
  deltaPct,
  spark,
  sparkColor,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  deltaPct?: number | null;
  spark?: number[];
  sparkColor?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--muted))]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tabular-nums leading-tight">{value}</span>
          {deltaPct !== undefined && <DeltaChip pct={deltaPct} />}
        </div>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
      {spark && spark.length > 1 && (
        <div className="hidden h-8 w-20 shrink-0 sm:block">
          <SparkLine data={spark} color={sparkColor ?? "hsl(var(--primary))"} width={80} height={32} />
        </div>
      )}
    </div>
  );
}

// Section A — thin row of four live tiles at the very top of the CEO dashboard.
export default function CommandStrip({ startupId }: { startupId: string | undefined }) {
  const { data, isLoading } = useCeoCommandStrip(startupId);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[68px] animate-pulse rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        icon={<Youtube className="h-4 w-4 text-red-600" />}
        label="YouTube views · 7d"
        value={fmt(data.youtubeViews7d.value)}
        deltaPct={data.youtubeViews7d.deltaPct}
        spark={data.youtubeViews7d.spark}
        sparkColor="hsl(var(--signal-critical))"
      />
      <Tile
        icon={<MessageSquare className="h-4 w-4 text-[#4A154B] dark:text-purple-300" />}
        label="Checked in today"
        value={
          data.slackAttendanceTodayPct.value !== null
            ? `${data.slackAttendanceTodayPct.value}%`
            : "—"
        }
        sub={`${data.slackAttendanceTodayPct.checkedIn}/${data.slackAttendanceTodayPct.roster} people`}
        spark={data.slackAttendanceTodayPct.spark}
        sparkColor="hsl(var(--signal-warning))"
      />
      <Tile
        icon={<Github className="h-4 w-4" />}
        label="Commits · 7d"
        value={fmt(data.githubCommits7d.value)}
        deltaPct={data.githubCommits7d.deltaPct}
        spark={data.githubCommits7d.spark}
        sparkColor="hsl(var(--signal-positive))"
      />
      <Tile
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
        label="Active employees · 7d"
        value={String(data.activeEmployees7d.value)}
        sub="any check-in this week"
      />
    </div>
  );
}
