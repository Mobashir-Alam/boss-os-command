// YouTube Connector — full daily sync (Tier 1, API key).
//
// Body: { startup_id }  — pulls all active channels for this startup from
//                          connector_data_youtube_channels and syncs each one.
//
// For each channel:
//   1. Refresh channel statistics (subscriber count, view count, video count)
//   2. Enumerate all videos via the uploads playlist
//   3. Fetch stats for each video (batched 50 at a time)
//   4. Upsert connector_data_youtube_videos
//   5. Insert today's snapshot into connector_data_youtube_video_snapshots
//      with delta_views = today - yesterday
//
// Also writes channel-level aggregates into the `metrics` table so KAI
// can pull them with the same query pattern used for GitHub.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const YT_BASE = "https://www.googleapis.com/youtube/v3";

async function ytFetch(path: string, params: Record<string, string>, apiKey: string) {
  const qs = new URLSearchParams({ ...params, key: apiKey }).toString();
  const r = await fetch(`${YT_BASE}${path}?${qs}`);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`YouTube ${r.status} on ${path}: ${t.slice(0, 300)}`);
  }
  return r.json();
}

// Parse ISO-8601 duration ("PT4M13S") → seconds
function parseDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const h = parseInt(m[1] ?? "0", 10);
  const min = parseInt(m[2] ?? "0", 10);
  const sec = parseInt(m[3] ?? "0", 10);
  return h * 3600 + min * 60 + sec;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface ChannelRow {
  id: string;
  channel_id: string;
  uploads_playlist: string | null;
}

interface SyncResult {
  channel_id: string;
  channel_title: string;
  videos_synced: number;
  videos_added: number;
  videos_updated: number;
  api_units_used_approx: number;
  errors: string[];
}

async function syncOneChannel(
  admin: ReturnType<typeof createClient>,
  apiKey: string,
  channel: ChannelRow
): Promise<SyncResult> {
  const result: SyncResult = {
    channel_id: channel.channel_id,
    channel_title: "",
    videos_synced: 0,
    videos_added: 0,
    videos_updated: 0,
    api_units_used_approx: 0,
    errors: [],
  };

  // 1. Refresh channel info
  let channelData: any;
  try {
    const cr = await ytFetch("/channels", {
      part: "snippet,statistics,contentDetails",
      id: channel.channel_id,
    }, apiKey);
    result.api_units_used_approx += 1;
    channelData = cr.items?.[0];
    if (!channelData) throw new Error("Channel not found via API");
    result.channel_title = channelData.snippet?.title ?? "";

    const uploads = channelData.contentDetails?.relatedPlaylists?.uploads ?? channel.uploads_playlist;

    await admin
      .from("connector_data_youtube_channels")
      .update({
        title: channelData.snippet?.title,
        description: channelData.snippet?.description,
        custom_url: channelData.snippet?.customUrl ?? null,
        country: channelData.snippet?.country ?? null,
        thumbnail_url:
          channelData.snippet?.thumbnails?.medium?.url ??
          channelData.snippet?.thumbnails?.default?.url ??
          null,
        subscriber_count: parseInt(channelData.statistics?.subscriberCount ?? "0", 10),
        view_count: parseInt(channelData.statistics?.viewCount ?? "0", 10),
        video_count: parseInt(channelData.statistics?.videoCount ?? "0", 10),
        uploads_playlist: uploads,
        channel_created: channelData.snippet?.publishedAt,
        raw_payload: channelData,
        last_synced_at: new Date().toISOString(),
      } as any)
      .eq("id", channel.id);
  } catch (e: any) {
    result.errors.push(`channel info: ${e.message}`);
    return result;
  }

  const uploadsPlaylist = channelData.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylist) {
    result.errors.push("No uploads playlist on channel");
    return result;
  }

  // 2. Enumerate all video IDs via playlist (paginated, 50 at a time)
  const videoIds: string[] = [];
  let pageToken: string | undefined = undefined;
  try {
    while (true) {
      const params: Record<string, string> = {
        part: "contentDetails",
        playlistId: uploadsPlaylist,
        maxResults: "50",
      };
      if (pageToken) params.pageToken = pageToken;
      const r = await ytFetch("/playlistItems", params, apiKey);
      result.api_units_used_approx += 1;
      for (const item of r.items ?? []) {
        const vid = item.contentDetails?.videoId;
        if (vid) videoIds.push(vid);
      }
      pageToken = r.nextPageToken;
      if (!pageToken) break;
      // Safety: cap at 1000 videos per channel to avoid runaway pulls
      if (videoIds.length >= 1000) break;
    }
  } catch (e: any) {
    result.errors.push(`enumerate videos: ${e.message}`);
    return result;
  }

  if (videoIds.length === 0) {
    return result;
  }

  // 3. Pull video stats in batches of 50, upsert, snapshot
  const today = todayISO();

  // Get existing video records (id + last view_count) for delta computation
  const { data: existingRows } = await admin
    .from("connector_data_youtube_videos")
    .select("id, video_id, view_count")
    .eq("channel_uuid", channel.id)
    .in("video_id", videoIds);
  const existingMap = new Map<string, { id: string; view_count: number }>();
  (existingRows ?? []).forEach((row: any) =>
    existingMap.set(row.video_id, { id: row.id, view_count: Number(row.view_count) })
  );

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    let videosData: any[];
    try {
      const vr = await ytFetch("/videos", {
        part: "snippet,statistics,contentDetails,status",
        id: batch.join(","),
      }, apiKey);
      result.api_units_used_approx += 1;
      videosData = vr.items ?? [];
    } catch (e: any) {
      result.errors.push(`videos batch ${i}-${i + 50}: ${e.message}`);
      continue;
    }

    const upsertRows = videosData.map((v: any) => ({
      channel_uuid: channel.id,
      video_id: v.id,
      title: v.snippet?.title,
      description: v.snippet?.description,
      thumbnail_url:
        v.snippet?.thumbnails?.medium?.url ??
        v.snippet?.thumbnails?.default?.url ??
        null,
      published_at: v.snippet?.publishedAt,
      duration_seconds: parseDuration(v.contentDetails?.duration),
      tags: v.snippet?.tags ?? [],
      category_id: v.snippet?.categoryId ?? null,
      privacy: v.status?.privacyStatus ?? null,
      view_count: parseInt(v.statistics?.viewCount ?? "0", 10),
      like_count: parseInt(v.statistics?.likeCount ?? "0", 10),
      comment_count: parseInt(v.statistics?.commentCount ?? "0", 10),
      raw_payload: v,
      last_synced_at: new Date().toISOString(),
    }));

    const { data: upserted, error: upsertErr } = await admin
      .from("connector_data_youtube_videos")
      .upsert(upsertRows as any, { onConflict: "channel_uuid,video_id" })
      .select("id, video_id, view_count, like_count, comment_count");
    if (upsertErr) {
      result.errors.push(`upsert batch ${i}: ${upsertErr.message}`);
      continue;
    }
    result.videos_synced += upserted?.length ?? 0;

    // Snapshot rows for today
    const snapshotRows = (upserted ?? []).map((row: any) => {
      const prev = existingMap.get(row.video_id);
      const deltaViews = prev ? Number(row.view_count) - prev.view_count : null;
      const wasExisting = !!prev;
      if (wasExisting) result.videos_updated += 1;
      else result.videos_added += 1;
      return {
        video_uuid: row.id,
        snapshot_date: today,
        view_count: Number(row.view_count),
        like_count: Number(row.like_count),
        comment_count: Number(row.comment_count),
        delta_views: deltaViews,
      };
    });

    if (snapshotRows.length > 0) {
      await admin
        .from("connector_data_youtube_video_snapshots")
        .upsert(snapshotRows as any, { onConflict: "video_uuid,snapshot_date" });
    }
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    const body = await req.json().catch(() => ({}));
    const startupId = body.startup_id as string | undefined;
    if (!startupId) {
      return new Response(
        JSON.stringify({ error: "startup_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Read API key
    const { data: cred, error: credErr } = await admin
      .from("connector_credentials")
      .select("credentials")
      .eq("startup_id", startupId)
      .eq("connector_type", "youtube")
      .eq("is_active", true)
      .maybeSingle();
    if (credErr) throw new Error(`DB read failed: ${credErr.message}`);
    if (!cred) {
      return new Response(JSON.stringify({ error: "No active youtube credential found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = (cred.credentials as any)?.api_key;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "credentials.api_key is missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. List active channels to sync
    const { data: channels, error: chErr } = await admin
      .from("connector_data_youtube_channels")
      .select("id, channel_id, uploads_playlist")
      .eq("startup_id", startupId)
      .eq("is_active", true);
    if (chErr) throw new Error(`Channel list failed: ${chErr.message}`);
    if (!channels || channels.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No channels configured. INSERT into connector_data_youtube_channels first.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Sync each channel
    const results: SyncResult[] = [];
    for (const ch of channels as ChannelRow[]) {
      const r = await syncOneChannel(admin, apiKey, ch);
      results.push(r);
    }

    // 4. Write channel-level metrics for KAI consumption
    const today = todayISO();
    const metricsRows = results.map((r) => ({
      startup_id: startupId,
      connector_type: "youtube",
      department_key: "social_media",
      metric_name: `videos_synced_${r.channel_id}`,
      metric_value: r.videos_synced,
      period_start: today,
      period_end: today,
      granularity: "daily",
      raw_data: r,
    }));
    if (metricsRows.length > 0) {
      await admin
        .from("metrics")
        .upsert(metricsRows as any, {
          onConflict: "startup_id,connector_type,metric_name,period_start,granularity",
        });
    }

    // 5. Mark credential as freshly synced
    await admin
      .from("connector_credentials")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_error: results.some((r) => r.errors.length > 0)
          ? results.flatMap((r) => r.errors).slice(0, 5).join(" | ")
          : null,
      } as any)
      .eq("startup_id", startupId)
      .eq("connector_type", "youtube");

    return new Response(JSON.stringify({ success: true, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("youtube-sync error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
