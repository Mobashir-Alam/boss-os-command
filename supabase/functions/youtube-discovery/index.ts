// YouTube Connector — one-shot discovery (Tier 1, API key only).
//
// Body: { startup_id, channel_input }
//   channel_input can be:
//     - "UCxxxx..."        → treated as a channel ID
//     - "@nasheediobeats"  → treated as a handle
//     - "nasheediobeats"   → tried as both handle and username
//
// Returns the channel info + last 10 videos as a structured JSON report.
// Stores nothing. Caller pastes the output to confirm what's reachable.

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

async function resolveChannel(input: string, apiKey: string) {
  const trimmed = input.trim().replace(/^@/, "");
  // UC-prefixed IDs are channel IDs directly
  if (input.startsWith("UC") && input.length >= 20) {
    return await ytFetch("/channels", {
      part: "snippet,statistics,contentDetails,brandingSettings",
      id: input,
    }, apiKey);
  }
  // Otherwise try handle lookup (new API)
  try {
    return await ytFetch("/channels", {
      part: "snippet,statistics,contentDetails,brandingSettings",
      forHandle: trimmed,
    }, apiKey);
  } catch (_e) {
    // Fall through to legacy username lookup
  }
  return await ytFetch("/channels", {
    part: "snippet,statistics,contentDetails,brandingSettings",
    forUsername: trimmed,
  }, apiKey);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    const body = await req.json().catch(() => ({}));
    const startupId = body.startup_id as string | undefined;
    const channelInput = body.channel_input as string | undefined;

    if (!startupId || !channelInput) {
      return new Response(
        JSON.stringify({ error: "startup_id and channel_input are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read API key from connector_credentials
    const { data: cred, error: credErr } = await admin
      .from("connector_credentials")
      .select("credentials")
      .eq("startup_id", startupId)
      .eq("connector_type", "youtube")
      .eq("is_active", true)
      .maybeSingle();
    if (credErr) throw new Error(`DB read failed: ${credErr.message}`);
    if (!cred) {
      return new Response(
        JSON.stringify({
          error:
            "No active youtube credential found. INSERT into connector_credentials first with { api_key: '<google-api-key>' }.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const apiKey = (cred.credentials as any)?.api_key;
    if (!apiKey || typeof apiKey !== "string") {
      return new Response(
        JSON.stringify({ error: "credentials.api_key is missing — store it in connector_credentials.credentials.api_key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Resolve channel
    const channelRes = await resolveChannel(channelInput, apiKey);
    const channel = channelRes.items?.[0];
    if (!channel) {
      return new Response(
        JSON.stringify({ error: `Channel not found for input "${channelInput}"` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
    let recentVideos: any[] = [];
    let totalCallsMade = 1;

    if (uploads) {
      // 2. Pull last 10 uploads
      const playlistRes = await ytFetch("/playlistItems", {
        part: "snippet,contentDetails",
        playlistId: uploads,
        maxResults: "10",
      }, apiKey);
      totalCallsMade += 1;
      const videoIds = (playlistRes.items ?? [])
        .map((it: any) => it.contentDetails?.videoId)
        .filter(Boolean);

      if (videoIds.length > 0) {
        // 3. Fetch stats for those videos in one batch call
        const videosRes = await ytFetch("/videos", {
          part: "snippet,statistics,contentDetails,status",
          id: videoIds.join(","),
        }, apiKey);
        totalCallsMade += 1;
        recentVideos = (videosRes.items ?? []).map((v: any) => ({
          video_id: v.id,
          title: v.snippet?.title,
          description: v.snippet?.description?.slice(0, 200),
          published_at: v.snippet?.publishedAt,
          duration: v.contentDetails?.duration, // ISO 8601 PT#M#S
          privacy: v.status?.privacyStatus,
          tags: v.snippet?.tags?.slice(0, 5) ?? [],
          view_count: parseInt(v.statistics?.viewCount ?? "0", 10),
          like_count: parseInt(v.statistics?.likeCount ?? "0", 10),
          comment_count: parseInt(v.statistics?.commentCount ?? "0", 10),
        }));
      }
    }

    return new Response(
      JSON.stringify(
        {
          channel: {
            channel_id: channel.id,
            title: channel.snippet?.title,
            description: channel.snippet?.description?.slice(0, 300),
            country: channel.snippet?.country ?? null,
            custom_url: channel.snippet?.customUrl ?? null,
            thumbnail_url:
              channel.snippet?.thumbnails?.medium?.url ??
              channel.snippet?.thumbnails?.default?.url ??
              null,
            subscriber_count: parseInt(channel.statistics?.subscriberCount ?? "0", 10),
            view_count: parseInt(channel.statistics?.viewCount ?? "0", 10),
            video_count: parseInt(channel.statistics?.videoCount ?? "0", 10),
            channel_created: channel.snippet?.publishedAt,
            uploads_playlist: uploads,
          },
          recent_videos: recentVideos,
          api_quota_units_used_approx: totalCallsMade,
        },
        null,
        2
      ),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("youtube-discovery error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
