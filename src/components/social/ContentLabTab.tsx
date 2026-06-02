import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarClock, Type, Clock4, Tags, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip, Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  useContentLab,
  type ContentLabBucket,
  type ContentLabHeatCell,
  type ContentLabTagRow,
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ContentLabTab({ startupId, channelFilterUuid }: Props) {
  const { data, isLoading } = useContentLab(startupId, channelFilterUuid);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
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
              Add some channels and run <b>Sync videos</b> to populate this tab.
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
          <p className="text-sm">
            <span className="font-semibold">{data.videos_in_scope}</span>{" "}
            <span className="text-muted-foreground">video{data.videos_in_scope === 1 ? "" : "s"} in scope</span>
          </p>
          <InfoTooltip title="What's in scope">
            All videos for the channels currently selected (filter at the top
            of the page). Performance metric used throughout this tab is{" "}
            <b>lifetime views</b> per video. We use views because it's the
            only universally available signal — YouTube no longer exposes
            impressions / CTR through the public API.
          </InfoTooltip>
        </div>
        <Badge variant="outline" className="text-[10px]">
          Timezone: {data.timezone}
        </Badge>
      </div>

      {/* 1. Upload-timing heatmap */}
      <UploadHeatmap cells={data.upload_heatmap} videosWithTime={data.videos_with_publish_time} tz={data.timezone} />

      {/* 2 + 3 side by side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BucketPanel
          icon={Type}
          title="Title length"
          subtitle="Avg views per video by title-length bucket"
          buckets={data.title_length_buckets}
          xLabel="characters"
          tooltipBody={
            <>
              Distribution of your videos across title-length buckets. The bar
              height is <b>average lifetime views per video</b> in each bucket.
              YouTube's recommendation algorithm doesn't directly care about
              title length, but length is a proxy for clarity vs. ambiguity:
              very short titles often under-sell; very long ones can be hard to
              read on mobile.
            </>
          }
        />
        <BucketPanel
          icon={Clock4}
          title="Video length"
          subtitle="Avg views & completion rate by duration"
          buckets={data.duration_buckets}
          xLabel="duration"
          showCompletion
          tooltipBody={
            <>
              <b>Avg views per video</b> by duration bucket. The line overlay
              shows <b>average view percentage</b> — how much of the video the
              average viewer actually watched. High views + high completion is
              the sweet spot. High views but low completion usually means a
              click-baity title that doesn't deliver.
            </>
          }
        />
      </div>

      {/* 4. Top tags */}
      <TopTagsPanel tags={data.top_tags} />
    </div>
  );
}

/* ─────── 1. Upload heatmap ─────── */

function UploadHeatmap({
  cells, videosWithTime, tz,
}: {
  cells: ContentLabHeatCell[];
  videosWithTime: number;
  tz: string;
}) {
  // Build a 7×24 matrix
  const matrix = useMemo(() => {
    const m: Array<Array<ContentLabHeatCell | null>> = Array.from(
      { length: 7 },
      () => Array(24).fill(null)
    );
    for (const c of cells) m[c.day_of_week][c.hour_of_day] = c;
    return m;
  }, [cells]);

  const max = useMemo(() => Math.max(0, ...cells.map((c) => c.avg_views)), [cells]);

  if (cells.length === 0) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-5">
          <PanelHeader icon={CalendarClock} title="Upload timing" subtitle="Day-of-week × hour-of-day · avg views per video" />
          <EmptyState text="No videos have publish timestamps yet." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40">
      <CardContent className="p-5">
        <PanelHeader
          icon={CalendarClock}
          title="Upload timing"
          subtitle={`When you've uploaded · avg views per video at each (day, hour) — ${tz}`}
          tooltipTitle="Upload timing heatmap"
          tooltipBody={
            <>
              <b>Rows = day of week, columns = hour of day</b> in your local
              timezone ({tz}). Cells are colored by{" "}
              <b>average lifetime views per video</b> uploaded in that slot —
              darker blue = better. Empty cells mean you've never uploaded at
              that time. <b>Reading it:</b> look for consistent dark cells —
              that's your audience's prime time. Watch out for false positives
              from cells with only 1–2 videos (hover to see the count).
            </>
          }
        />

        <div className="overflow-x-auto -mx-1">
          <div className="inline-block min-w-full p-1">
            <table className="border-separate" style={{ borderSpacing: 2 }}>
              <thead>
                <tr>
                  <th className="w-10"></th>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <th key={h} className="text-[9px] text-muted-foreground font-normal w-6 text-center">
                      {h % 3 === 0 ? `${h}` : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WEEKDAYS.map((wd, d) => (
                  <tr key={wd}>
                    <td className="text-[10px] text-muted-foreground font-medium pr-2 text-right tabular-nums">
                      {wd}
                    </td>
                    {Array.from({ length: 24 }).map((_, h) => {
                      const cell = matrix[d][h];
                      const intensity = cell && max > 0 ? cell.avg_views / max : 0;
                      const bg = cell
                        ? `rgba(59, 130, 246, ${0.15 + intensity * 0.85})`
                        : "rgba(148, 163, 184, 0.08)";
                      return (
                        <td key={h}>
                          <div
                            className="h-6 w-6 rounded-sm border border-border/20 transition hover:ring-1 hover:ring-blue-500/50 cursor-default"
                            style={{ background: bg }}
                            title={
                              cell
                                ? `${wd} ${h}:00 · ${cell.video_count} video${cell.video_count === 1 ? "" : "s"} · ${fmtNum(cell.avg_views)} avg views`
                                : `${wd} ${h}:00 · no uploads`
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-3">
          {videosWithTime} of the videos have publish timestamps and are included here.
          Hover any cell for upload count + avg views in that slot.
        </p>
      </CardContent>
    </Card>
  );
}

/* ─────── 2/3. Bucket panel (title length, duration) ─────── */

function BucketPanel({
  icon, title, subtitle, buckets, xLabel, showCompletion = false, tooltipBody,
}: {
  icon: any;
  title: string;
  subtitle: string;
  buckets: ContentLabBucket[];
  xLabel: string;
  showCompletion?: boolean;
  tooltipBody: React.ReactNode;
}) {
  const chartData = buckets.map((b) => ({
    label: b.label,
    avg_views: Math.round(b.avg_views),
    median_views: Math.round(b.median_views),
    video_count: b.video_count,
    completion: b.avg_view_percentage,
  }));

  const hasData = chartData.some((d) => d.video_count > 0);
  return (
    <Card className="border-border/40">
      <CardContent className="p-5">
        <PanelHeader
          icon={icon}
          title={title}
          subtitle={subtitle}
          tooltipTitle={title}
          tooltipBody={tooltipBody}
        />
        {!hasData ? (
          <EmptyState text="No data yet." />
        ) : (
          <div className="h-64 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
                <YAxis
                  tickFormatter={(v) => fmtNum(Number(v))}
                  tick={{ fontSize: 10 }}
                  width={48}
                />
                <RTooltip
                  cursor={{ fill: "rgba(148,163,184,0.1)" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: any, name) => {
                    if (name === "avg_views") return [fmtNum(Number(v)), "Avg views"];
                    if (name === "median_views") return [fmtNum(Number(v)), "Median views"];
                    if (name === "completion") return [`${Number(v).toFixed(1)}%`, "Completion"];
                    return [v, name];
                  }}
                  labelFormatter={(label, payload: any) => {
                    const n = payload?.[0]?.payload?.video_count ?? 0;
                    return `${label} ${xLabel} · ${n} video${n === 1 ? "" : "s"}`;
                  }}
                />
                <Bar dataKey="avg_views" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {chartData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.video_count === 0
                        ? "rgba(148,163,184,0.25)"
                        : "rgb(59, 130, 246)"}
                    />
                  ))}
                </Bar>
                {showCompletion && (
                  <Bar
                    dataKey="completion"
                    fill="rgba(16,185,129,0.35)"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Inline summary table */}
        <div className="mt-2 grid grid-cols-5 gap-2 text-[10px]">
          {chartData.map((d) => (
            <div key={d.label} className="rounded-md border border-border/30 bg-muted/10 p-1.5 text-center">
              <p className="font-semibold text-foreground truncate">{d.label}</p>
              <p className="text-muted-foreground tabular-nums">{d.video_count} vids</p>
              <p className="text-[11px] font-semibold tabular-nums leading-tight mt-0.5">
                {fmtNum(d.avg_views)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────── 4. Top tags ─────── */

function TopTagsPanel({ tags }: { tags: ContentLabTagRow[] }) {
  if (tags.length === 0) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-5">
          <PanelHeader icon={Tags} title="Top tags" subtitle="Tags ranked by avg views per video" />
          <EmptyState text="Either no tags are set on your videos, or no tag appears in at least 3 videos (our noise floor)." />
        </CardContent>
      </Card>
    );
  }
  const max = Math.max(...tags.map((t) => t.avg_views));
  return (
    <Card className="border-border/40">
      <CardContent className="p-5">
        <PanelHeader
          icon={Tags}
          title="Top tags"
          subtitle="Tags ranked by avg views per video they appear on"
          tooltipTitle="Tag effectiveness"
          tooltipBody={
            <>
              Tags ranked by <b>avg views per video</b> they appear on. We only
              include tags used in <b>3+ videos</b> to filter noise. Caveat:
              correlation isn't causation — a tag that appears on your best
              videos doesn't necessarily make a video good. Use as a hint for
              "what topics resonate" and pair with the title-length panel
              when planning a video.
            </>
          }
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-1.5">
          {tags.map((t, i) => {
            const widthPct = max > 0 ? (t.avg_views / max) * 100 : 0;
            return (
              <div key={t.tag} className="grid grid-cols-12 items-center gap-2 text-xs">
                <div className="col-span-1 text-[10px] text-muted-foreground tabular-nums text-right">
                  #{i + 1}
                </div>
                <div className="col-span-4 min-w-0">
                  <p className="truncate font-medium">{t.tag}</p>
                </div>
                <div className="col-span-4 relative">
                  <div className="h-2.5 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full bg-blue-500/70 rounded-full"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
                <div className="col-span-1 text-right tabular-nums">
                  {fmtNum(t.avg_views)}
                </div>
                <div className="col-span-2 text-right text-muted-foreground tabular-nums text-[10px]">
                  {t.video_count} vid{t.video_count === 1 ? "" : "s"}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────── Shared atoms ─────── */

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
    <div className={cn("rounded-lg border border-dashed border-border/40 bg-muted/10 p-6 text-center")}>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
