import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface YouTubeChannel {
  id: string;
  startup_id: string;
  channel_id: string;
  handle: string | null;
  title: string | null;
  description: string | null;
  custom_url: string | null;
  country: string | null;
  thumbnail_url: string | null;
  subscriber_count: number;
  view_count: number;
  video_count: number;
  uploads_playlist: string | null;
  channel_created: string | null;
  is_monetized: boolean;
  is_active: boolean;
  last_synced_at: string | null;
}

export interface YouTubeVideo {
  id: string;
  channel_uuid: string;
  video_id: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  duration_seconds: number | null;
  tags: string[];
  category_id: string | null;
  privacy: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  last_synced_at: string | null;
}

export interface YouTubeVideoWithChannel extends YouTubeVideo {
  channel_title: string | null;
  channel_id: string | null;
  channel_thumbnail: string | null;
}

export interface YouTubeVideoSnapshot {
  id: string;
  video_uuid: string;
  snapshot_date: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  delta_views: number | null;
}

// ── Channels ──────────────────────────────────────────────────────────────

export function useYouTubeChannels(startupId: string | undefined) {
  // Note: realtime subscription removed because the Supabase client's
  // channel pattern conflicts with React Strict Mode's double-invoke of
  // useEffect. All our mutations (useTriggerYouTubeSync, useAddYouTubeChannel,
  // etc.) already invalidate this query on success, so the dashboard stays
  // fresh without needing realtime here.
  return useQuery({
    queryKey: ["youtube-channels", startupId],
    enabled: !!startupId,
    queryFn: async (): Promise<YouTubeChannel[]> => {
      const { data, error } = await supabase
        .from("connector_data_youtube_channels")
        .select("*")
        .eq("startup_id", startupId!)
        .order("subscriber_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as YouTubeChannel[];
    },
  });
}

export function useAddYouTubeChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      startupId,
      channelId,
      title,
    }: {
      startupId: string;
      channelId: string;
      title?: string;
    }) => {
      const { error } = await supabase.from("connector_data_youtube_channels").upsert(
        {
          startup_id: startupId,
          channel_id: channelId,
          title: title ?? null,
          is_active: true,
        } as any,
        { onConflict: "startup_id,channel_id" }
      );
      if (error) throw error;
      return startupId;
    },
    onSuccess: (startupId) => {
      qc.invalidateQueries({ queryKey: ["youtube-channels", startupId] });
    },
  });
}

export function useToggleChannelActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      startupId,
      isActive,
    }: {
      id: string;
      startupId: string;
      isActive: boolean;
    }) => {
      const { error } = await supabase
        .from("connector_data_youtube_channels")
        .update({ is_active: isActive } as any)
        .eq("id", id);
      if (error) throw error;
      return startupId;
    },
    onSuccess: (startupId) => {
      qc.invalidateQueries({ queryKey: ["youtube-channels", startupId] });
    },
  });
}

// ── Videos ────────────────────────────────────────────────────────────────

export function useYouTubeVideosForChannel(channelUuid: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["youtube-videos-for-channel", channelUuid, limit],
    enabled: !!channelUuid,
    queryFn: async (): Promise<YouTubeVideo[]> => {
      const { data, error } = await supabase
        .from("connector_data_youtube_videos")
        .select("*")
        .eq("channel_uuid", channelUuid!)
        .order("published_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as YouTubeVideo[];
    },
  });
}

// Recent uploads across the startup. When channelUuid is passed, restrict
// to that one channel (otherwise include all the startup's channels).
export function useRecentYouTubeUploads(
  startupId: string | undefined,
  limit = 24,
  channelUuid?: string | null
) {
  return useQuery({
    queryKey: ["youtube-recent-uploads", startupId, limit, channelUuid ?? "all"],
    enabled: !!startupId,
    queryFn: async (): Promise<YouTubeVideoWithChannel[]> => {
      // Resolve which channels we're querying
      const { data: channels } = await supabase
        .from("connector_data_youtube_channels")
        .select("id, title, channel_id, thumbnail_url")
        .eq("startup_id", startupId!);
      const allChannels = channels ?? [];
      const filtered = channelUuid
        ? allChannels.filter((c: any) => c.id === channelUuid)
        : allChannels;
      const channelIds = filtered.map((c: any) => c.id);
      if (channelIds.length === 0) return [];
      const channelMap = new Map(allChannels.map((c: any) => [c.id, c]));

      const { data: videos, error } = await supabase
        .from("connector_data_youtube_videos")
        .select("*")
        // cap: URL limit @200 (channel list is ~7 per startup, far below cap)
        .in("channel_uuid", channelIds)
        .order("published_at", { ascending: false })
        .limit(limit);
      if (error) throw error;

      return (videos ?? []).map((v: any) => {
        const c = channelMap.get(v.channel_uuid) as any;
        return {
          ...v,
          channel_title: c?.title ?? null,
          channel_id: c?.channel_id ?? null,
          channel_thumbnail: c?.thumbnail_url ?? null,
        };
      });
    },
  });
}

// Top videos by view count. channelUuid optional, same semantics.
export function useTopYouTubeVideos(
  startupId: string | undefined,
  limit = 24,
  channelUuid?: string | null
) {
  return useQuery({
    queryKey: ["youtube-top-videos", startupId, limit, channelUuid ?? "all"],
    enabled: !!startupId,
    queryFn: async (): Promise<YouTubeVideoWithChannel[]> => {
      const { data: channels } = await supabase
        .from("connector_data_youtube_channels")
        .select("id, title, channel_id, thumbnail_url")
        .eq("startup_id", startupId!);
      const allChannels = channels ?? [];
      const filtered = channelUuid
        ? allChannels.filter((c: any) => c.id === channelUuid)
        : allChannels;
      const channelIds = filtered.map((c: any) => c.id);
      if (channelIds.length === 0) return [];
      const channelMap = new Map(allChannels.map((c: any) => [c.id, c]));

      const { data: videos, error } = await supabase
        .from("connector_data_youtube_videos")
        .select("*")
        // cap: URL limit @200 (channel list is ~7 per startup, far below cap)
        .in("channel_uuid", channelIds)
        .order("view_count", { ascending: false })
        .limit(limit);
      if (error) throw error;

      return (videos ?? []).map((v: any) => {
        const c = channelMap.get(v.channel_uuid) as any;
        return {
          ...v,
          channel_title: c?.title ?? null,
          channel_id: c?.channel_id ?? null,
          channel_thumbnail: c?.thumbnail_url ?? null,
        };
      });
    },
  });
}

// Time-series for one video — used for view velocity chart later
export function useYouTubeVideoSnapshots(videoUuid: string | undefined, days = 30) {
  return useQuery({
    queryKey: ["youtube-video-snapshots", videoUuid, days],
    enabled: !!videoUuid,
    queryFn: async (): Promise<YouTubeVideoSnapshot[]> => {
      const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("connector_data_youtube_video_snapshots")
        .select("*")
        .eq("video_uuid", videoUuid!)
        .gte("snapshot_date", since)
        .order("snapshot_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as YouTubeVideoSnapshot[];
    },
  });
}

// ── Mutations: discovery + sync ───────────────────────────────────────────

// supabase.functions.invoke swallows the response body when status is 4xx/5xx
// and just throws "Edge Function returned a non-2xx status code". Pull the
// real error message out of error.context.body so we can show it.
async function extractFnError(error: any): Promise<Error> {
  const ctx = error?.context;
  if (ctx) {
    try {
      // ctx.body can be a string OR a ReadableStream depending on supabase-js version
      let bodyText = "";
      if (typeof ctx.body === "string") {
        bodyText = ctx.body;
      } else if (ctx.text) {
        bodyText = await ctx.text();
      } else if (ctx.json) {
        bodyText = JSON.stringify(await ctx.json());
      }
      if (bodyText) {
        try {
          const parsed = JSON.parse(bodyText);
          if (parsed?.error) return new Error(parsed.error);
        } catch {
          return new Error(bodyText.slice(0, 300));
        }
      }
    } catch {
      /* fall through */
    }
  }
  return new Error(error?.message ?? "Edge function failed");
}

export function useTriggerYouTubeDiscovery() {
  return useMutation({
    mutationFn: async ({
      startupId,
      channelInput,
    }: {
      startupId: string;
      channelInput: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("youtube-discovery", {
        body: { startup_id: startupId, channel_input: channelInput },
      });
      if (error) throw await extractFnError(error);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
  });
}

export function useTriggerYouTubeSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ startupId }: { startupId: string }) => {
      const { data, error } = await supabase.functions.invoke("youtube-sync", {
        body: { startup_id: startupId },
      });
      if (error) throw await extractFnError(error);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["youtube-channels", vars.startupId] });
      qc.invalidateQueries({ queryKey: ["youtube-recent-uploads", vars.startupId] });
      qc.invalidateQueries({ queryKey: ["youtube-top-videos", vars.startupId] });
    },
  });
}

// ── Connector credentials (API key setup) ─────────────────────────────────

export function useYouTubeCredentials(startupId: string | undefined) {
  return useQuery({
    queryKey: ["youtube-credentials", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connector_credentials")
        .select("id, label, is_active, last_synced_at, last_sync_error")
        .eq("startup_id", startupId!)
        .eq("connector_type", "youtube")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ── Tier 2: Analytics + OAuth ─────────────────────────────────────────────

export interface ChannelAnalyticsRow {
  id: string;
  channel_uuid: string;
  date: string;
  views: number;
  estimated_minutes_watched: number;
  average_view_duration_sec: number | null;
  subscribers_gained: number;
  subscribers_lost: number;
  likes: number;
  shares: number;
  comments: number;
  impressions: number | null;
  impressions_ctr: number | null;
  estimated_revenue_usd: number | null;
  estimated_ad_revenue_usd: number | null;
  cpm_usd: number | null;
}

export interface VideoAnalyticsRow {
  id: string;
  video_uuid: string;
  date: string;
  views: number;
  estimated_minutes_watched: number;
  average_view_duration_sec: number | null;
  average_view_percentage: number | null;
  likes: number;
  comments: number;
  shares: number;
  subscribers_gained: number;
  subscribers_lost: number;
  estimated_revenue_usd: number | null;
  cpm_usd: number | null;
}

// All authorized channels (has an OAuth token row).
// Reads via SECURITY DEFINER RPC because the underlying connector_youtube_oauth
// table has RLS denying all client reads (protects the tokens). The RPC
// only returns channel_ids — never the secrets.
export function useAuthorizedChannelIds(startupId: string | undefined) {
  return useQuery({
    queryKey: ["youtube-authorized", startupId],
    enabled: !!startupId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.rpc(
        "get_authorized_youtube_channels",
        { p_startup_id: startupId! }
      );
      if (error) throw error;
      return ((data ?? []) as Array<{ channel_id: string }>).map((r) => r.channel_id);
    },
  });
}

// Daily channel-level analytics for the last N days
export function useChannelAnalytics(channelUuid: string | undefined, days = 30) {
  return useQuery({
    queryKey: ["youtube-channel-analytics", channelUuid, days],
    enabled: !!channelUuid,
    queryFn: async (): Promise<ChannelAnalyticsRow[]> => {
      const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("connector_data_youtube_channel_analytics")
        .select("*")
        .eq("channel_uuid", channelUuid!)
        .gte("date", since)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChannelAnalyticsRow[];
    },
  });
}

// ── Pulse: most-recent-day vs 7-day baseline + channel anomalies ──────────

export interface PulseMetricSnapshot {
  views: number;
  estimated_minutes_watched: number;
  estimated_revenue_usd: number;
  subscribers_gained: number;
  subscribers_lost: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface PulseTrendPoint extends PulseMetricSnapshot {
  date: string;
}

export interface PulseAnomaly {
  channel_uuid: string;
  channel_title: string | null;
  channel_thumbnail: string | null;
  metric: keyof PulseMetricSnapshot;
  current: number;
  baseline: number;
  delta_pct: number; // signed; positive = above baseline
}

export interface PulseChannelRow {
  channel_uuid: string;
  channel_title: string | null;
  channel_thumbnail: string | null;
  current: PulseMetricSnapshot;          // that channel's latest-day metrics
  baseline: PulseMetricSnapshot;         // that channel's N-day baseline
  delta_pct: PulseMetricSnapshot;        // signed % delta per metric
}

export interface PulseSnapshot {
  latest_date: string | null;            // most recent day with data
  current: PulseMetricSnapshot;          // sums across channels on latest_date
  baseline: PulseMetricSnapshot;         // avg of latest_date-1 .. latest_date-7
  delta_pct: PulseMetricSnapshot;        // signed % change; 0 if baseline is 0
  trend: PulseTrendPoint[];              // last 14 days, oldest → newest
  anomalies: PulseAnomaly[];             // top per-channel outliers
  per_channel: PulseChannelRow[];        // one row per channel in scope, sorted by views desc
}

function emptyMetrics(): PulseMetricSnapshot {
  return {
    views: 0, estimated_minutes_watched: 0, estimated_revenue_usd: 0,
    subscribers_gained: 0, subscribers_lost: 0, likes: 0, comments: 0, shares: 0,
  };
}

function pctDelta(current: number, baseline: number): number {
  if (baseline === 0) return current === 0 ? 0 : 100;
  return ((current - baseline) / baseline) * 100;
}

export function usePulseSnapshot(
  startupId: string | undefined,
  channelUuid?: string | null,
  baselineDays: number = 7
) {
  return useQuery({
    queryKey: ["youtube-pulse", startupId, channelUuid ?? "all", baselineDays],
    enabled: !!startupId,
    queryFn: async (): Promise<PulseSnapshot> => {
      // Fetch enough days to cover (1 current + baselineDays baseline) with
      // a small buffer so the latest-day detection is robust even if YouTube
      // hasn't reported the last calendar day yet.
      const fetchWindow = baselineDays + 7;

      // 1. Channels in scope
      const { data: channels } = await supabase
        .from("connector_data_youtube_channels")
        .select("id, title, thumbnail_url")
        .eq("startup_id", startupId!);
      const allChannels = (channels ?? []) as Array<{
        id: string; title: string | null; thumbnail_url: string | null;
      }>;
      const scoped = channelUuid
        ? allChannels.filter((c) => c.id === channelUuid)
        : allChannels;
      const ids = scoped.map((c) => c.id);
      const channelMap = new Map(allChannels.map((c) => [c.id, c]));

      const empty: PulseSnapshot = {
        latest_date: null,
        current: emptyMetrics(),
        baseline: emptyMetrics(),
        delta_pct: emptyMetrics(),
        trend: [],
        anomalies: [],
        per_channel: [],
      };
      if (ids.length === 0) return empty;

      // 2. Last fetchWindow days of channel analytics for those channels
      const since = new Date(Date.now() - fetchWindow * 864e5).toISOString().slice(0, 10);
      const { data: rows, error } = await supabase
        .from("connector_data_youtube_channel_analytics")
        .select("*")
        // cap: URL limit @200 (channel list is ~7 per startup, far below cap)
        .in("channel_uuid", ids)
        .gte("date", since)
        .order("date", { ascending: true });
      if (error) throw error;
      const analytics = (rows ?? []) as ChannelAnalyticsRow[];
      if (analytics.length === 0) return empty;

      // 3. Aggregate per-date sums across channels in scope
      const byDate = new Map<string, PulseMetricSnapshot>();
      for (const r of analytics) {
        const cur = byDate.get(r.date) ?? emptyMetrics();
        cur.views += Number(r.views ?? 0);
        cur.estimated_minutes_watched += Number(r.estimated_minutes_watched ?? 0);
        cur.estimated_revenue_usd += Number(r.estimated_revenue_usd ?? 0);
        cur.subscribers_gained += Number(r.subscribers_gained ?? 0);
        cur.subscribers_lost += Number(r.subscribers_lost ?? 0);
        cur.likes += Number(r.likes ?? 0);
        cur.comments += Number(r.comments ?? 0);
        cur.shares += Number(r.shares ?? 0);
        byDate.set(r.date, cur);
      }

      const sortedDates = Array.from(byDate.keys()).sort();
      const latest_date = sortedDates[sortedDates.length - 1];
      const current = byDate.get(latest_date)!;

      // 4. Baseline = avg of the N days immediately before latest_date
      const baselineDates = sortedDates.slice(-(baselineDays + 1), -1);
      const baseline = emptyMetrics();
      if (baselineDates.length > 0) {
        for (const d of baselineDates) {
          const m = byDate.get(d)!;
          baseline.views += m.views;
          baseline.estimated_minutes_watched += m.estimated_minutes_watched;
          baseline.estimated_revenue_usd += m.estimated_revenue_usd;
          baseline.subscribers_gained += m.subscribers_gained;
          baseline.subscribers_lost += m.subscribers_lost;
          baseline.likes += m.likes;
          baseline.comments += m.comments;
          baseline.shares += m.shares;
        }
        const n = baselineDates.length;
        baseline.views /= n;
        baseline.estimated_minutes_watched /= n;
        baseline.estimated_revenue_usd /= n;
        baseline.subscribers_gained /= n;
        baseline.subscribers_lost /= n;
        baseline.likes /= n;
        baseline.comments /= n;
        baseline.shares /= n;
      }

      const delta_pct: PulseMetricSnapshot = {
        views: pctDelta(current.views, baseline.views),
        estimated_minutes_watched: pctDelta(current.estimated_minutes_watched, baseline.estimated_minutes_watched),
        estimated_revenue_usd: pctDelta(current.estimated_revenue_usd, baseline.estimated_revenue_usd),
        subscribers_gained: pctDelta(current.subscribers_gained, baseline.subscribers_gained),
        subscribers_lost: pctDelta(current.subscribers_lost, baseline.subscribers_lost),
        likes: pctDelta(current.likes, baseline.likes),
        comments: pctDelta(current.comments, baseline.comments),
        shares: pctDelta(current.shares, baseline.shares),
      };

      const trend: PulseTrendPoint[] = sortedDates.map((d) => ({ date: d, ...byDate.get(d)! }));

      // 5. Per-channel breakdown + anomaly detection. Both run in every mode:
      //    - All channels: per_channel powers the breakdown rows, anomalies
      //      surface top movers across the whole startup.
      //    - Single channel: per_channel has one entry, anomalies surface
      //      which of that channel's metrics moved sharply.
      const anomalies: PulseAnomaly[] = [];
      const per_channel: PulseChannelRow[] = [];
      const byChannelDate = new Map<string, Map<string, PulseMetricSnapshot>>();
      for (const r of analytics) {
        if (!byChannelDate.has(r.channel_uuid)) byChannelDate.set(r.channel_uuid, new Map());
        const m = byChannelDate.get(r.channel_uuid)!;
        const cur = m.get(r.date) ?? emptyMetrics();
        cur.views += Number(r.views ?? 0);
        cur.estimated_minutes_watched += Number(r.estimated_minutes_watched ?? 0);
        cur.estimated_revenue_usd += Number(r.estimated_revenue_usd ?? 0);
        cur.subscribers_gained += Number(r.subscribers_gained ?? 0);
        cur.likes += Number(r.likes ?? 0);
        cur.comments += Number(r.comments ?? 0);
        cur.shares += Number(r.shares ?? 0);
        cur.subscribers_lost += Number(r.subscribers_lost ?? 0);
        m.set(r.date, cur);
      }
      const focusMetrics: Array<keyof PulseMetricSnapshot> = [
        "views", "estimated_revenue_usd", "estimated_minutes_watched", "subscribers_gained",
      ];
      const allMetrics: Array<keyof PulseMetricSnapshot> = [
        "views", "estimated_minutes_watched", "estimated_revenue_usd",
        "subscribers_gained", "likes", "comments",
      ];
      for (const [cid, dateMap] of byChannelDate.entries()) {
        const dates = Array.from(dateMap.keys()).sort();
        if (dates.length < 2) continue;
        const last = dates[dates.length - 1];
        const baseDates = dates.slice(-(baselineDays + 1), -1);
        if (baseDates.length === 0) continue;
        const cur = dateMap.get(last)!;
        // Full baseline avg for all metrics — used by the breakdown rows
        const base = emptyMetrics();
        for (const d of baseDates) {
          const m = dateMap.get(d)!;
          base.views += m.views;
          base.estimated_minutes_watched += m.estimated_minutes_watched;
          base.estimated_revenue_usd += m.estimated_revenue_usd;
          base.subscribers_gained += m.subscribers_gained;
          base.subscribers_lost += m.subscribers_lost;
          base.likes += m.likes;
          base.comments += m.comments;
          base.shares += m.shares;
        }
        const n = baseDates.length;
        base.views /= n;
        base.estimated_minutes_watched /= n;
        base.estimated_revenue_usd /= n;
        base.subscribers_gained /= n;
        base.subscribers_lost /= n;
        base.likes /= n;
        base.comments /= n;
        base.shares /= n;

        const channel = channelMap.get(cid);

        // Record the per-channel snapshot for the breakdown rows
        const channelDelta: PulseMetricSnapshot = {
          views: pctDelta(cur.views, base.views),
          estimated_minutes_watched: pctDelta(cur.estimated_minutes_watched, base.estimated_minutes_watched),
          estimated_revenue_usd: pctDelta(cur.estimated_revenue_usd, base.estimated_revenue_usd),
          subscribers_gained: pctDelta(cur.subscribers_gained, base.subscribers_gained),
          subscribers_lost: pctDelta(cur.subscribers_lost, base.subscribers_lost),
          likes: pctDelta(cur.likes, base.likes),
          comments: pctDelta(cur.comments, base.comments),
          shares: pctDelta(cur.shares, base.shares),
        };
        per_channel.push({
          channel_uuid: cid,
          channel_title: channel?.title ?? null,
          channel_thumbnail: channel?.thumbnail_url ?? null,
          current: cur,
          baseline: base,
          delta_pct: channelDelta,
        });

        // Anomaly check on focus metrics only
        for (const m of focusMetrics) {
          const cv = (cur as any)[m] as number;
          const bv = (base as any)[m] as number;
          // Skip noise: tiny absolute numbers shouldn't trigger anomalies
          if (Math.abs(cv) < 10 && Math.abs(bv) < 10) continue;
          const pct = pctDelta(cv, bv);
          if (Math.abs(pct) >= 50) {
            anomalies.push({
              channel_uuid: cid,
              channel_title: channel?.title ?? null,
              channel_thumbnail: channel?.thumbnail_url ?? null,
              metric: m,
              current: cv,
              baseline: bv,
              delta_pct: pct,
            });
          }
        }
      }
      anomalies.sort((a, b) => Math.abs(b.delta_pct) - Math.abs(a.delta_pct));
      per_channel.sort((a, b) => b.current.views - a.current.views);

      return {
        latest_date,
        current,
        baseline,
        delta_pct,
        trend,
        anomalies: anomalies.slice(0, 5),
        per_channel,
      };
    },
  });
}

// ── Audience: demographics + geography + devices + traffic sources ────────

export interface AudienceDemoRow {
  age_group: string;             // e.g. "age25-34"
  gender: string;                // "male" | "female" | "user_specified"
  viewer_percentage: number;     // 0–100; avg across channels in scope
}

export interface AudienceGeoRow {
  country_code: string;
  views: number;
  estimated_minutes_watched: number;
  estimated_revenue_usd: number | null;
}

export interface AudienceDeviceRow {
  device_type: string;           // "MOBILE", "DESKTOP", "TV", "TABLET", etc.
  views: number;
  estimated_minutes_watched: number;
}

export interface AudienceTrafficRow {
  source_type: string;           // YouTube insightTrafficSourceType codes
  views: number;
  estimated_minutes_watched: number;
}

export interface AudienceSnapshot {
  latest_period_end: string | null;
  demographics: AudienceDemoRow[];
  geography: AudienceGeoRow[];
  devices: AudienceDeviceRow[];
  traffic_sources: AudienceTrafficRow[];
}

export function useAudienceSnapshot(
  startupId: string | undefined,
  channelUuid?: string | null
) {
  return useQuery({
    queryKey: ["youtube-audience", startupId, channelUuid ?? "all"],
    enabled: !!startupId,
    queryFn: async (): Promise<AudienceSnapshot> => {
      // Resolve channel scope
      const { data: channels } = await supabase
        .from("connector_data_youtube_channels")
        .select("id")
        .eq("startup_id", startupId!);
      const all = (channels ?? []) as Array<{ id: string }>;
      const scoped = channelUuid ? all.filter((c) => c.id === channelUuid) : all;
      const ids = scoped.map((c) => c.id);

      const empty: AudienceSnapshot = {
        latest_period_end: null,
        demographics: [],
        geography: [],
        devices: [],
        traffic_sources: [],
      };
      if (ids.length === 0) return empty;

      // Four tables in parallel — small payloads, all keyed by channel_uuid + period_end_date
      // cap: URL limit @200 (each .in() below carries the ~7-channel id list)
      const [demoRes, geoRes, devRes, trafRes] = await Promise.all([
        supabase.from("connector_data_youtube_demographics")
          .select("channel_uuid, period_end_date, age_group, gender, viewer_percentage")
          .in("channel_uuid", ids)
          .order("period_end_date", { ascending: false }),
        supabase.from("connector_data_youtube_geography")
          .select("channel_uuid, period_end_date, country_code, views, estimated_minutes_watched, estimated_revenue_usd")
          .in("channel_uuid", ids)
          .order("period_end_date", { ascending: false }),
        supabase.from("connector_data_youtube_device_types")
          .select("channel_uuid, period_end_date, device_type, views, estimated_minutes_watched")
          .in("channel_uuid", ids)
          .order("period_end_date", { ascending: false }),
        supabase.from("connector_data_youtube_traffic_sources")
          .select("channel_uuid, period_end_date, source_type, views, estimated_minutes_watched")
          .in("channel_uuid", ids)
          .order("period_end_date", { ascending: false }),
      ]);
      if (demoRes.error) throw demoRes.error;
      if (geoRes.error) throw geoRes.error;
      if (devRes.error) throw devRes.error;
      if (trafRes.error) throw trafRes.error;

      // Identify the latest period_end_date that has data anywhere
      const allDates = new Set<string>();
      (demoRes.data ?? []).forEach((r: any) => allDates.add(r.period_end_date));
      (geoRes.data ?? []).forEach((r: any) => allDates.add(r.period_end_date));
      (devRes.data ?? []).forEach((r: any) => allDates.add(r.period_end_date));
      (trafRes.data ?? []).forEach((r: any) => allDates.add(r.period_end_date));
      const sortedDates = Array.from(allDates).sort();
      const latest = sortedDates[sortedDates.length - 1] ?? null;
      if (!latest) return empty;

      // ── Demographics ────────────────────────────
      // viewer_percentage is per-channel %; averaging across channels is a fair
      // approximation for combined audience. (Strictly correct would be a
      // views-weighted average — defer until/unless this matters in practice.)
      const demoLatest = (demoRes.data ?? []).filter((r: any) => r.period_end_date === latest);
      const demoAccum = new Map<string, { sum: number; n: number }>();
      for (const r of demoLatest) {
        const key = `${r.age_group}|${r.gender}`;
        const cur = demoAccum.get(key) ?? { sum: 0, n: 0 };
        cur.sum += Number(r.viewer_percentage ?? 0);
        cur.n += 1;
        demoAccum.set(key, cur);
      }
      const demographics: AudienceDemoRow[] = Array.from(demoAccum.entries()).map(([k, v]) => {
        const [age_group, gender] = k.split("|");
        return { age_group, gender, viewer_percentage: v.sum / v.n };
      });

      // ── Geography ────────────────────────────────
      const geoLatest = (geoRes.data ?? []).filter((r: any) => r.period_end_date === latest);
      const geoAccum = new Map<string, AudienceGeoRow>();
      for (const r of geoLatest) {
        const cur = geoAccum.get(r.country_code) ?? {
          country_code: r.country_code,
          views: 0,
          estimated_minutes_watched: 0,
          estimated_revenue_usd: 0,
        };
        cur.views += Number(r.views ?? 0);
        cur.estimated_minutes_watched += Number(r.estimated_minutes_watched ?? 0);
        if (r.estimated_revenue_usd != null) {
          cur.estimated_revenue_usd = (cur.estimated_revenue_usd ?? 0) + Number(r.estimated_revenue_usd);
        }
        geoAccum.set(r.country_code, cur);
      }
      const geography = Array.from(geoAccum.values()).sort((a, b) => b.views - a.views);

      // ── Devices ──────────────────────────────────
      const devLatest = (devRes.data ?? []).filter((r: any) => r.period_end_date === latest);
      const devAccum = new Map<string, AudienceDeviceRow>();
      for (const r of devLatest) {
        const cur = devAccum.get(r.device_type) ?? {
          device_type: r.device_type, views: 0, estimated_minutes_watched: 0,
        };
        cur.views += Number(r.views ?? 0);
        cur.estimated_minutes_watched += Number(r.estimated_minutes_watched ?? 0);
        devAccum.set(r.device_type, cur);
      }
      const devices = Array.from(devAccum.values()).sort((a, b) => b.views - a.views);

      // ── Traffic sources ──────────────────────────
      const trafLatest = (trafRes.data ?? []).filter((r: any) => r.period_end_date === latest);
      const trafAccum = new Map<string, AudienceTrafficRow>();
      for (const r of trafLatest) {
        const cur = trafAccum.get(r.source_type) ?? {
          source_type: r.source_type, views: 0, estimated_minutes_watched: 0,
        };
        cur.views += Number(r.views ?? 0);
        cur.estimated_minutes_watched += Number(r.estimated_minutes_watched ?? 0);
        trafAccum.set(r.source_type, cur);
      }
      const traffic_sources = Array.from(trafAccum.values()).sort((a, b) => b.views - a.views);

      return {
        latest_period_end: latest,
        demographics,
        geography,
        devices,
        traffic_sources,
      };
    },
  });
}

// ── Retention: per-video audience drop-off curves ────────────────────────

export interface RetentionPoint {
  elapsed_ratio: number;             // 0.0 – 1.0
  audience_watch_ratio: number;      // fraction of original audience still watching
  relative_retention_performance: number | null; // vs comparable videos, may be NULL
}

export interface VideoRetentionCurve {
  video_uuid: string;
  video_id: string;
  video_title: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  channel_uuid: string;
  channel_title: string | null;
  channel_thumbnail: string | null;
  view_count: number;
  // Curve and derived metrics
  points: RetentionPoint[];
  avg_audience_watch_ratio: number;        // mean of audience_watch_ratio across points
  retention_at_50pct: number | null;       // ratio at elapsed_ratio nearest 0.5
  retention_at_25pct: number | null;       // ratio at elapsed_ratio nearest 0.25
  retention_at_75pct: number | null;       // ratio at elapsed_ratio nearest 0.75
  avg_relative_performance: number | null; // mean across points, when available
}

export function useRetentionCurves(
  startupId: string | undefined,
  channelUuid?: string | null
) {
  return useQuery({
    queryKey: ["youtube-retention", startupId, channelUuid ?? "all"],
    enabled: !!startupId,
    queryFn: async (): Promise<VideoRetentionCurve[]> => {
      // 1. Channels in scope
      const { data: channels } = await supabase
        .from("connector_data_youtube_channels")
        .select("id, title, thumbnail_url")
        .eq("startup_id", startupId!);
      const all = (channels ?? []) as Array<{
        id: string; title: string | null; thumbnail_url: string | null;
      }>;
      const scoped = channelUuid ? all.filter((c) => c.id === channelUuid) : all;
      if (scoped.length === 0) return [];
      const channelMap = new Map(all.map((c) => [c.id, c]));
      const channelIds = scoped.map((c) => c.id);

      // 2. Videos in those channels — cap at 100 by views. Sync only stores
      // retention for the top 25; keeping this list short prevents the .in()
      // filter from exceeding URL length limits (629+ UUIDs → ~23 KB URL → 400).
      const { data: videos } = await supabase
        .from("connector_data_youtube_videos")
        .select("id, video_id, title, thumbnail_url, duration_seconds, published_at, channel_uuid, view_count")
        // cap: URL limit @200 (channel list is ~7 per startup, far below cap)
        .in("channel_uuid", channelIds)
        .order("view_count", { ascending: false })
        .limit(100);
      const videoList = (videos ?? []) as Array<{
        id: string; video_id: string; title: string | null;
        thumbnail_url: string | null; duration_seconds: number | null;
        published_at: string | null;
        channel_uuid: string; view_count: number;
      }>;
      const videoMap = new Map(videoList.map((v) => [v.id, v]));
      const videoUuids = videoList.map((v) => v.id);
      if (videoUuids.length === 0) return [];

      // 3. Retention rows for those videos. Order by date desc so the first
      // period_end_date we see (per video) is the most recent — we then keep
      // only that latest period per video.
      const { data: retention, error } = await supabase
        .from("connector_data_youtube_video_retention")
        .select("video_uuid, period_end_date, elapsed_video_time_ratio, audience_watch_ratio, relative_retention_performance")
        // cap: URL limit @200 (videoUuids capped at top-100 by views above)
        .in("video_uuid", videoUuids)
        .order("period_end_date", { ascending: false })
        .order("elapsed_video_time_ratio", { ascending: true });
      if (error) throw error;

      // 4. Group: video_uuid → only the latest period_end_date's rows
      const latestPeriodByVideo = new Map<string, string>();
      const pointsByVideo = new Map<string, RetentionPoint[]>();
      for (const r of retention ?? []) {
        const vid = (r as any).video_uuid as string;
        const pe = (r as any).period_end_date as string;
        const existing = latestPeriodByVideo.get(vid);
        if (existing && existing !== pe) continue; // skip older periods once we've seen latest
        if (!existing) {
          latestPeriodByVideo.set(vid, pe);
          pointsByVideo.set(vid, []);
        }
        pointsByVideo.get(vid)!.push({
          elapsed_ratio: Number((r as any).elapsed_video_time_ratio),
          audience_watch_ratio: Number((r as any).audience_watch_ratio),
          relative_retention_performance:
            (r as any).relative_retention_performance != null
              ? Number((r as any).relative_retention_performance)
              : null,
        });
      }

      // 5. Build the curves with derived metrics
      const curves: VideoRetentionCurve[] = [];
      for (const [vid, points] of pointsByVideo.entries()) {
        const v = videoMap.get(vid);
        if (!v || points.length === 0) continue;
        points.sort((a, b) => a.elapsed_ratio - b.elapsed_ratio);
        const avg =
          points.reduce((acc, p) => acc + p.audience_watch_ratio, 0) / points.length;
        const findAt = (target: number) => {
          // Closest point to target elapsed_ratio
          let best = points[0];
          for (const p of points) {
            if (Math.abs(p.elapsed_ratio - target) < Math.abs(best.elapsed_ratio - target)) best = p;
          }
          return best.audience_watch_ratio;
        };
        const relPerf = points
          .map((p) => p.relative_retention_performance)
          .filter((x): x is number => x != null);
        const channel = channelMap.get(v.channel_uuid);
        curves.push({
          video_uuid: vid,
          video_id: v.video_id,
          video_title: v.title,
          thumbnail_url: v.thumbnail_url,
          duration_seconds: v.duration_seconds,
          published_at: v.published_at,
          channel_uuid: v.channel_uuid,
          channel_title: channel?.title ?? null,
          channel_thumbnail: channel?.thumbnail_url ?? null,
          view_count: v.view_count,
          points,
          avg_audience_watch_ratio: avg,
          retention_at_25pct: points.length > 0 ? findAt(0.25) : null,
          retention_at_50pct: points.length > 0 ? findAt(0.5) : null,
          retention_at_75pct: points.length > 0 ? findAt(0.75) : null,
          avg_relative_performance:
            relPerf.length > 0 ? relPerf.reduce((a, b) => a + b, 0) / relPerf.length : null,
        });
      }

      // Default: sort by views desc so highest-impact videos are first
      curves.sort((a, b) => b.view_count - a.view_count);
      return curves;
    },
  });
}

// ── Content lab: upload-timing heatmap, title-length, duration, tags ──────

export interface ContentLabHeatCell {
  day_of_week: number;       // 0 = Sunday, 6 = Saturday (local tz)
  hour_of_day: number;       // 0-23 (local tz)
  video_count: number;
  avg_views: number;
  total_views: number;
}

export interface ContentLabBucket {
  label: string;
  min: number;               // chars or seconds, depending on context
  max: number | null;        // null = open-ended top bucket
  video_count: number;
  avg_views: number;
  median_views: number;
  avg_view_percentage: number | null;
}

export interface ContentLabTagRow {
  tag: string;
  video_count: number;
  avg_views: number;
  total_views: number;
}

export interface ContentLabData {
  videos_in_scope: number;
  videos_with_publish_time: number;
  timezone: string;          // IANA tz used for heatmap (e.g. "Asia/Kolkata")
  upload_heatmap: ContentLabHeatCell[];
  title_length_buckets: ContentLabBucket[];
  duration_buckets: ContentLabBucket[];
  top_tags: ContentLabTagRow[];
}

const TITLE_LENGTH_BUCKETS: Array<{ label: string; min: number; max: number | null }> = [
  { label: "≤30",     min: 0,   max: 30  },
  { label: "31–50",   min: 31,  max: 50  },
  { label: "51–70",   min: 51,  max: 70  },
  { label: "71–100",  min: 71,  max: 100 },
  { label: "100+",    min: 101, max: null },
];

const DURATION_BUCKETS: Array<{ label: string; min: number; max: number | null }> = [
  { label: "Shorts (<60s)", min: 0,    max: 59   },
  { label: "1–3 min",       min: 60,   max: 180  },
  { label: "3–10 min",      min: 181,  max: 600  },
  { label: "10–20 min",     min: 601,  max: 1200 },
  { label: "20+ min",       min: 1201, max: null },
];

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function useContentLab(
  startupId: string | undefined,
  channelUuid?: string | null
) {
  return useQuery({
    queryKey: ["youtube-content-lab", startupId, channelUuid ?? "all"],
    enabled: !!startupId,
    queryFn: async (): Promise<ContentLabData> => {
      const empty: ContentLabData = {
        videos_in_scope: 0,
        videos_with_publish_time: 0,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        upload_heatmap: [],
        title_length_buckets: [],
        duration_buckets: [],
        top_tags: [],
      };

      // 1. Channels in scope
      const { data: channels } = await supabase
        .from("connector_data_youtube_channels")
        .select("id")
        .eq("startup_id", startupId!);
      const all = (channels ?? []) as Array<{ id: string }>;
      const scoped = channelUuid ? all.filter((c) => c.id === channelUuid) : all;
      if (scoped.length === 0) return empty;
      const channelIds = scoped.map((c) => c.id);

      // 2. All videos for those channels
      const { data: videos, error } = await supabase
        .from("connector_data_youtube_videos")
        .select("id, title, tags, duration_seconds, published_at, view_count")
        // cap: URL limit @200 (channel list is ~7 per startup, far below cap)
        .in("channel_uuid", channelIds);
      if (error) throw error;
      const vids = (videos ?? []) as Array<{
        id: string;
        title: string | null;
        tags: string[] | null;
        duration_seconds: number | null;
        published_at: string | null;
        view_count: number;
      }>;
      if (vids.length === 0) return empty;

      // Optional: avg_view_percentage per video from latest analytics row.
      // Cap at 200 top-viewed to stay under URL length limits.
      const videoIds = vids
        .slice()
        .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
        .slice(0, 200)
        .map((v) => v.id);
      const { data: analytics } = await supabase
        .from("connector_data_youtube_video_analytics")
        .select("video_uuid, average_view_percentage, date")
        // cap: URL limit @200 (videoIds sliced to top-200 by views above)
        .in("video_uuid", videoIds);
      // Keep the most recent date per video
      const latestAvgPct = new Map<string, number>();
      const latestDateByVideo = new Map<string, string>();
      for (const a of analytics ?? []) {
        const vid = (a as any).video_uuid as string;
        const date = (a as any).date as string;
        const cur = latestDateByVideo.get(vid);
        if (!cur || date > cur) {
          latestDateByVideo.set(vid, date);
          if ((a as any).average_view_percentage != null) {
            latestAvgPct.set(vid, Number((a as any).average_view_percentage));
          }
        }
      }

      const localTz =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

      // ── 3. Upload-timing heatmap ──────────────────────────
      // Use Intl to convert published_at (UTC) to weekday/hour in viewer tz.
      // Build a lookup table of weekday(0-6) × hour(0-23).
      const heatBuckets = new Map<string, { count: number; totalViews: number }>();
      let withPublish = 0;
      const weekdayFmt = new Intl.DateTimeFormat("en-US", {
        timeZone: localTz, weekday: "short", hour: "2-digit", hour12: false,
      });
      const WEEKDAY_INDEX: Record<string, number> = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
      };
      for (const v of vids) {
        if (!v.published_at) continue;
        withPublish++;
        const parts = weekdayFmt.formatToParts(new Date(v.published_at));
        const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
        const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
        const day = WEEKDAY_INDEX[wd] ?? 0;
        const key = `${day}|${hour}`;
        const cur = heatBuckets.get(key) ?? { count: 0, totalViews: 0 };
        cur.count++;
        cur.totalViews += v.view_count;
        heatBuckets.set(key, cur);
      }
      const upload_heatmap: ContentLabHeatCell[] = [];
      for (const [key, val] of heatBuckets.entries()) {
        const [day, hour] = key.split("|").map(Number);
        upload_heatmap.push({
          day_of_week: day,
          hour_of_day: hour,
          video_count: val.count,
          total_views: val.totalViews,
          avg_views: val.count > 0 ? val.totalViews / val.count : 0,
        });
      }

      // ── 4. Title-length buckets ───────────────────────────
      const title_length_buckets: ContentLabBucket[] = TITLE_LENGTH_BUCKETS.map((b) => {
        const matches = vids.filter((v) => {
          const len = (v.title ?? "").length;
          return len >= b.min && (b.max == null || len <= b.max);
        });
        const views = matches.map((v) => v.view_count);
        return {
          label: b.label,
          min: b.min,
          max: b.max,
          video_count: matches.length,
          avg_views: matches.length > 0 ? views.reduce((a, b) => a + b, 0) / matches.length : 0,
          median_views: median(views),
          avg_view_percentage: null,
        };
      });

      // ── 5. Duration buckets ───────────────────────────────
      const duration_buckets: ContentLabBucket[] = DURATION_BUCKETS.map((b) => {
        const matches = vids.filter((v) => {
          const d = v.duration_seconds ?? 0;
          return d >= b.min && (b.max == null || d <= b.max);
        });
        const views = matches.map((v) => v.view_count);
        const pcts = matches
          .map((v) => latestAvgPct.get(v.id))
          .filter((x): x is number => x != null);
        return {
          label: b.label,
          min: b.min,
          max: b.max,
          video_count: matches.length,
          avg_views: matches.length > 0 ? views.reduce((a, b) => a + b, 0) / matches.length : 0,
          median_views: median(views),
          avg_view_percentage:
            pcts.length > 0 ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null,
        };
      });

      // ── 6. Top tags ──────────────────────────────────────
      const tagAccum = new Map<string, { count: number; totalViews: number }>();
      for (const v of vids) {
        if (!v.tags || v.tags.length === 0) continue;
        for (const raw of v.tags) {
          const tag = raw.trim().toLowerCase();
          if (!tag || tag.length < 2) continue;
          const cur = tagAccum.get(tag) ?? { count: 0, totalViews: 0 };
          cur.count++;
          cur.totalViews += v.view_count;
          tagAccum.set(tag, cur);
        }
      }
      const top_tags: ContentLabTagRow[] = Array.from(tagAccum.entries())
        .filter(([, v]) => v.count >= 3) // exclude tags that appear in <3 videos (noise)
        .map(([tag, v]) => ({
          tag,
          video_count: v.count,
          total_views: v.totalViews,
          avg_views: v.count > 0 ? v.totalViews / v.count : 0,
        }))
        .sort((a, b) => b.avg_views - a.avg_views)
        .slice(0, 25);

      return {
        videos_in_scope: vids.length,
        videos_with_publish_time: withPublish,
        timezone: localTz,
        upload_heatmap,
        title_length_buckets,
        duration_buckets,
        top_tags,
      };
    },
  });
}

// ── Cohort: age-normalized catalog performance ───────────────────────────

export type TrajectoryClass = "rising" | "steady" | "decaying" | "dead";

export interface CohortAgeBucket {
  label: string;
  min_days: number;
  max_days: number | null;
  video_count: number;
  recent_views: number;          // sum across videos in this bucket
  lifetime_views: number;
  share_recent_pct: number;      // % of total recent views from this bucket
}

export interface CohortChannelClassRow {
  channel_uuid: string;
  channel_title: string | null;
  channel_thumbnail: string | null;
  total: number;
  rising: number;
  steady: number;
  decaying: number;
  dead: number;
}

export interface CohortScatterPoint {
  video_uuid: string;
  video_id: string;
  title: string | null;
  thumbnail_url: string | null;
  channel_uuid: string;
  channel_title: string | null;
  age_days: number;
  lifetime_views: number;
  recent_views: number;
  trajectory: TrajectoryClass;
}

export interface CohortLongTailRow {
  video_uuid: string;
  video_id: string;
  title: string | null;
  thumbnail_url: string | null;
  channel_title: string | null;
  age_days: number;
  lifetime_views: number;
  recent_30d_views: number;
  lifetime_vpd: number;
  recent_vpd: number;
  lift_ratio: number;            // recent_vpd / lifetime_vpd; >1 = catching fresh attention
}

export interface CohortData {
  videos_in_scope: number;
  videos_with_recent: number;
  total_recent_views: number;
  total_lifetime_views: number;
  age_bucket_mix: CohortAgeBucket[];
  trajectory_totals: Record<TrajectoryClass, number>;
  by_channel: CohortChannelClassRow[];
  scatter: CohortScatterPoint[];
  long_tail_winners: CohortLongTailRow[];
}

const AGE_BUCKETS: Array<{ label: string; min: number; max: number | null }> = [
  { label: "0–7 days",    min: 0,    max: 7    },
  { label: "8–30 days",   min: 8,    max: 30   },
  { label: "1–3 months",  min: 31,   max: 90   },
  { label: "3–12 months", min: 91,   max: 365  },
  { label: "1+ year",     min: 366,  max: null },
];

function classifyTrajectory(
  lifetime_vpd: number,
  recent_vpd: number,
  age_days: number
): TrajectoryClass {
  // Avoid noise on brand-new videos: under 7 days old, just compare to itself
  if (age_days < 7) {
    return recent_vpd > 0 ? "rising" : "dead";
  }
  if (lifetime_vpd <= 0) return recent_vpd > 0 ? "rising" : "dead";
  const ratio = recent_vpd / lifetime_vpd;
  if (ratio >= 1.5) return "rising";
  if (ratio >= 0.5) return "steady";
  if (ratio >= 0.05) return "decaying";
  return "dead";
}

export function useCohortAnalysis(
  startupId: string | undefined,
  channelUuid?: string | null
) {
  return useQuery({
    queryKey: ["youtube-cohort", startupId, channelUuid ?? "all"],
    enabled: !!startupId,
    queryFn: async (): Promise<CohortData> => {
      const empty: CohortData = {
        videos_in_scope: 0,
        videos_with_recent: 0,
        total_recent_views: 0,
        total_lifetime_views: 0,
        age_bucket_mix: AGE_BUCKETS.map((b) => ({
          label: b.label, min_days: b.min, max_days: b.max,
          video_count: 0, recent_views: 0, lifetime_views: 0, share_recent_pct: 0,
        })),
        trajectory_totals: { rising: 0, steady: 0, decaying: 0, dead: 0 },
        by_channel: [],
        scatter: [],
        long_tail_winners: [],
      };

      // 1. Channels in scope
      const { data: channels } = await supabase
        .from("connector_data_youtube_channels")
        .select("id, title, thumbnail_url")
        .eq("startup_id", startupId!);
      const all = (channels ?? []) as Array<{
        id: string; title: string | null; thumbnail_url: string | null;
      }>;
      const scoped = channelUuid ? all.filter((c) => c.id === channelUuid) : all;
      if (scoped.length === 0) return empty;
      const channelMap = new Map(all.map((c) => [c.id, c]));
      const channelIds = scoped.map((c) => c.id);

      // 2. Videos in scope
      const { data: videos } = await supabase
        .from("connector_data_youtube_videos")
        .select("id, video_id, title, thumbnail_url, published_at, view_count, channel_uuid")
        // cap: URL limit @200 (channel list is ~7 per startup, far below cap)
        .in("channel_uuid", channelIds);
      const vids = (videos ?? []) as Array<{
        id: string; video_id: string; title: string | null;
        thumbnail_url: string | null; published_at: string | null;
        view_count: number; channel_uuid: string;
      }>;
      if (vids.length === 0) return empty;

      // 3. Latest analytics row per video (gives recent-30d views).
      // Cap at 200 top-viewed videos to keep the .in() URL under length limits.
      const videoIds = vids
        .slice()
        .sort((a, b) => b.view_count - a.view_count)
        .slice(0, 200)
        .map((v) => v.id);
      const { data: analytics } = await supabase
        .from("connector_data_youtube_video_analytics")
        .select("video_uuid, views, date")
        // cap: URL limit @200 (videoIds sliced to top-200 by views above)
        .in("video_uuid", videoIds);
      const latestRecentByVideo = new Map<string, number>();
      const latestDateByVideo = new Map<string, string>();
      for (const a of analytics ?? []) {
        const vid = (a as any).video_uuid as string;
        const date = (a as any).date as string;
        const cur = latestDateByVideo.get(vid);
        if (!cur || date > cur) {
          latestDateByVideo.set(vid, date);
          latestRecentByVideo.set(vid, Number((a as any).views ?? 0));
        }
      }

      const today = Date.now();
      const trajectoryTotals: Record<TrajectoryClass, number> = {
        rising: 0, steady: 0, decaying: 0, dead: 0,
      };
      const byChannel = new Map<string, CohortChannelClassRow>();
      for (const c of scoped) {
        byChannel.set(c.id, {
          channel_uuid: c.id,
          channel_title: c.title,
          channel_thumbnail: c.thumbnail_url,
          total: 0, rising: 0, steady: 0, decaying: 0, dead: 0,
        });
      }
      const scatter: CohortScatterPoint[] = [];
      const longTail: CohortLongTailRow[] = [];

      // Age-bucket accumulators
      const bucketAccum = AGE_BUCKETS.map((b) => ({
        ...b, video_count: 0, recent_views: 0, lifetime_views: 0,
      }));

      let totalRecent = 0;
      let totalLifetime = 0;
      let withRecent = 0;

      for (const v of vids) {
        if (!v.published_at) continue;
        const ageDays = Math.max(
          0,
          (today - new Date(v.published_at).getTime()) / 864e5
        );
        const recent = latestRecentByVideo.get(v.id) ?? 0;
        if (recent > 0) withRecent++;
        const lifetime = Number(v.view_count ?? 0);
        const lifetime_vpd = ageDays > 0 ? lifetime / ageDays : 0;
        const recent_vpd = recent / 30;
        const traj = classifyTrajectory(lifetime_vpd, recent_vpd, ageDays);

        totalRecent += recent;
        totalLifetime += lifetime;

        trajectoryTotals[traj]++;
        const row = byChannel.get(v.channel_uuid);
        if (row) {
          row.total++;
          row[traj]++;
        }

        // Bucket fit
        for (const b of bucketAccum) {
          if (ageDays >= b.min && (b.max == null || ageDays <= b.max)) {
            b.video_count++;
            b.recent_views += recent;
            b.lifetime_views += lifetime;
            break;
          }
        }

        // Scatter (cap at 800 points to keep recharts responsive)
        if (scatter.length < 800 && ageDays > 0 && lifetime > 0) {
          const ch = channelMap.get(v.channel_uuid);
          scatter.push({
            video_uuid: v.id,
            video_id: v.video_id,
            title: v.title,
            thumbnail_url: v.thumbnail_url,
            channel_uuid: v.channel_uuid,
            channel_title: ch?.title ?? null,
            age_days: Math.max(1, Math.round(ageDays)),
            lifetime_views: lifetime,
            recent_views: recent,
            trajectory: traj,
          });
        }

        // Long-tail consideration: only meaningful for videos > 30 days old
        // with non-zero recent views and a reasonable lifetime baseline
        if (ageDays > 30 && recent > 100 && lifetime_vpd > 0) {
          const ch = channelMap.get(v.channel_uuid);
          longTail.push({
            video_uuid: v.id,
            video_id: v.video_id,
            title: v.title,
            thumbnail_url: v.thumbnail_url,
            channel_title: ch?.title ?? null,
            age_days: Math.round(ageDays),
            lifetime_views: lifetime,
            recent_30d_views: recent,
            lifetime_vpd,
            recent_vpd,
            lift_ratio: recent_vpd / lifetime_vpd,
          });
        }
      }

      // Finalize bucket mix with share %
      const age_bucket_mix: CohortAgeBucket[] = bucketAccum.map((b) => ({
        label: b.label,
        min_days: b.min,
        max_days: b.max,
        video_count: b.video_count,
        recent_views: b.recent_views,
        lifetime_views: b.lifetime_views,
        share_recent_pct: totalRecent > 0 ? (b.recent_views / totalRecent) * 100 : 0,
      }));

      longTail.sort((a, b) => b.lift_ratio - a.lift_ratio);

      return {
        videos_in_scope: vids.length,
        videos_with_recent: withRecent,
        total_recent_views: totalRecent,
        total_lifetime_views: totalLifetime,
        age_bucket_mix,
        trajectory_totals: trajectoryTotals,
        by_channel: Array.from(byChannel.values()).sort((a, b) => b.total - a.total),
        scatter,
        long_tail_winners: longTail.slice(0, 25),
      };
    },
  });
}

// Top videos by revenue or watch time across the startup
export function useTopVideosByMetric(
  startupId: string | undefined,
  metric: "estimated_revenue_usd" | "estimated_minutes_watched" | "views",
  limit = 10
) {
  return useQuery({
    queryKey: ["youtube-top-by-metric", startupId, metric, limit],
    enabled: !!startupId,
    queryFn: async (): Promise<Array<VideoAnalyticsRow & {
      video_id: string;
      video_title: string | null;
      thumbnail_url: string | null;
      channel_title: string | null;
    }>> => {
      // Get channels for this startup
      const { data: channels } = await supabase
        .from("connector_data_youtube_channels")
        .select("id, title")
        .eq("startup_id", startupId!);
      if (!channels || channels.length === 0) return [];
      const channelMap = new Map((channels ?? []).map((c: any) => [c.id, c]));
      const channelIds = (channels ?? []).map((c: any) => c.id);

      // Get top videos for those channels — cap at 200 by view_count so the
      // subsequent .in("video_uuid", videoIds) stays within URL length limits.
      const { data: videos } = await supabase
        .from("connector_data_youtube_videos")
        .select("id, video_id, title, thumbnail_url, channel_uuid, view_count")
        // cap: URL limit @200 (channel list is ~7 per startup, far below cap)
        .in("channel_uuid", channelIds)
        .order("view_count", { ascending: false })
        .limit(200);
      const videoMap = new Map((videos ?? []).map((v: any) => [v.id, v]));
      const videoIds = (videos ?? []).map((v: any) => v.id);
      if (videoIds.length === 0) return [];

      // Fetch enough rows to deduplicate per video, then pick best per video
      const { data: analytics, error } = await supabase
        .from("connector_data_youtube_video_analytics")
        .select("*")
        // cap: URL limit @200 (videoIds limited to 200 by the query above)
        .in("video_uuid", videoIds)
        .order(metric, { ascending: false, nullsFirst: false })
        .limit(limit * 50);
      if (error) throw error;

      // Keep only the highest-metric row per video_uuid (dedup across syncs)
      const bestByVideo = new Map<string, any>();
      for (const a of analytics ?? []) {
        const existing = bestByVideo.get(a.video_uuid);
        if (!existing || (a[metric] ?? 0) > (existing[metric] ?? 0)) {
          bestByVideo.set(a.video_uuid, a);
        }
      }

      return Array.from(bestByVideo.values())
        .sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0))
        .slice(0, limit)
        .map((a: any) => {
          const v = videoMap.get(a.video_uuid) as any;
          const c = v ? channelMap.get(v.channel_uuid) as any : null;
          return {
            ...a,
            video_id: v?.video_id ?? "",
            video_title: v?.title ?? null,
            thumbnail_url: v?.thumbnail_url ?? null,
            channel_title: c?.title ?? null,
          };
        });
    },
  });
}

// Trigger the OAuth flow — opens a new tab with Google's consent screen
export function useStartYouTubeOAuth() {
  return useMutation({
    mutationFn: async ({
      startupId,
      returnPath,
    }: {
      startupId: string;
      returnPath?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("youtube-oauth-start", {
        body: {
          startup_id: startupId,
          return_path: returnPath ?? window.location.pathname,
        },
      });
      if (error) throw await extractFnError(error);
      if ((data as any)?.error) throw new Error((data as any).error);
      const url = (data as any)?.authorization_url as string;
      if (!url) throw new Error("No authorization_url returned");
      // Open in a new tab so the user can complete OAuth without losing the
      // dashboard state. They'll be redirected back to returnPath after.
      window.open(url, "_blank");
      return url;
    },
  });
}

export function useTriggerYouTubeAnalyticsSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ startupId }: { startupId: string }) => {
      const { data, error } = await supabase.functions.invoke("youtube-analytics-sync", {
        body: { startup_id: startupId },
      });
      if (error) throw await extractFnError(error);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["youtube-channel-analytics"] });
      qc.invalidateQueries({ queryKey: ["youtube-top-by-metric", vars.startupId] });
      qc.invalidateQueries({ queryKey: ["youtube-authorized", vars.startupId] });
    },
  });
}

// ── KAI: ask natural-language questions over the YouTube snapshot ─────────

export interface KaiAskResult {
  answer: string;
  snapshot_summary: {
    channels_in_scope: number;
    window_days: number;
    total_videos: number;
    recent_views: number;
  };
}

export function useAskYouTubeKai() {
  return useMutation({
    mutationFn: async ({
      startupId, channelUuid, question, windowDays,
    }: {
      startupId: string;
      channelUuid?: string | null;
      question: string;
      windowDays?: number;
    }): Promise<KaiAskResult> => {
      const { data, error } = await supabase.functions.invoke("youtube-kai-ask", {
        body: {
          startup_id: startupId,
          channel_uuid: channelUuid ?? null,
          question,
          window_days: windowDays ?? 30,
        },
      });
      if (error) throw await extractFnError(error);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as KaiAskResult;
    },
  });
}

// ── Tier 1: Credentials ───────────────────────────────────────────────────

export function useSaveYouTubeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      startupId,
      apiKey,
      label,
    }: {
      startupId: string;
      apiKey: string;
      label?: string;
    }) => {
      const { error } = await supabase.from("connector_credentials").upsert(
        {
          startup_id: startupId,
          connector_type: "youtube",
          label: label ?? "YouTube Data API",
          credentials: { api_key: apiKey },
          is_active: true,
        } as any,
        { onConflict: "startup_id,connector_type" }
      );
      if (error) throw error;
      return startupId;
    },
    onSuccess: (startupId) => {
      qc.invalidateQueries({ queryKey: ["youtube-credentials", startupId] });
    },
  });
}
