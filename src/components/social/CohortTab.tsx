import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Layers, PieChart as PieIcon, TrendingUp, ScatterChart as ScatterIcon, Sparkles,
  AlertTriangle,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend,
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  useCohortAnalysis,
  type TrajectoryClass,
  type CohortChannelClassRow,
  type CohortScatterPoint,
  type CohortLongTailRow,
} from "@/hooks/useYouTube";
import InfoTooltip from "./InfoTooltip";

interface Props {
  startupId: string;
  channelFilterUuid: string | null;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

function fmtAge(days: number): string {
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

const BUCKET_COLOR = [
  "rgb(59, 130, 246)",  // blue — fresh
  "rgb(16, 185, 129)",  // green
  "rgb(245, 158, 11)",  // amber
  "rgb(139, 92, 246)",  // purple
  "rgb(148, 163, 184)", // gray — old
];

const TRAJ_COLOR: Record<TrajectoryClass, string> = {
  rising:   "rgb(16, 185, 129)",
  steady:   "rgb(59, 130, 246)",
  decaying: "rgb(245, 158, 11)",
  dead:     "rgb(148, 163, 184)",
};

const TRAJ_LABEL: Record<TrajectoryClass, string> = {
  rising:   "Rising",
  steady:   "Steady",
  decaying: "Decaying",
  dead:     "Dead",
};

const TRAJ_DESC: Record<TrajectoryClass, string> = {
  rising:   "recent view rate > 1.5× lifetime avg — catching fresh attention",
  steady:   "recent view rate within ±50% of lifetime avg — performing as expected",
  decaying: "recent view rate 5–50% of lifetime avg — losing attention",
  dead:     "recent view rate < 5% of lifetime avg — effectively dormant",
};

export default function CohortTab({ startupId, channelFilterUuid }: Props) {
  const { data, isLoading } = useCohortAnalysis(startupId, channelFilterUuid);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
      </div>
    );
  }

  if (!data || data.videos_in_scope === 0) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">No videos in scope yet.</p>
            <p className="text-muted-foreground mt-0.5">
              Sync videos for a channel to populate the cohort views.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-sm">
            <span className="font-semibold">{data.videos_in_scope}</span>{" "}
            <span className="text-muted-foreground">video{data.videos_in_scope === 1 ? "" : "s"} · </span>
            <span className="font-semibold tabular-nums">{fmtNum(data.total_recent_views)}</span>{" "}
            <span className="text-muted-foreground">recent (30d) views</span>
          </p>
          <InfoTooltip title="What's cohort analysis">
            We compare videos by their <b>age</b>, not by the date they were
            uploaded. That lets us answer questions like "which old videos
            still pull views" and "is this new video on track" — things a
            simple uploads list can't show.
          </InfoTooltip>
        </div>
      </div>

      {/* Panel 1: Catalog mix donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CatalogMixPanel
          buckets={data.age_bucket_mix}
          totalRecent={data.total_recent_views}
        />

        {/* Panel 2: Trajectory classes */}
        <TrajectoryPanel
          totals={data.trajectory_totals}
          byChannel={data.by_channel}
          channelFiltered={!!channelFilterUuid}
        />
      </div>

      {/* Panel 3: Age vs lifetime views scatter */}
      <AgeViewsScatter points={data.scatter} />

      {/* Panel 4: Long-tail winners */}
      <LongTailPanel rows={data.long_tail_winners} />
    </div>
  );
}

/* ─── 1. Catalog mix ─── */

function CatalogMixPanel({
  buckets, totalRecent,
}: {
  buckets: import("@/hooks/useYouTube").CohortAgeBucket[];
  totalRecent: number;
}) {
  const data = buckets
    .filter((b) => b.recent_views > 0)
    .map((b, i) => ({
      name: b.label,
      value: b.recent_views,
      pct: b.share_recent_pct,
      videos: b.video_count,
      color: BUCKET_COLOR[i] ?? "rgb(148, 163, 184)",
    }));

  // Concentration insight: if >60% comes from <90d videos, that's content-treadmill
  const fresh = buckets
    .filter((b) => (b.max_days ?? Infinity) <= 90)
    .reduce((acc, b) => acc + b.share_recent_pct, 0);
  let insight: { text: string; tone: "good" | "bad" | "ok" } | null = null;
  if (totalRecent > 0) {
    if (fresh >= 70) {
      insight = {
        tone: "bad",
        text: `${fresh.toFixed(0)}% of recent views came from videos under 3 months old — heavy treadmill dependency.`,
      };
    } else if (fresh <= 30) {
      insight = {
        tone: "good",
        text: `Only ${fresh.toFixed(0)}% from videos <3 months — strong evergreen back catalog.`,
      };
    } else {
      insight = {
        tone: "ok",
        text: `${fresh.toFixed(0)}% from videos under 3 months — balanced mix.`,
      };
    }
  }

  return (
    <Card className="border-border/40">
      <CardContent className="p-5">
        <PanelHeader
          icon={PieIcon}
          title="Catalog mix"
          subtitle="Where last 30 days of views came from, by video age"
          tooltipTitle="Catalog mix"
          tooltipBody={
            <>
              For each <b>age bucket</b>, the share of last-30-day views
              attributable to videos in that bucket. If most of your recent
              views come from very young videos, you're <b>treadmill-dependent</b>{" "}
              — you must keep uploading. If older buckets dominate, your back
              catalog is doing the heavy lifting.
            </>
          }
        />
        {data.length === 0 ? (
          <EmptyState text="No recent views yet — run Sync analytics on an authorized channel." />
        ) : (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {data.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <RTooltip
                    formatter={(v: any, _n, ctx: any) => [
                      `${fmtNum(Number(v))} views · ${ctx?.payload?.pct?.toFixed(1) ?? 0}%`,
                      ctx?.payload?.name,
                    ]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {data.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: d.color }}
                  />
                  <span className="truncate flex-1">
                    {d.name}{" "}
                    <span className="text-muted-foreground">· {d.videos} video{d.videos === 1 ? "" : "s"}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">{d.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
            {insight && (
              <div
                className={cn(
                  "mt-3 rounded-md px-3 py-2 text-[11px] leading-snug border",
                  insight.tone === "good" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
                  insight.tone === "bad"  && "border-amber-500/30 bg-amber-500/10 text-amber-700",
                  insight.tone === "ok"   && "border-border/40 bg-muted/20 text-muted-foreground",
                )}
              >
                <Sparkles className="h-3 w-3 inline mr-1 -translate-y-px" />
                {insight.text}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── 2. Trajectory classification ─── */

function TrajectoryPanel({
  totals, byChannel, channelFiltered,
}: {
  totals: Record<TrajectoryClass, number>;
  byChannel: CohortChannelClassRow[];
  channelFiltered: boolean;
}) {
  const total = totals.rising + totals.steady + totals.decaying + totals.dead;
  return (
    <Card className="border-border/40">
      <CardContent className="p-5">
        <PanelHeader
          icon={TrendingUp}
          title="Trajectory classes"
          subtitle="Each video's recent view rate vs its own lifetime avg"
          tooltipTitle="How trajectory is classified"
          tooltipBody={
            <>
              For each video, we compute <b>recent views per day</b> (last 30 days)
              and <b>lifetime views per day</b> (total views ÷ age), then take
              the ratio:
              <ul className="mt-1.5 space-y-0.5 list-disc pl-4">
                <li><b>Rising</b>: ratio ≥ 1.5× — catching new attention</li>
                <li><b>Steady</b>: 0.5×–1.5× — performing as expected</li>
                <li><b>Decaying</b>: 0.05×–0.5× — losing attention</li>
                <li><b>Dead</b>: &lt;0.05× — effectively dormant</li>
              </ul>
              Videos under 7 days old skip the ratio test (not enough data) and
              are classed as Rising if they have any recent views.
            </>
          }
        />
        {total === 0 ? (
          <EmptyState text="No videos to classify yet." />
        ) : (
          <>
            {/* Totals stacked bar */}
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Whole scope
              </p>
              <StackedBar totals={totals} total={total} />
              <div className="flex justify-between mt-1.5 text-[10px]">
                {(["rising", "steady", "decaying", "dead"] as TrajectoryClass[]).map((k) => (
                  <div key={k} className="flex items-center gap-1">
                    <span
                      className="h-2 w-2 rounded-sm"
                      style={{ background: TRAJ_COLOR[k] }}
                    />
                    <span className="text-muted-foreground">{TRAJ_LABEL[k]}</span>
                    <span className="font-semibold tabular-nums">{totals[k]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-channel breakdown */}
            {!channelFiltered && byChannel.length > 1 && (
              <div className="space-y-2 mt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Per channel
                </p>
                {byChannel.map((ch) => (
                  <div key={ch.channel_uuid} className="grid grid-cols-12 items-center gap-2 text-xs">
                    <div className="col-span-4 flex items-center gap-1.5 min-w-0">
                      {ch.channel_thumbnail && (
                        <img
                          src={ch.channel_thumbnail}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-5 w-5 rounded-full shrink-0"
                        />
                      )}
                      <span className="truncate font-medium">
                        {ch.channel_title ?? "—"}
                      </span>
                    </div>
                    <div className="col-span-8">
                      <StackedBar
                        totals={{
                          rising: ch.rising,
                          steady: ch.steady,
                          decaying: ch.decaying,
                          dead: ch.dead,
                        }}
                        total={ch.total}
                        height="h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StackedBar({
  totals, total, height = "h-3",
}: {
  totals: Record<TrajectoryClass, number>;
  total: number;
  height?: string;
}) {
  if (total === 0) return null;
  const segs: TrajectoryClass[] = ["rising", "steady", "decaying", "dead"];
  return (
    <div className={cn("flex w-full rounded overflow-hidden", height)}>
      {segs.map((k) => {
        const pct = (totals[k] / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={k}
            title={`${TRAJ_LABEL[k]} — ${totals[k]} (${pct.toFixed(1)}%) · ${TRAJ_DESC[k]}`}
            style={{ width: `${pct}%`, background: TRAJ_COLOR[k] }}
          />
        );
      })}
    </div>
  );
}

/* ─── 3. Age vs lifetime views scatter ─── */

function AgeViewsScatter({ points }: { points: CohortScatterPoint[] }) {
  // Group by trajectory for separate series (so legend toggles work + colors)
  const byClass = useMemo(() => {
    const out: Record<TrajectoryClass, CohortScatterPoint[]> = {
      rising: [], steady: [], decaying: [], dead: [],
    };
    for (const p of points) out[p.trajectory].push(p);
    return out;
  }, [points]);

  // Explicit domain needed — recharts log scale with "dataMin"/"dataMax" across
  // multiple <Scatter> series doesn't unify domains correctly, so dots vanish.
  const axisDomain = useMemo(() => {
    if (points.length === 0) return { x: [1, 1] as [number, number], y: [1, 1] as [number, number] };
    const ages = points.map((p) => Math.max(1, p.age_days));
    const views = points.map((p) => Math.max(1, p.lifetime_views));
    return {
      x: [Math.min(...ages), Math.max(...ages)] as [number, number],
      y: [Math.min(...views), Math.max(...views)] as [number, number],
    };
  }, [points]);

  return (
    <Card className="border-border/40">
      <CardContent className="p-5">
        <PanelHeader
          icon={ScatterIcon}
          title="Age vs lifetime views"
          subtitle="Each dot is a video — outliers above the cloud are over-performers"
          tooltipTitle="Reading the scatter"
          tooltipBody={
            <>
              <b>X axis</b>: days since the video was uploaded (log scale —
              spreads young/old videos evenly).{" "}
              <b>Y axis</b>: total lifetime views (log scale).{" "}
              <b>Color</b>: trajectory class (Rising / Steady / Decaying / Dead).
              {" "}A diagonal cloud is normal: older videos have more views
              because they've had more time. <b>Look for outliers</b>: dots
              high above the cloud at any age are over-performers; dots below
              the cloud are under-performers for their age. Click "Rising" in
              the legend to isolate videos catching fresh attention.
            </>
          }
        />
        {points.length === 0 ? (
          <EmptyState text="No videos with both an age and views yet." />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <XAxis
                  type="number"
                  dataKey="age_days"
                  name="Age"
                  scale="log"
                  domain={axisDomain.x}
                  allowDataOverflow
                  tickFormatter={(v) => fmtAge(v)}
                  tick={{ fontSize: 10 }}
                  height={36}
                  label={{
                    value: "Age (log scale)",
                    position: "insideBottom",
                    offset: -2,
                    style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="lifetime_views"
                  name="Views"
                  scale="log"
                  domain={axisDomain.y}
                  allowDataOverflow
                  tickFormatter={(v) => fmtNum(v)}
                  tick={{ fontSize: 10 }}
                  width={48}
                />
                <ZAxis range={[40, 40]} />
                <RTooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.[0]) return null;
                    const p = payload[0].payload as CohortScatterPoint;
                    return (
                      <div className="rounded-md bg-card border border-border/60 p-2 text-xs shadow-md max-w-[260px]">
                        <p className="font-semibold line-clamp-2 leading-tight mb-1">
                          {p.title ?? "Untitled"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mb-1">
                          {p.channel_title ?? "—"}
                        </p>
                        <div className="grid grid-cols-2 gap-x-3 tabular-nums">
                          <span className="text-muted-foreground">Age</span>
                          <span className="text-right">{fmtAge(p.age_days)}</span>
                          <span className="text-muted-foreground">Lifetime</span>
                          <span className="text-right">{fmtNum(p.lifetime_views)}</span>
                          <span className="text-muted-foreground">Last 30d</span>
                          <span className="text-right">{fmtNum(p.recent_views)}</span>
                          <span className="text-muted-foreground">Trajectory</span>
                          <span
                            className="text-right font-semibold"
                            style={{ color: TRAJ_COLOR[p.trajectory] }}
                          >
                            {TRAJ_LABEL[p.trajectory]}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value: string) => TRAJ_LABEL[value as TrajectoryClass] ?? value}
                />
                {(["rising", "steady", "decaying", "dead"] as TrajectoryClass[]).map((k) => (
                  <Scatter
                    key={k}
                    name={k}
                    data={byClass[k]}
                    fill={TRAJ_COLOR[k]}
                    fillOpacity={0.65}
                    isAnimationActive={false}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── 4. Long-tail winners ─── */

function LongTailPanel({ rows }: { rows: CohortLongTailRow[] }) {
  return (
    <Card className="border-border/40">
      <CardContent className="p-5">
        <PanelHeader
          icon={Sparkles}
          title="Long-tail winners"
          subtitle="Older videos that are punching above their lifetime weight right now"
          tooltipTitle="Long-tail winners"
          tooltipBody={
            <>
              For each video older than 30 days, we compare its <b>recent views
              per day</b> against its <b>lifetime average views per day</b>.{" "}
              The <b>lift ratio</b> is the multiplier — a 5× lift means it's
              currently pulling 5× its own historical rate. These are usually
              two things: <b>genuinely evergreen content</b> that compounds
              over time, or <b>recently algorithmically surfaced</b> videos
              (suggested-rail bump, new search momentum). Either way: study
              what they have in common and make more like them.
            </>
          }
        />
        {rows.length === 0 ? (
          <EmptyState text="No long-tail winners surfaced — needs videos older than 30 days with active recent views." />
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <a
                key={r.video_uuid}
                href={`https://youtube.com/watch?v=${r.video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="grid grid-cols-12 items-center gap-3 rounded-md border border-border/40 bg-card p-2.5 hover:bg-muted/10 transition"
              >
                <div className="col-span-1 text-[10px] text-muted-foreground tabular-nums text-right">
                  #{i + 1}
                </div>
                <div className="col-span-2 sm:col-span-1 shrink-0">
                  {r.thumbnail_url ? (
                    <img
                      src={r.thumbnail_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="aspect-video w-full object-cover rounded"
                    />
                  ) : null}
                </div>
                <div className="col-span-9 sm:col-span-6 min-w-0">
                  <p className="text-xs font-semibold truncate">{r.title ?? "Untitled"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {r.channel_title} · {fmtAge(r.age_days)} old · {fmtNum(r.lifetime_views)} lifetime views
                  </p>
                </div>
                <div className="col-span-6 sm:col-span-2 text-right tabular-nums">
                  <p className="text-xs font-semibold">{fmtNum(r.recent_30d_views)}</p>
                  <p className="text-[10px] text-muted-foreground">recent 30d</p>
                </div>
                <div className="col-span-6 sm:col-span-2 text-right">
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 text-[10px] tabular-nums"
                  >
                    {r.lift_ratio.toFixed(1)}× lift
                  </Badge>
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── shared atoms ─── */

function PanelHeader({
  icon: Icon, title, subtitle, tooltipTitle, tooltipBody,
}: {
  icon: any; title: string; subtitle: string;
  tooltipTitle?: string; tooltipBody?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold leading-none">{title}</h3>
          {tooltipBody && tooltipTitle && (
            <InfoTooltip title={tooltipTitle}>{tooltipBody}</InfoTooltip>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/40 bg-muted/10 p-6 text-center">
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
