import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Youtube, Settings, RefreshCw, Loader2, Users, Eye, Video, ThumbsUp, MessageSquare,
  TrendingUp, ExternalLink, AlertTriangle, CheckCircle2, ShieldCheck, KeyRound, BarChart3,
  Filter, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useStartups } from "@/hooks/useStartups";
import {
  useYouTubeChannels,
  useYouTubeCredentials,
  useRecentYouTubeUploads,
  useTopYouTubeVideos,
  useTriggerYouTubeSync,
  useAuthorizedChannelIds,
  useStartYouTubeOAuth,
  useTriggerYouTubeAnalyticsSync,
  useTopVideosByMetric,
  type YouTubeChannel,
  type YouTubeVideoWithChannel,
} from "@/hooks/useYouTube";
import YouTubeConnectorSetup from "@/components/social/YouTubeConnectorSetup";
import ChannelAnalyticsPanel from "@/components/social/ChannelAnalyticsPanel";

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SocialMediaDashboard() {
  const { profile } = useAuth();
  const { dbStartups } = useStartups();
  const nasheedio = dbStartups.find((s) => s.slug === "nasheedio");
  const startupId = nasheedio?.id;

  const isFounder = profile?.role === "founder";
  const isSMHead = profile?.role === "functional_head" && profile?.department === "social_media";
  const canWrite = isFounder || isSMHead;

  const [setupOpen, setSetupOpen] = useState(false);

  const { data: credentials } = useYouTubeCredentials(startupId);
  const { data: channels = [], isLoading: chLoading } = useYouTubeChannels(startupId);

  // Channel filter + paginated limits
  const [channelFilter, setChannelFilter] = useState<string>("all"); // "all" or channel uuid
  const [recentLimit, setRecentLimit] = useState(24);
  const [topLimit, setTopLimit] = useState(24);
  const filterUuid = channelFilter === "all" ? null : channelFilter;

  // Reset limits when filter changes so a smaller list doesn't carry the
  // expanded count across filters
  useEffect(() => {
    setRecentLimit(24);
    setTopLimit(24);
  }, [channelFilter]);

  const { data: recentUploads = [] } = useRecentYouTubeUploads(startupId, recentLimit, filterUuid);
  const { data: topVideos = [] } = useTopYouTubeVideos(startupId, topLimit, filterUuid);
  const triggerSync = useTriggerYouTubeSync();
  const { data: authorizedIds = [] } = useAuthorizedChannelIds(startupId);
  const startOAuth = useStartYouTubeOAuth();
  const triggerAnalyticsSync = useTriggerYouTubeAnalyticsSync();
  const { data: topByRevenue = [] } = useTopVideosByMetric(startupId, "estimated_revenue_usd", 10);
  const { data: topByWatchTime = [] } = useTopVideosByMetric(startupId, "estimated_minutes_watched", 10);

  const authorizedSet = useMemo(() => new Set(authorizedIds), [authorizedIds]);
  const anyAuthorized = authorizedIds.length > 0;

  // Handle OAuth callback redirect (?yt_oauth=success|error)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const status = searchParams.get("yt_oauth");
    if (!status) return;
    if (status === "success") {
      const channels = searchParams.get("channels");
      toast.success(`Authorized ${channels ?? ""} channel(s) for analytics`);
    } else {
      const reason = searchParams.get("reason") ?? "unknown";
      toast.error(`OAuth failed: ${reason}`);
    }
    // Clean the URL so a refresh doesn't re-toast
    const next = new URLSearchParams(searchParams);
    next.delete("yt_oauth");
    next.delete("channels");
    next.delete("reason");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Aggregate stats
  const totals = useMemo(() => {
    const t = { subscribers: 0, views: 0, videos: 0 };
    channels.forEach((c) => {
      t.subscribers += Number(c.subscriber_count);
      t.views += Number(c.view_count);
      t.videos += Number(c.video_count);
    });
    return t;
  }, [channels]);

  const handleSync = () => {
    if (!startupId) return;
    triggerSync.mutate(
      { startupId },
      {
        onSuccess: (data: any) => {
          const results = (data?.results ?? []) as Array<{
            channel_id: string; channel_title?: string | null;
            videos_synced: number; errors: string[];
          }>;
          const total = results.reduce((acc, r) => acc + r.videos_synced, 0);
          const failed = results.filter((r) => r.errors.length > 0);
          const succeeded = results.filter((r) => r.errors.length === 0 && r.videos_synced > 0);

          if (failed.length === 0) {
            toast.success(`Synced ${total} videos across ${results.length} channel(s)`);
          } else {
            // Mixed outcome — show breakdown with failing channel names
            const failedNames = failed
              .map((r) => r.channel_title ?? r.channel_id.slice(0, 8))
              .join(", ");
            toast.warning(
              `Synced ${total} videos · ${succeeded.length} channel(s) OK · ${failed.length} failed`,
              {
                description: `Failing: ${failedNames}. First error: ${failed[0].errors[0]?.slice(0, 200) ?? "unknown"}`,
                duration: 15000,
              }
            );
            console.warn("YouTube sync per-channel results:", results);
          }
        },
        onError: (e: any) => toast.error(e?.message ?? "Sync failed"),
      }
    );
  };

  const handleSyncAnalytics = () => {
    if (!startupId) return;
    triggerAnalyticsSync.mutate(
      { startupId },
      {
        onSuccess: (data: any) => {
          const results = (data.results ?? []) as Array<{
            channel_title?: string | null;
            channel_rows_upserted: number;
            video_rows_upserted: number;
            demographics_rows_upserted?: number;
            geography_rows_upserted?: number;
            traffic_rows_upserted?: number;
            device_rows_upserted?: number;
            retention_rows_upserted?: number;
            errors: string[];
          }>;
          const sum = (k: keyof typeof results[number]) =>
            results.reduce((acc, r) => acc + (Number(r[k] ?? 0) || 0), 0);
          const channelRows = sum("channel_rows_upserted");
          const videoRows = sum("video_rows_upserted");
          const demoRows = sum("demographics_rows_upserted");
          const geoRows = sum("geography_rows_upserted");
          const trafRows = sum("traffic_rows_upserted");
          const devRows = sum("device_rows_upserted");
          const retRows = sum("retention_rows_upserted");
          const failedCount = results.filter((r) => r.errors.length > 0).length;

          const description =
            `${channelRows} channel-day · ${videoRows} video · ${demoRows} demographics · ` +
            `${geoRows} geo · ${trafRows} traffic · ${devRows} device · ${retRows} retention rows`;

          if (failedCount === 0) {
            toast.success(`Analytics synced across ${results.length} channel(s)`, {
              description,
              duration: 10000,
            });
          } else {
            toast.warning(
              `Synced with ${failedCount} channel(s) reporting errors`,
              { description, duration: 15000 }
            );
            console.warn("YouTube analytics sync per-channel results:", results);
          }
        },
        onError: (e: any) => toast.error(e?.message ?? "Analytics sync failed"),
      }
    );
  };

  const handleAuthorize = () => {
    if (!startupId) return;
    startOAuth.mutate(
      { startupId, returnPath: "/team/social-media" },
      {
        onSuccess: () => toast.info("Opened Google consent in a new tab — complete sign-in there"),
        onError: (e: any) => toast.error(e?.message ?? "Couldn't start OAuth"),
      }
    );
  };

  if (!startupId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-sm text-muted-foreground">No Nasheedio startup found in DB.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Youtube className="h-6 w-6 text-red-600" /> Social Media
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Nasheedio · {channels.length} channel{channels.length === 1 ? "" : "s"} · YouTube data
              {credentials?.last_synced_at && (
                <> · last sync {formatDistanceToNow(new Date(credentials.last_synced_at), { addSuffix: true })}</>
              )}
            </p>
          </div>
          {canWrite && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setSetupOpen(true)} className="gap-1.5">
                <Settings className="h-3.5 w-3.5" /> Setup
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAuthorize}
                disabled={startOAuth.isPending || channels.length === 0}
                className="gap-1.5"
                title="Authorize a channel for analytics (revenue, watch time, CTR)"
              >
                {startOAuth.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <ShieldCheck className="h-3.5 w-3.5" />}
                Authorize
              </Button>
              <Button
                size="sm"
                onClick={handleSync}
                disabled={triggerSync.isPending || !credentials || channels.length === 0}
                className="gap-1.5"
              >
                {triggerSync.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Sync videos
              </Button>
              {anyAuthorized && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSyncAnalytics}
                  disabled={triggerAnalyticsSync.isPending}
                  className="gap-1.5"
                >
                  {triggerAnalyticsSync.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <BarChart3 className="h-3.5 w-3.5" />}
                  Sync analytics
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Setup prompt if no credentials */}
        {!credentials && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-5 flex items-center gap-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">YouTube isn't connected yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {canWrite
                    ? "Click Setup to add a Google API key and the channels you want to track."
                    : "Ask the Social Media lead or a founder to wire it up."}
                </p>
              </div>
              {canWrite && (
                <Button size="sm" onClick={() => setSetupOpen(true)}>Setup</Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Credentials saved but no channels added yet */}
        {credentials && channels.length === 0 && (
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-5 flex items-center gap-4">
              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">API key saved — now add your channels</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Open Setup → enter a channel ID or @handle → Preview → Add.
                </p>
              </div>
              {canWrite && (
                <Button size="sm" onClick={() => setSetupOpen(true)}>Add channels</Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Aggregate KPIs */}
        {channels.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="Channels" value={String(channels.length)} icon={Youtube} />
            <Kpi label="Subscribers" value={fmtNum(totals.subscribers)} icon={Users} tone="text-emerald-600" />
            <Kpi label="Total views" value={fmtNum(totals.views)} icon={Eye} tone="text-blue-600" />
            <Kpi label="Videos" value={fmtNum(totals.videos)} icon={Video} tone="text-purple-600" />
          </div>
        )}

        {/* Tabs */}
        {channels.length > 0 && (
          <Tabs defaultValue="recent" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <TabsList>
                <TabsTrigger value="recent">Recent uploads</TabsTrigger>
                <TabsTrigger value="top">Top performers</TabsTrigger>
                <TabsTrigger value="channels">Channels</TabsTrigger>
                {anyAuthorized && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
              </TabsList>

              {/* Channel filter — applies to Recent uploads + Top performers */}
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger className="h-8 w-[200px] text-xs">
                    <SelectValue placeholder="All channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All channels ({channels.length})
                    </SelectItem>
                    {channels.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title ?? c.channel_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="recent">
              <VideosGrid
                videos={recentUploads}
                loading={chLoading}
                emptyMessage="No uploads synced yet — click Sync videos."
                canLoadMore={recentUploads.length >= recentLimit}
                onLoadMore={() => setRecentLimit((n) => n + 24)}
              />
            </TabsContent>

            <TabsContent value="top">
              <VideosGrid
                videos={topVideos}
                loading={chLoading}
                emptyMessage="No video stats yet."
                showRank
                canLoadMore={topVideos.length >= topLimit}
                onLoadMore={() => setTopLimit((n) => n + 24)}
              />
            </TabsContent>

            <TabsContent value="channels">
              <ChannelsGrid channels={channels} loading={chLoading} authorizedSet={authorizedSet} />
            </TabsContent>

            {anyAuthorized && (
              <TabsContent value="analytics" className="space-y-6">
                {/* Per-channel analytics panels */}
                {channels.filter((c) => authorizedSet.has(c.channel_id)).map((c) => (
                  <div key={c.id}>
                    <div className="flex items-center gap-2 mb-2">
                      {c.thumbnail_url && <img src={c.thumbnail_url} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full" />}
                      <p className="text-sm font-semibold">{c.title}</p>
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 bg-emerald-500/15 text-emerald-700 gap-1">
                        <ShieldCheck className="h-2.5 w-2.5" /> Authorized
                      </Badge>
                    </div>
                    <ChannelAnalyticsPanel channel={c} isAuthorized />
                  </div>
                ))}

                {/* Top by revenue */}
                {topByRevenue.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                      Top revenue (30d)
                    </h3>
                    <div className="space-y-2">
                      {topByRevenue.slice(0, 5).map((v, i) => (
                        <a
                          key={v.id}
                          href={`https://youtube.com/watch?v=${v.video_id}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 rounded-lg border border-border/40 bg-card p-3 hover:bg-muted/20"
                        >
                          <Badge className="bg-amber-500 text-white">#{i + 1}</Badge>
                          {v.thumbnail_url && <img src={v.thumbnail_url} alt="" referrerPolicy="no-referrer" className="h-10 w-16 rounded object-cover" />}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{v.video_title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{v.channel_title}</p>
                          </div>
                          <div className="text-right tabular-nums">
                            <p className="text-sm font-bold text-emerald-600">
                              ${v.estimated_revenue_usd?.toFixed(2) ?? "0.00"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{v.views.toLocaleString()} views</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top by watch time */}
                {topByWatchTime.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                      Top watch time (30d)
                    </h3>
                    <div className="space-y-2">
                      {topByWatchTime.slice(0, 5).map((v, i) => (
                        <a
                          key={v.id}
                          href={`https://youtube.com/watch?v=${v.video_id}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 rounded-lg border border-border/40 bg-card p-3 hover:bg-muted/20"
                        >
                          <Badge className="bg-purple-500 text-white">#{i + 1}</Badge>
                          {v.thumbnail_url && <img src={v.thumbnail_url} alt="" referrerPolicy="no-referrer" className="h-10 w-16 rounded object-cover" />}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{v.video_title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{v.channel_title}</p>
                          </div>
                          <div className="text-right tabular-nums">
                            <p className="text-sm font-bold text-purple-600">
                              {Math.round(v.estimated_minutes_watched).toLocaleString()} min
                            </p>
                            <p className="text-[10px] text-muted-foreground">{v.views.toLocaleString()} views</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        )}
      </main>

      <YouTubeConnectorSetup
        open={setupOpen}
        onOpenChange={setSetupOpen}
        startupId={startupId}
      />
    </div>
  );
}

/* ──────────── small components ──────────── */

function Kpi({
  label, value, icon: Icon, tone = "text-foreground",
}: {
  label: string; value: string; icon: any; tone?: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-3.5 w-3.5", tone)} />
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        </div>
        <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function VideosGrid({
  videos, loading, emptyMessage, showRank = false, canLoadMore = false, onLoadMore,
}: {
  videos: YouTubeVideoWithChannel[];
  loading: boolean;
  emptyMessage: string;
  showRank?: boolean;
  canLoadMore?: boolean;
  onLoadMore?: () => void;
}) {
  if (loading) return <Skeleton className="h-40 w-full" />;
  if (videos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-10 text-center">
        <Video className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {videos.map((v, idx) => (
        <a
          key={v.id}
          href={`https://youtube.com/watch?v=${v.video_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-xl border border-border/40 bg-card overflow-hidden hover:border-border transition"
        >
          <div className="relative aspect-video bg-muted overflow-hidden">
            {v.thumbnail_url ? (
              <img
                src={v.thumbnail_url}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Video className="h-8 w-8" />
              </div>
            )}
            {showRank && (
              <Badge className="absolute top-2 left-2 bg-amber-500 text-white">#{idx + 1}</Badge>
            )}
            {v.duration_seconds && (
              <Badge className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] tabular-nums">
                {fmtDuration(v.duration_seconds)}
              </Badge>
            )}
            <ExternalLink className="absolute top-2 right-2 h-3.5 w-3.5 text-white/0 group-hover:text-white/80 transition-colors drop-shadow" />
          </div>
          <div className="p-3 space-y-1.5">
            <p className="text-sm font-semibold line-clamp-2 leading-snug">{v.title ?? "Untitled"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{v.channel_title ?? "—"}</p>
            <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Eye className="h-3 w-3" /> {fmtNum(v.view_count)}
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <ThumbsUp className="h-3 w-3" /> {fmtNum(v.like_count)}
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <MessageSquare className="h-3 w-3" /> {fmtNum(v.comment_count)}
              </span>
              {v.published_at && (
                <span className="ml-auto text-[10px]">
                  {formatDistanceToNow(new Date(v.published_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
    {canLoadMore && onLoadMore && (
      <div className="flex justify-center pt-2">
        <Button variant="outline" size="sm" onClick={onLoadMore} className="gap-1.5">
          <ChevronDown className="h-3.5 w-3.5" />
          Load 24 more · showing {videos.length}
        </Button>
      </div>
    )}
    </div>
  );
}

function ChannelsGrid({
  channels, loading, authorizedSet,
}: {
  channels: YouTubeChannel[];
  loading: boolean;
  authorizedSet: Set<string>;
}) {
  if (loading) return <Skeleton className="h-40 w-full" />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {channels.map((c) => {
        const isAuth = authorizedSet.has(c.channel_id);
        return (
          <Card key={c.id} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              {c.thumbnail_url ? (
                <img src={c.thumbnail_url} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                  <Youtube className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={`https://youtube.com/channel/${c.channel_id}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-sm font-semibold hover:underline truncate block"
                >
                  {c.title ?? c.channel_id}
                </a>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {c.custom_url ?? c.handle ?? c.channel_id}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground tabular-nums">
                  <span><Users className="h-3 w-3 inline mr-0.5" /> {fmtNum(c.subscriber_count)}</span>
                  <span><Eye className="h-3 w-3 inline mr-0.5" /> {fmtNum(c.view_count)}</span>
                  <span><Video className="h-3 w-3 inline mr-0.5" /> {c.video_count}</span>
                  {!c.is_active && <Badge variant="outline" className="text-[9px]">paused</Badge>}
                  {isAuth && (
                    <Badge variant="outline" className="text-[9px] gap-0.5 border-emerald-500/30 bg-emerald-500/15 text-emerald-700">
                      <ShieldCheck className="h-2.5 w-2.5" /> Analytics
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
