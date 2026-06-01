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

// Recent uploads across all channels for this startup
export function useRecentYouTubeUploads(startupId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ["youtube-recent-uploads", startupId, limit],
    enabled: !!startupId,
    queryFn: async (): Promise<YouTubeVideoWithChannel[]> => {
      // Two-step: get channel IDs for this startup, then videos joined
      const { data: channels } = await supabase
        .from("connector_data_youtube_channels")
        .select("id, title, channel_id, thumbnail_url")
        .eq("startup_id", startupId!);
      const channelIds = (channels ?? []).map((c: any) => c.id);
      if (channelIds.length === 0) return [];
      const channelMap = new Map(
        (channels ?? []).map((c: any) => [c.id, c])
      );

      const { data: videos, error } = await supabase
        .from("connector_data_youtube_videos")
        .select("*")
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

// Top videos by view count (current snapshot, all-time across this startup)
export function useTopYouTubeVideos(startupId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: ["youtube-top-videos", startupId, limit],
    enabled: !!startupId,
    queryFn: async (): Promise<YouTubeVideoWithChannel[]> => {
      const { data: channels } = await supabase
        .from("connector_data_youtube_channels")
        .select("id, title, channel_id, thumbnail_url")
        .eq("startup_id", startupId!);
      const channelIds = (channels ?? []).map((c: any) => c.id);
      if (channelIds.length === 0) return [];
      const channelMap = new Map(
        (channels ?? []).map((c: any) => [c.id, c])
      );

      const { data: videos, error } = await supabase
        .from("connector_data_youtube_videos")
        .select("*")
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
      if (error) throw error;
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
      if (error) throw error;
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

// All authorized channels (has an OAuth token row)
export function useAuthorizedChannelIds(startupId: string | undefined) {
  return useQuery({
    queryKey: ["youtube-authorized", startupId],
    enabled: !!startupId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("connector_youtube_oauth")
        .select("channel_id")
        .eq("startup_id", startupId!);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.channel_id);
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

      // Get videos for those channels
      const { data: videos } = await supabase
        .from("connector_data_youtube_videos")
        .select("id, video_id, title, thumbnail_url, channel_uuid")
        .in("channel_uuid", channelIds);
      const videoMap = new Map((videos ?? []).map((v: any) => [v.id, v]));
      const videoIds = (videos ?? []).map((v: any) => v.id);
      if (videoIds.length === 0) return [];

      // Get latest analytics row per video, sorted by metric
      const { data: analytics, error } = await supabase
        .from("connector_data_youtube_video_analytics")
        .select("*")
        .in("video_uuid", videoIds)
        .order(metric, { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) throw error;

      return (analytics ?? []).map((a: any) => {
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
      if (error) throw error;
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
      if (error) throw error;
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
