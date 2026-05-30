import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Eye, Clock, IndianRupee, TrendingUp, Users, MousePointerClick, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChannelAnalytics, type ChannelAnalyticsRow, type YouTubeChannel } from "@/hooks/useYouTube";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
} from "recharts";

interface Props {
  channel: YouTubeChannel;
  isAuthorized: boolean;
  days?: number;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtUSD(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function fmtMinutes(min: number): string {
  if (min >= 1440) return `${(min / 1440).toFixed(1)}d`;
  if (min >= 60) return `${(min / 60).toFixed(1)}h`;
  return `${Math.round(min)}m`;
}

export default function ChannelAnalyticsPanel({ channel, isAuthorized, days = 30 }: Props) {
  const { data: rows = [], isLoading } = useChannelAnalytics(channel.id, days);

  // 30-day aggregates
  const totals = useMemo(() => {
    const t = {
      views: 0,
      watch_min: 0,
      revenue: 0,
      subs_gained: 0,
      subs_lost: 0,
      ctr_sum: 0,
      ctr_count: 0,
      has_revenue: false,
      has_ctr: false,
    };
    rows.forEach((r) => {
      t.views += r.views;
      t.watch_min += r.estimated_minutes_watched;
      if (r.estimated_revenue_usd != null) {
        t.revenue += r.estimated_revenue_usd;
        t.has_revenue = true;
      }
      t.subs_gained += r.subscribers_gained;
      t.subs_lost += r.subscribers_lost;
      if (r.impressions_ctr != null) {
        t.ctr_sum += r.impressions_ctr;
        t.ctr_count += 1;
        t.has_ctr = true;
      }
    });
    return {
      ...t,
      avg_ctr: t.ctr_count > 0 ? t.ctr_sum / t.ctr_count : null,
      net_subs: t.subs_gained - t.subs_lost,
    };
  }, [rows]);

  if (!isAuthorized) {
    return (
      <Card className="border-dashed border-border/40 bg-muted/10">
        <CardContent className="p-5 text-center">
          <ShieldCheck className="mx-auto mb-2 h-5 w-5 text-muted-foreground/60" />
          <p className="text-sm font-semibold">Not authorized for analytics</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click "Authorize for analytics" on this channel card to unlock revenue, watch time, and CTR.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (rows.length === 0) {
    return (
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4">
          <p className="text-sm font-semibold">Channel authorized — no data yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click "Sync analytics" on the dashboard to pull the last 30 days.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = rows.map((r) => ({
    day: r.date.slice(5),
    views: r.views,
    minutes: r.estimated_minutes_watched,
    revenue: r.estimated_revenue_usd ?? 0,
  }));

  return (
    <div className="space-y-3">
      {/* Big numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat icon={Eye}              label="Views (30d)"        value={fmtNum(totals.views)}                       tone="text-blue-600" />
        <Stat icon={Clock}            label="Watch time"          value={fmtMinutes(totals.watch_min)}              tone="text-purple-600" />
        <Stat icon={Users}            label="Net subs"            value={(totals.net_subs >= 0 ? "+" : "") + fmtNum(totals.net_subs)} tone={totals.net_subs >= 0 ? "text-emerald-600" : "text-rose-600"} />
        <Stat
          icon={IndianRupee}
          label="Est. revenue"
          value={totals.has_revenue ? fmtUSD(totals.revenue) : "—"}
          tone="text-amber-600"
          sub={totals.has_revenue ? "USD" : "not monetized"}
        />
      </div>

      {totals.has_ctr && (
        <div className="rounded-lg border border-border/40 bg-card p-3 flex items-center gap-2">
          <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs">
            <span className="font-semibold tabular-nums">{(totals.avg_ctr ?? 0).toFixed(2)}%</span>
            <span className="text-muted-foreground"> · avg thumbnail click-through rate (30d)</span>
          </p>
        </div>
      )}

      {/* Trend chart */}
      <div className="rounded-lg border border-border/40 bg-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Daily views — last {days} days</p>
        </div>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }}
              />
              <Line type="monotone" dataKey="views" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, tone, sub,
}: {
  icon: any; label: string; value: string; tone: string; sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-card p-3">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", tone)} />
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className={cn("text-lg font-bold tabular-nums mt-1", tone)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
