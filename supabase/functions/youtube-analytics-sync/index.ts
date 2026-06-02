// YouTube Analytics sync — Tier 2.
//
// For every authorized channel (row in connector_youtube_oauth):
//   1. Refresh the access token if expired
//   2. Pull the last 30 days of channel-level analytics (views, watch time,
//      subscribers, likes, shares, comments, impressions, CTR, revenue)
//   3. Pull the last 30 days of per-video analytics for the channel
//   4. Upsert into connector_data_youtube_channel_analytics +
//      connector_data_youtube_video_analytics
//
// Body: { startup_id }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // refresh if expiring within 5min

function dateNDaysAgoISO(n: number): string {
  const d = new Date(Date.now() - n * 864e5);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface OAuthRow {
  id: string;
  startup_id: string;
  channel_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  scopes: string[];
}

interface SyncResult {
  channel_id: string;
  channel_title?: string | null;
  channel_rows_upserted: number;
  video_rows_upserted: number;
  demographics_rows_upserted: number;
  geography_rows_upserted: number;
  traffic_rows_upserted: number;
  device_rows_upserted: number;
  retention_rows_upserted: number;
  retention_videos_queried: number;
  has_monetary_scope: boolean;
  errors: string[];
}

// How many of the channel's top videos (by recent views) get a retention curve
// pulled each sync. Each retention query is 1 Analytics-API quota unit. Daily
// quota is 10k by default, so even 50 here is safe per channel.
const RETENTION_TOP_N = 25;

async function refreshAccessTokenIfNeeded(
  admin: ReturnType<typeof createClient>,
  row: OAuthRow,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const expiresAt = new Date(row.token_expires_at).getTime();
  if (expiresAt - Date.now() > REFRESH_THRESHOLD_MS) return row.access_token;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) {
    throw new Error(`Refresh token exchange failed (${r.status}): ${await r.text()}`);
  }
  const t = await r.json();
  const newAccess = t.access_token as string;
  const newExpiresAt = new Date(Date.now() + (t.expires_in as number) * 1000).toISOString();

  await admin
    .from("connector_youtube_oauth")
    .update({ access_token: newAccess, token_expires_at: newExpiresAt } as any)
    .eq("id", row.id);

  return newAccess;
}

// Call YouTube Analytics API — returns parsed rows array with columnHeaders
async function analyticsQuery(
  channelId: string,
  accessToken: string,
  params: Record<string, string>
): Promise<{ columnHeaders: any[]; rows: any[] }> {
  const url = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  url.searchParams.set("ids", `channel==${channelId}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Analytics API ${r.status}: ${body.slice(0, 200)}`);
  }
  const j = await r.json();
  return { columnHeaders: j.columnHeaders ?? [], rows: j.rows ?? [] };
}

// Map a row array to a name→value object using the column headers
function rowToObject(row: any[], headers: any[]): Record<string, any> {
  const obj: Record<string, any> = {};
  for (let i = 0; i < headers.length; i++) {
    obj[headers[i].name] = row[i];
  }
  return obj;
}

async function syncChannelAnalytics(
  admin: ReturnType<typeof createClient>,
  channelUuid: string,
  oauth: OAuthRow,
  accessToken: string,
  startDate: string,
  endDate: string,
  hasMonetary: boolean,
  errors: string[]
): Promise<number> {
  // Channel-level metrics by day
  const baseMetrics = [
    "views",
    "estimatedMinutesWatched",
    "averageViewDuration",
    "subscribersGained",
    "subscribersLost",
    "likes",
    "shares",
    "comments",
  ];
  // Note: YouTube no longer exposes `impressions` / `impressionsClickThroughRate`
  // via the public Analytics API (those are Studio-only). Leaving the columns
  // in the table as NULL — they may come back, but for now we skip the call.
  const monetaryMetrics = ["estimatedRevenue", "estimatedAdRevenue", "cpm"];

  let primary;
  try {
    primary = await analyticsQuery(oauth.channel_id, accessToken, {
      startDate,
      endDate,
      dimensions: "day",
      metrics: baseMetrics.join(","),
      sort: "day",
    });
  } catch (e: any) {
    errors.push(`channel base metrics ${oauth.channel_id}: ${e.message}`);
    return 0;
  }

  // Monetary in a separate try
  let monetary: { columnHeaders: any[]; rows: any[] } = { columnHeaders: [], rows: [] };
  if (hasMonetary) {
    try {
      monetary = await analyticsQuery(oauth.channel_id, accessToken, {
        startDate,
        endDate,
        dimensions: "day",
        metrics: monetaryMetrics.join(","),
        sort: "day",
        currency: "USD",
      });
    } catch (e: any) {
      // Channel may not be monetized — non-fatal
      errors.push(`channel monetary ${oauth.channel_id}: ${e.message}`);
    }
  }

  // Index monetary by day for join
  const monetaryByDay = new Map<string, any>();
  monetary.rows.forEach((r) => {
    const o = rowToObject(r, monetary.columnHeaders);
    monetaryByDay.set(o.day, o);
  });

  // Build upsert rows
  const upserts = primary.rows.map((r) => {
    const o = rowToObject(r, primary.columnHeaders);
    const mon = monetaryByDay.get(o.day) ?? {};
    return {
      channel_uuid: channelUuid,
      date: o.day,
      views: Number(o.views ?? 0),
      estimated_minutes_watched: Number(o.estimatedMinutesWatched ?? 0),
      average_view_duration_sec: o.averageViewDuration != null ? Math.round(Number(o.averageViewDuration)) : null,
      subscribers_gained: Number(o.subscribersGained ?? 0),
      subscribers_lost: Number(o.subscribersLost ?? 0),
      likes: Number(o.likes ?? 0),
      shares: Number(o.shares ?? 0),
      comments: Number(o.comments ?? 0),
      impressions: null,       // not exposed by public Analytics API
      impressions_ctr: null,   // ditto
      estimated_revenue_usd: mon.estimatedRevenue != null ? Number(mon.estimatedRevenue) : null,
      estimated_ad_revenue_usd: mon.estimatedAdRevenue != null ? Number(mon.estimatedAdRevenue) : null,
      cpm_usd: mon.cpm != null ? Number(mon.cpm) : null,
      raw_payload: { primary: o, monetary: mon },
    };
  });

  if (upserts.length === 0) return 0;
  const { error } = await admin
    .from("connector_data_youtube_channel_analytics")
    .upsert(upserts as any, { onConflict: "channel_uuid,date" });
  if (error) {
    errors.push(`upsert channel analytics: ${error.message}`);
    return 0;
  }
  return upserts.length;
}

async function syncVideoAnalytics(
  admin: ReturnType<typeof createClient>,
  channelUuid: string,
  oauth: OAuthRow,
  accessToken: string,
  startDate: string,
  endDate: string,
  hasMonetary: boolean,
  errors: string[]
): Promise<number> {
  // Fetch video-level data — dimension=video gives aggregated for period;
  // dimension=video,day gives time-series per video but very expensive.
  // Strategy: aggregated for the 30-day window, store under endDate.
  const baseMetrics = [
    "views",
    "estimatedMinutesWatched",
    "averageViewDuration",
    "averageViewPercentage",
    "likes",
    "comments",
    "shares",
    "subscribersGained",
    "subscribersLost",
  ];

  let primary;
  try {
    primary = await analyticsQuery(oauth.channel_id, accessToken, {
      startDate,
      endDate,
      dimensions: "video",
      metrics: baseMetrics.join(","),
      sort: "-views",
      maxResults: "200",
    });
  } catch (e: any) {
    errors.push(`video base metrics: ${e.message}`);
    return 0;
  }

  let monetaryByVideo = new Map<string, any>();
  if (hasMonetary) {
    try {
      const mon = await analyticsQuery(oauth.channel_id, accessToken, {
        startDate,
        endDate,
        dimensions: "video",
        metrics: "estimatedRevenue,cpm",
        sort: "-estimatedRevenue",
        maxResults: "200",
        currency: "USD",
      });
      mon.rows.forEach((r) => {
        const o = rowToObject(r, mon.columnHeaders);
        monetaryByVideo.set(o.video, o);
      });
    } catch (e: any) {
      errors.push(`video monetary: ${e.message}`);
    }
  }

  // Map video_id → video_uuid in our DB
  const videoIds = primary.rows.map((r) => rowToObject(r, primary.columnHeaders).video).filter(Boolean);
  if (videoIds.length === 0) return 0;
  const { data: videoRecords } = await admin
    .from("connector_data_youtube_videos")
    .select("id, video_id")
    .eq("channel_uuid", channelUuid)
    .in("video_id", videoIds);
  const videoUuidMap = new Map<string, string>();
  (videoRecords ?? []).forEach((v: any) => videoUuidMap.set(v.video_id, v.id));

  const upserts = primary.rows
    .map((r) => {
      const o = rowToObject(r, primary.columnHeaders);
      const videoUuid = videoUuidMap.get(o.video);
      if (!videoUuid) return null;
      const mon = monetaryByVideo.get(o.video) ?? {};
      return {
        video_uuid: videoUuid,
        date: endDate, // aggregated for window — use the window end as the snapshot date
        views: Number(o.views ?? 0),
        estimated_minutes_watched: Number(o.estimatedMinutesWatched ?? 0),
        average_view_duration_sec: o.averageViewDuration != null ? Math.round(Number(o.averageViewDuration)) : null,
        average_view_percentage:
          o.averageViewPercentage != null ? Number(o.averageViewPercentage) : null,
        likes: Number(o.likes ?? 0),
        comments: Number(o.comments ?? 0),
        shares: Number(o.shares ?? 0),
        subscribers_gained: Number(o.subscribersGained ?? 0),
        subscribers_lost: Number(o.subscribersLost ?? 0),
        estimated_revenue_usd: mon.estimatedRevenue != null ? Number(mon.estimatedRevenue) : null,
        cpm_usd: mon.cpm != null ? Number(mon.cpm) : null,
        raw_payload: { primary: o, monetary: mon },
      };
    })
    .filter(Boolean);

  if (upserts.length === 0) return 0;
  const { error } = await admin
    .from("connector_data_youtube_video_analytics")
    .upsert(upserts as any, { onConflict: "video_uuid,date" });
  if (error) {
    errors.push(`upsert video analytics: ${error.message}`);
    return 0;
  }
  return upserts.length;
}

// ─── Tier 2 dimension syncs ─────────────────────────────────────
// All four are channel-level snapshots aggregated for the window,
// keyed by period_end_date. Re-sync same-day overwrites; next-day adds.

async function syncDemographics(
  admin: ReturnType<typeof createClient>,
  channelUuid: string,
  oauth: OAuthRow,
  accessToken: string,
  startDate: string,
  endDate: string,
  errors: string[]
): Promise<number> {
  let result;
  try {
    result = await analyticsQuery(oauth.channel_id, accessToken, {
      startDate,
      endDate,
      dimensions: "ageGroup,gender",
      metrics: "viewerPercentage",
      sort: "gender,ageGroup",
    });
  } catch (e: any) {
    errors.push(`demographics ${oauth.channel_id}: ${e.message}`);
    return 0;
  }
  const upserts = result.rows.map((r) => {
    const o = rowToObject(r, result.columnHeaders);
    return {
      channel_uuid: channelUuid,
      period_end_date: endDate,
      period_days: 30,
      age_group: String(o.ageGroup ?? "unknown"),
      gender: String(o.gender ?? "unknown"),
      viewer_percentage: Number(o.viewerPercentage ?? 0),
      raw_payload: o,
    };
  });
  if (upserts.length === 0) return 0;
  const { error } = await admin
    .from("connector_data_youtube_demographics")
    .upsert(upserts as any, { onConflict: "channel_uuid,period_end_date,age_group,gender" });
  if (error) {
    errors.push(`upsert demographics: ${error.message}`);
    return 0;
  }
  return upserts.length;
}

async function syncGeography(
  admin: ReturnType<typeof createClient>,
  channelUuid: string,
  oauth: OAuthRow,
  accessToken: string,
  startDate: string,
  endDate: string,
  hasMonetary: boolean,
  errors: string[]
): Promise<number> {
  let primary;
  try {
    primary = await analyticsQuery(oauth.channel_id, accessToken, {
      startDate,
      endDate,
      dimensions: "country",
      metrics: "views,estimatedMinutesWatched,averageViewDuration",
      sort: "-views",
      maxResults: "50",
    });
  } catch (e: any) {
    errors.push(`geography ${oauth.channel_id}: ${e.message}`);
    return 0;
  }

  // Monetary by country — separate query so failure is non-fatal
  const revenueByCountry = new Map<string, number>();
  if (hasMonetary) {
    try {
      const mon = await analyticsQuery(oauth.channel_id, accessToken, {
        startDate,
        endDate,
        dimensions: "country",
        metrics: "estimatedRevenue",
        sort: "-estimatedRevenue",
        maxResults: "50",
        currency: "USD",
      });
      mon.rows.forEach((r) => {
        const o = rowToObject(r, mon.columnHeaders);
        if (o.country) revenueByCountry.set(o.country, Number(o.estimatedRevenue ?? 0));
      });
    } catch (e: any) {
      errors.push(`geography monetary: ${e.message}`);
    }
  }

  const upserts = primary.rows.map((r) => {
    const o = rowToObject(r, primary.columnHeaders);
    return {
      channel_uuid: channelUuid,
      period_end_date: endDate,
      period_days: 30,
      country_code: String(o.country ?? "ZZ"),
      views: Number(o.views ?? 0),
      estimated_minutes_watched: Number(o.estimatedMinutesWatched ?? 0),
      average_view_duration_sec:
        o.averageViewDuration != null ? Math.round(Number(o.averageViewDuration)) : null,
      estimated_revenue_usd: revenueByCountry.has(o.country) ? revenueByCountry.get(o.country) : null,
      raw_payload: o,
    };
  });
  if (upserts.length === 0) return 0;
  const { error } = await admin
    .from("connector_data_youtube_geography")
    .upsert(upserts as any, { onConflict: "channel_uuid,period_end_date,country_code" });
  if (error) {
    errors.push(`upsert geography: ${error.message}`);
    return 0;
  }
  return upserts.length;
}

async function syncTrafficSources(
  admin: ReturnType<typeof createClient>,
  channelUuid: string,
  oauth: OAuthRow,
  accessToken: string,
  startDate: string,
  endDate: string,
  errors: string[]
): Promise<number> {
  let result;
  try {
    result = await analyticsQuery(oauth.channel_id, accessToken, {
      startDate,
      endDate,
      dimensions: "insightTrafficSourceType",
      metrics: "views,estimatedMinutesWatched",
      sort: "-views",
    });
  } catch (e: any) {
    errors.push(`traffic sources ${oauth.channel_id}: ${e.message}`);
    return 0;
  }
  const upserts = result.rows.map((r) => {
    const o = rowToObject(r, result.columnHeaders);
    return {
      channel_uuid: channelUuid,
      period_end_date: endDate,
      period_days: 30,
      source_type: String(o.insightTrafficSourceType ?? "UNKNOWN"),
      views: Number(o.views ?? 0),
      estimated_minutes_watched: Number(o.estimatedMinutesWatched ?? 0),
      raw_payload: o,
    };
  });
  if (upserts.length === 0) return 0;
  const { error } = await admin
    .from("connector_data_youtube_traffic_sources")
    .upsert(upserts as any, { onConflict: "channel_uuid,period_end_date,source_type" });
  if (error) {
    errors.push(`upsert traffic sources: ${error.message}`);
    return 0;
  }
  return upserts.length;
}

async function syncDeviceTypes(
  admin: ReturnType<typeof createClient>,
  channelUuid: string,
  oauth: OAuthRow,
  accessToken: string,
  startDate: string,
  endDate: string,
  errors: string[]
): Promise<number> {
  let result;
  try {
    result = await analyticsQuery(oauth.channel_id, accessToken, {
      startDate,
      endDate,
      dimensions: "deviceType",
      metrics: "views,estimatedMinutesWatched",
      sort: "-views",
    });
  } catch (e: any) {
    errors.push(`device types ${oauth.channel_id}: ${e.message}`);
    return 0;
  }
  const upserts = result.rows.map((r) => {
    const o = rowToObject(r, result.columnHeaders);
    return {
      channel_uuid: channelUuid,
      period_end_date: endDate,
      period_days: 30,
      device_type: String(o.deviceType ?? "UNKNOWN_PLATFORM"),
      views: Number(o.views ?? 0),
      estimated_minutes_watched: Number(o.estimatedMinutesWatched ?? 0),
      raw_payload: o,
    };
  });
  if (upserts.length === 0) return 0;
  const { error } = await admin
    .from("connector_data_youtube_device_types")
    .upsert(upserts as any, { onConflict: "channel_uuid,period_end_date,device_type" });
  if (error) {
    errors.push(`upsert device types: ${error.message}`);
    return 0;
  }
  return upserts.length;
}

// Per-video retention is one API call per video, so we cap at the top
// RETENTION_TOP_N videos by view count in the window.
async function syncVideoRetention(
  admin: ReturnType<typeof createClient>,
  channelUuid: string,
  oauth: OAuthRow,
  accessToken: string,
  startDate: string,
  endDate: string,
  errors: string[]
): Promise<{ rows: number; videosQueried: number }> {
  // Find which videos to query: top N by views in the window from our own DB
  const { data: topVids } = await admin
    .from("connector_data_youtube_video_analytics")
    .select("video_uuid, views, connector_data_youtube_videos!inner(video_id)")
    .eq("date", endDate)
    .order("views", { ascending: false })
    .limit(RETENTION_TOP_N);

  const items = (topVids ?? [])
    .map((r: any) => ({
      video_uuid: r.video_uuid as string,
      video_id: r.connector_data_youtube_videos?.video_id as string | undefined,
    }))
    .filter((x) => x.video_id);

  if (items.length === 0) return { rows: 0, videosQueried: 0 };

  let totalUpserted = 0;
  for (const item of items) {
    let result;
    try {
      result = await analyticsQuery(oauth.channel_id, accessToken, {
        startDate,
        endDate,
        dimensions: "elapsedVideoTimeRatio",
        metrics: "audienceWatchRatio,relativeRetentionPerformance",
        filters: `video==${item.video_id}`,
        sort: "elapsedVideoTimeRatio",
      });
    } catch (e: any) {
      // Retention often fails for shorts / very-low-watch videos — non-fatal
      errors.push(`retention ${item.video_id}: ${e.message.slice(0, 150)}`);
      continue;
    }
    const upserts = result.rows.map((r) => {
      const o = rowToObject(r, result.columnHeaders);
      return {
        video_uuid: item.video_uuid,
        period_end_date: endDate,
        period_days: 30,
        elapsed_video_time_ratio: Number(o.elapsedVideoTimeRatio ?? 0),
        audience_watch_ratio: Number(o.audienceWatchRatio ?? 0),
        relative_retention_performance:
          o.relativeRetentionPerformance != null ? Number(o.relativeRetentionPerformance) : null,
        raw_payload: o,
      };
    });
    if (upserts.length === 0) continue;
    const { error } = await admin
      .from("connector_data_youtube_video_retention")
      .upsert(upserts as any, {
        onConflict: "video_uuid,period_end_date,elapsed_video_time_ratio",
      });
    if (error) {
      errors.push(`upsert retention ${item.video_id}: ${error.message}`);
      continue;
    }
    totalUpserted += upserts.length;
  }
  return { rows: totalUpserted, videosQueried: items.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_OAUTH_CLIENT_ID / _SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    const body = await req.json().catch(() => ({}));
    const startupId = body.startup_id as string | undefined;
    if (!startupId) {
      return new Response(JSON.stringify({ error: "startup_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load all authorized channels for this startup
    const { data: oauthRows, error: oauthErr } = await admin
      .from("connector_youtube_oauth")
      .select("id, startup_id, channel_id, access_token, refresh_token, token_expires_at, scopes")
      .eq("startup_id", startupId);
    if (oauthErr) throw new Error(`OAuth lookup failed: ${oauthErr.message}`);
    if (!oauthRows || oauthRows.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "No authorized channels. Trigger youtube-oauth-start for at least one channel first.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startDate = dateNDaysAgoISO(30);
    const endDate = todayISO();
    const results: SyncResult[] = [];

    for (const oauth of oauthRows as OAuthRow[]) {
      const result: SyncResult = {
        channel_id: oauth.channel_id,
        channel_rows_upserted: 0,
        video_rows_upserted: 0,
        demographics_rows_upserted: 0,
        geography_rows_upserted: 0,
        traffic_rows_upserted: 0,
        device_rows_upserted: 0,
        retention_rows_upserted: 0,
        retention_videos_queried: 0,
        has_monetary_scope: oauth.scopes.some((s) => s.includes("yt-analytics-monetary")),
        errors: [],
      };

      // Refresh token if needed
      let accessToken: string;
      try {
        accessToken = await refreshAccessTokenIfNeeded(admin, oauth, clientId, clientSecret);
      } catch (e: any) {
        result.errors.push(`token refresh: ${e.message}`);
        results.push(result);
        continue;
      }

      // Map channel_id → channel_uuid
      const { data: chRow } = await admin
        .from("connector_data_youtube_channels")
        .select("id, title")
        .eq("startup_id", startupId)
        .eq("channel_id", oauth.channel_id)
        .maybeSingle();
      if (!chRow) {
        result.errors.push(`channel not found in connector_data_youtube_channels`);
        results.push(result);
        continue;
      }
      result.channel_title = (chRow as any).title;
      const channelUuid = (chRow as any).id;

      try {
        result.channel_rows_upserted = await syncChannelAnalytics(
          admin,
          channelUuid,
          oauth,
          accessToken,
          startDate,
          endDate,
          result.has_monetary_scope,
          result.errors
        );
      } catch (e: any) {
        result.errors.push(`channel analytics: ${e.message}`);
      }

      try {
        result.video_rows_upserted = await syncVideoAnalytics(
          admin,
          channelUuid,
          oauth,
          accessToken,
          startDate,
          endDate,
          result.has_monetary_scope,
          result.errors
        );
      } catch (e: any) {
        result.errors.push(`video analytics: ${e.message}`);
      }

      // Tier 2 dimension snapshots — each non-fatal so one failure doesn't
      // kill the rest of the channel's sync
      try {
        result.demographics_rows_upserted = await syncDemographics(
          admin, channelUuid, oauth, accessToken, startDate, endDate, result.errors
        );
      } catch (e: any) {
        result.errors.push(`demographics: ${e.message}`);
      }

      try {
        result.geography_rows_upserted = await syncGeography(
          admin, channelUuid, oauth, accessToken, startDate, endDate,
          result.has_monetary_scope, result.errors
        );
      } catch (e: any) {
        result.errors.push(`geography: ${e.message}`);
      }

      try {
        result.traffic_rows_upserted = await syncTrafficSources(
          admin, channelUuid, oauth, accessToken, startDate, endDate, result.errors
        );
      } catch (e: any) {
        result.errors.push(`traffic sources: ${e.message}`);
      }

      try {
        result.device_rows_upserted = await syncDeviceTypes(
          admin, channelUuid, oauth, accessToken, startDate, endDate, result.errors
        );
      } catch (e: any) {
        result.errors.push(`device types: ${e.message}`);
      }

      try {
        const ret = await syncVideoRetention(
          admin, channelUuid, oauth, accessToken, startDate, endDate, result.errors
        );
        result.retention_rows_upserted = ret.rows;
        result.retention_videos_queried = ret.videosQueried;
      } catch (e: any) {
        result.errors.push(`retention: ${e.message}`);
      }

      results.push(result);
    }

    return new Response(JSON.stringify({ success: true, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("youtube-analytics-sync error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
