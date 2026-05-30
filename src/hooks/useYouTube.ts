import { useEffect } from "react";
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
  const qc = useQueryClient();

  // Realtime so the dashboard updates after a sync
  useEffect(() => {
    if (!startupId) return;
    const ch = supabase
      .channel(`youtube-channels-${startupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connector_data_youtube_channels",
          filter: `startup_id=eq.${startupId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["youtube-channels", startupId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [startupId, qc]);

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
