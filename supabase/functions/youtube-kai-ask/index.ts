// YouTube KAI — natural-language Q&A over the team's YouTube data.
//
// Body: {
//   startup_id: string,
//   channel_uuid?: string | null,   // null/undefined = all channels in scope
//   question: string,
//   window_days?: number,           // default 30
// }
//
// Flow:
//   1. Gather a curated JSON snapshot of relevant data from many tables
//      (channels, analytics, videos, audience, retention, content patterns).
//   2. Send snapshot + user's question to the Lovable AI gateway with a
//      system prompt that defines KAI's role as an analytics co-pilot.
//   3. Return the LLM's answer.
//
// Auth: verify_jwt is disabled in config.toml; this function does not read
// any user-supplied secrets and only uses service-role to query the DB. The
// caller still supplies startup_id and we trust the dashboard's RLS gating
// upstream (only the social-media lead and founder see this tab).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  startup_id: string;
  channel_uuid?: string | null;
  question: string;
  window_days?: number;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function dateNDaysAgoISO(n: number): string {
  return new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
}

// Friendly traffic-source labels (same mapping as the Audience tab)
const TRAFFIC_LABEL: Record<string, string> = {
  YT_SEARCH: "YouTube search", SUBSCRIBER: "Subscriber feed",
  YT_CHANNEL: "Channel page", RELATED_VIDEO: "Suggested videos",
  EXT_URL: "External websites", NO_LINK_OTHER: "Direct / unknown",
  NO_LINK_EMBEDDED: "Embedded player", NOTIFICATION: "Notifications",
  YT_OTHER_PAGE: "Other YouTube pages", PLAYLIST: "Playlists",
  YT_PLAYLIST_PAGE: "Playlist pages", SHORTS: "Shorts feed",
  HASHTAGS: "Hashtags", ADVERTISING: "Ads", END_SCREEN: "End screens",
  CAMPAIGN_CARD: "Promo cards",
};

const DEVICE_LABEL: Record<string, string> = {
  MOBILE: "Mobile", DESKTOP: "Desktop", TABLET: "Tablet",
  TV: "TV", GAME_CONSOLE: "Game console", UNKNOWN_PLATFORM: "Other",
};

function classifyTrajectory(lifetime_vpd: number, recent_vpd: number, age_days: number) {
  if (age_days < 7) return recent_vpd > 0 ? "rising" : "dead";
  if (lifetime_vpd <= 0) return recent_vpd > 0 ? "rising" : "dead";
  const ratio = recent_vpd / lifetime_vpd;
  if (ratio >= 1.5) return "rising";
  if (ratio >= 0.5) return "steady";
  if (ratio >= 0.05) return "decaying";
  return "dead";
}

async function buildSnapshot(
  admin: ReturnType<typeof createClient>,
  startupId: string,
  channelUuid: string | null,
  windowDays: number,
) {
  // ─── 0. Startup + channels in scope ───
  const { data: startup } = await admin
    .from("startups")
    .select("name, slug")
    .eq("id", startupId)
    .maybeSingle();

  const chQ = admin
    .from("connector_data_youtube_channels")
    .select("id, channel_id, title, handle, custom_url, subscriber_count, view_count, video_count, country, is_monetized, channel_created")
    .eq("startup_id", startupId);
  if (channelUuid) chQ.eq("id", channelUuid);
  const { data: channels } = await chQ;
  const channelList = (channels ?? []) as any[];
  const channelIds = channelList.map((c) => c.id);
  if (channelIds.length === 0) {
    return {
      startup_name: startup?.name ?? null,
      scope_summary: "No channels in scope.",
      channels: [],
    };
  }
  const channelMap = new Map<string, any>(channelList.map((c) => [c.id, c]));

  // ─── 1. Recent + baseline KPIs from channel_analytics ───
  const sinceRecent = dateNDaysAgoISO(windowDays);
  const sinceBaseline = dateNDaysAgoISO(windowDays * 2);

  const { data: chAn } = await admin
    .from("connector_data_youtube_channel_analytics")
    .select("channel_uuid, date, views, estimated_minutes_watched, estimated_revenue_usd, subscribers_gained, subscribers_lost, likes, comments, shares")
    .in("channel_uuid", channelIds)
    .gte("date", sinceBaseline);

  const sumKpis = (rows: any[]) => ({
    views: rows.reduce((a, r) => a + Number(r.views || 0), 0),
    watch_minutes: rows.reduce((a, r) => a + Number(r.estimated_minutes_watched || 0), 0),
    revenue_usd: Number(rows.reduce((a, r) => a + Number(r.estimated_revenue_usd || 0), 0).toFixed(2)),
    subs_gained: rows.reduce((a, r) => a + Number(r.subscribers_gained || 0), 0),
    subs_lost: rows.reduce((a, r) => a + Number(r.subscribers_lost || 0), 0),
    likes: rows.reduce((a, r) => a + Number(r.likes || 0), 0),
    comments: rows.reduce((a, r) => a + Number(r.comments || 0), 0),
    shares: rows.reduce((a, r) => a + Number(r.shares || 0), 0),
  });
  const recentRows = (chAn ?? []).filter((r: any) => r.date >= sinceRecent);
  const baselineRows = (chAn ?? []).filter((r: any) => r.date < sinceRecent);
  const recent = sumKpis(recentRows);
  const baseline = sumKpis(baselineRows);
  const pctDelta = (cur: number, base: number) =>
    base === 0 ? (cur === 0 ? 0 : 100) : Number((((cur - base) / base) * 100).toFixed(1));
  const delta_pct = {
    views: pctDelta(recent.views, baseline.views),
    watch_minutes: pctDelta(recent.watch_minutes, baseline.watch_minutes),
    revenue_usd: pctDelta(recent.revenue_usd, baseline.revenue_usd),
    subs_gained: pctDelta(recent.subs_gained, baseline.subs_gained),
    likes: pctDelta(recent.likes, baseline.likes),
    comments: pctDelta(recent.comments, baseline.comments),
  };

  // Per-channel KPI breakdown (for "compare channels" prompts)
  const perChannelKpis: any[] = channelList.map((c) => {
    const rows = recentRows.filter((r: any) => r.channel_uuid === c.id);
    const k = sumKpis(rows);
    return {
      channel: c.title,
      subscribers: c.subscriber_count,
      monetized: c.is_monetized,
      window_kpis: k,
    };
  });

  // ─── 2. Videos and cohort summary ───
  const { data: videos } = await admin
    .from("connector_data_youtube_videos")
    .select("id, video_id, title, view_count, published_at, duration_seconds, channel_uuid, tags")
    .in("channel_uuid", channelIds);
  const videoList = (videos ?? []) as any[];
  const videoMap = new Map<string, any>(videoList.map((v) => [v.id, v]));

  // Latest analytics row per video → recent-30d views per video
  const { data: vidAn } = await admin
    .from("connector_data_youtube_video_analytics")
    .select("video_uuid, views, estimated_revenue_usd, average_view_percentage, date")
    .in("video_uuid", videoList.map((v) => v.id));
  const latestByVideo = new Map<string, { views: number; revenue: number | null; avg_pct: number | null }>();
  const latestDateByVideo = new Map<string, string>();
  for (const a of vidAn ?? []) {
    const vid = (a as any).video_uuid as string;
    const date = (a as any).date as string;
    const cur = latestDateByVideo.get(vid);
    if (!cur || date > cur) {
      latestDateByVideo.set(vid, date);
      latestByVideo.set(vid, {
        views: Number((a as any).views ?? 0),
        revenue: (a as any).estimated_revenue_usd != null ? Number((a as any).estimated_revenue_usd) : null,
        avg_pct: (a as any).average_view_percentage != null ? Number((a as any).average_view_percentage) : null,
      });
    }
  }

  // Cohort classification
  const trajectoryTotals = { rising: 0, steady: 0, decaying: 0, dead: 0 };
  const today = Date.now();
  const longTail: any[] = [];
  for (const v of videoList) {
    if (!v.published_at) continue;
    const ageDays = Math.max(0, (today - new Date(v.published_at).getTime()) / 864e5);
    const recentInfo = latestByVideo.get(v.id);
    const recentViews = recentInfo?.views ?? 0;
    const lifetime = Number(v.view_count ?? 0);
    const lifetime_vpd = ageDays > 0 ? lifetime / ageDays : 0;
    const recent_vpd = recentViews / 30;
    const cls = classifyTrajectory(lifetime_vpd, recent_vpd, ageDays);
    (trajectoryTotals as any)[cls]++;
    if (ageDays > 30 && recentViews > 100 && lifetime_vpd > 0) {
      longTail.push({
        title: v.title, channel: channelMap.get(v.channel_uuid)?.title,
        age_days: Math.round(ageDays), lifetime_views: lifetime,
        recent_30d_views: recentViews,
        lift_ratio: Number((recent_vpd / lifetime_vpd).toFixed(2)),
      });
    }
  }
  longTail.sort((a, b) => b.lift_ratio - a.lift_ratio);

  // Top videos by recent views (last 30d)
  const topByRecentViews = Array.from(latestByVideo.entries())
    .map(([vid, info]) => {
      const v = videoMap.get(vid);
      if (!v) return null;
      return {
        title: v.title, channel: channelMap.get(v.channel_uuid)?.title,
        video_id: v.video_id, recent_30d_views: info.views,
        lifetime_views: v.view_count,
        avg_view_pct: info.avg_pct,
      };
    })
    .filter((x): x is any => x != null)
    .sort((a, b) => b.recent_30d_views - a.recent_30d_views)
    .slice(0, 10);

  const topByRecentRevenue = Array.from(latestByVideo.entries())
    .map(([vid, info]) => {
      const v = videoMap.get(vid);
      if (!v || info.revenue == null) return null;
      return {
        title: v.title, channel: channelMap.get(v.channel_uuid)?.title,
        revenue_usd: Number(info.revenue.toFixed(2)),
        recent_30d_views: info.views,
      };
    })
    .filter((x): x is any => x != null)
    .sort((a, b) => b.revenue_usd - a.revenue_usd)
    .slice(0, 10);

  // ─── 3. Audience (demographics, geography, devices, traffic) — latest period only ───
  const [demoR, geoR, devR, trafR] = await Promise.all([
    admin.from("connector_data_youtube_demographics")
      .select("channel_uuid, period_end_date, age_group, gender, viewer_percentage")
      .in("channel_uuid", channelIds)
      .order("period_end_date", { ascending: false }),
    admin.from("connector_data_youtube_geography")
      .select("channel_uuid, period_end_date, country_code, views, estimated_minutes_watched, estimated_revenue_usd")
      .in("channel_uuid", channelIds)
      .order("period_end_date", { ascending: false }),
    admin.from("connector_data_youtube_device_types")
      .select("channel_uuid, period_end_date, device_type, views")
      .in("channel_uuid", channelIds)
      .order("period_end_date", { ascending: false }),
    admin.from("connector_data_youtube_traffic_sources")
      .select("channel_uuid, period_end_date, source_type, views")
      .in("channel_uuid", channelIds)
      .order("period_end_date", { ascending: false }),
  ]);

  function latestRows<T extends { period_end_date: string }>(rows: T[] | null): T[] {
    const all = rows ?? [];
    if (all.length === 0) return [];
    const latest = all.reduce((max: string, r) => (r.period_end_date > max ? r.period_end_date : max), all[0].period_end_date);
    return all.filter((r) => r.period_end_date === latest);
  }

  const demoLatest = latestRows(demoR.data as any[]);
  const demoByBucket = new Map<string, { sum: number; n: number }>();
  for (const r of demoLatest) {
    const key = `${(r as any).age_group}|${(r as any).gender}`;
    const cur = demoByBucket.get(key) ?? { sum: 0, n: 0 };
    cur.sum += Number((r as any).viewer_percentage ?? 0);
    cur.n++;
    demoByBucket.set(key, cur);
  }
  const demographics = Array.from(demoByBucket.entries())
    .map(([k, v]) => {
      const [age, gender] = k.split("|");
      return { age, gender, viewer_pct: Number((v.sum / v.n).toFixed(1)) };
    })
    .sort((a, b) => b.viewer_pct - a.viewer_pct)
    .slice(0, 12);

  const geoLatest = latestRows(geoR.data as any[]);
  const geoBy = new Map<string, { views: number; minutes: number; revenue: number | null }>();
  for (const r of geoLatest) {
    const cur = geoBy.get((r as any).country_code) ?? { views: 0, minutes: 0, revenue: null };
    cur.views += Number((r as any).views ?? 0);
    cur.minutes += Number((r as any).estimated_minutes_watched ?? 0);
    if ((r as any).estimated_revenue_usd != null) {
      cur.revenue = (cur.revenue ?? 0) + Number((r as any).estimated_revenue_usd);
    }
    geoBy.set((r as any).country_code, cur);
  }
  const top_countries = Array.from(geoBy.entries())
    .map(([cc, v]) => ({
      country: cc, views: v.views, watch_minutes: v.minutes,
      revenue_usd: v.revenue != null ? Number(v.revenue.toFixed(2)) : null,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const devLatest = latestRows(devR.data as any[]);
  const devBy = new Map<string, number>();
  let totalDevViews = 0;
  for (const r of devLatest) {
    const cur = devBy.get((r as any).device_type) ?? 0;
    devBy.set((r as any).device_type, cur + Number((r as any).views ?? 0));
    totalDevViews += Number((r as any).views ?? 0);
  }
  const devices = Array.from(devBy.entries())
    .map(([d, views]) => ({
      device: DEVICE_LABEL[d] ?? d,
      share_pct: totalDevViews > 0 ? Number(((views / totalDevViews) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.share_pct - a.share_pct);

  const trafLatest = latestRows(trafR.data as any[]);
  const trafBy = new Map<string, number>();
  let totalTrafViews = 0;
  for (const r of trafLatest) {
    const cur = trafBy.get((r as any).source_type) ?? 0;
    trafBy.set((r as any).source_type, cur + Number((r as any).views ?? 0));
    totalTrafViews += Number((r as any).views ?? 0);
  }
  const traffic_sources = Array.from(trafBy.entries())
    .map(([s, views]) => ({
      source: TRAFFIC_LABEL[s] ?? s,
      share_pct: totalTrafViews > 0 ? Number(((views / totalTrafViews) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.share_pct - a.share_pct)
    .slice(0, 10);

  // ─── 4. Retention summary ───
  const { data: retRows } = await admin
    .from("connector_data_youtube_video_retention")
    .select("video_uuid, period_end_date, audience_watch_ratio, relative_retention_performance")
    .in("video_uuid", videoList.map((v) => v.id));

  // Latest period per video, then average watch ratio per video
  const retLatestPerVideo = new Map<string, string>();
  for (const r of retRows ?? []) {
    const vid = (r as any).video_uuid as string;
    const pe = (r as any).period_end_date as string;
    const cur = retLatestPerVideo.get(vid);
    if (!cur || pe > cur) retLatestPerVideo.set(vid, pe);
  }
  const retentionByVideo = new Map<string, { avgRatio: number; avgRel: number | null; count: number }>();
  for (const r of retRows ?? []) {
    const vid = (r as any).video_uuid as string;
    if ((r as any).period_end_date !== retLatestPerVideo.get(vid)) continue;
    const cur = retentionByVideo.get(vid) ?? { avgRatio: 0, avgRel: null, count: 0 };
    cur.avgRatio += Number((r as any).audience_watch_ratio ?? 0);
    if ((r as any).relative_retention_performance != null) {
      cur.avgRel = (cur.avgRel ?? 0) + Number((r as any).relative_retention_performance);
    }
    cur.count++;
    retentionByVideo.set(vid, cur);
  }
  const retentionPerVideo = Array.from(retentionByVideo.entries()).map(([vid, agg]) => {
    const v = videoMap.get(vid);
    return {
      video_uuid: vid,
      title: v?.title,
      channel: channelMap.get(v?.channel_uuid)?.title,
      avg_watch_ratio: agg.count > 0 ? Number((agg.avgRatio / agg.count).toFixed(3)) : 0,
      vs_yt_avg_pct: agg.avgRel != null && agg.count > 0
        ? Number((((agg.avgRel / agg.count) - 0.5) * 200).toFixed(0))
        : null,
    };
  });
  retentionPerVideo.sort((a, b) => b.avg_watch_ratio - a.avg_watch_ratio);
  const retention_summary = {
    videos_with_curves: retentionPerVideo.length,
    cohort_avg_watch_ratio: retentionPerVideo.length > 0
      ? Number((retentionPerVideo.reduce((acc, r) => acc + r.avg_watch_ratio, 0) / retentionPerVideo.length).toFixed(3))
      : 0,
    top_3_retention: retentionPerVideo.slice(0, 3),
    bottom_3_retention: retentionPerVideo.slice(-3).reverse(),
  };

  // ─── 5. Content patterns: upload heatmap, title length, duration, tags ───
  const tz = "Asia/Kolkata"; // Founder OS team is India-based by default
  const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "2-digit", hour12: false });
  const heatBuckets = new Map<string, { count: number; totalViews: number }>();
  for (const v of videoList) {
    if (!v.published_at) continue;
    const parts = weekdayFmt.formatToParts(new Date(v.published_at));
    const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const key = `${wd} ${hour}`;
    const cur = heatBuckets.get(key) ?? { count: 0, totalViews: 0 };
    cur.count++;
    cur.totalViews += Number(v.view_count ?? 0);
    heatBuckets.set(key, cur);
  }
  const bestUploadSlots = Array.from(heatBuckets.entries())
    .map(([slot, v]) => ({ slot, video_count: v.count, avg_views: Math.round(v.totalViews / v.count) }))
    .filter((s) => s.video_count >= 3) // noise floor
    .sort((a, b) => b.avg_views - a.avg_views)
    .slice(0, 5);

  // Title length buckets
  const titleBuckets = [
    { label: "≤30",    min: 0,   max: 30  },
    { label: "31–50",  min: 31,  max: 50  },
    { label: "51–70",  min: 51,  max: 70  },
    { label: "71–100", min: 71,  max: 100 },
    { label: "100+",   min: 101, max: 9999 },
  ];
  const titleBucketStats = titleBuckets.map((b) => {
    const matches = videoList.filter((v) => {
      const len = (v.title ?? "").length;
      return len >= b.min && len <= b.max;
    });
    const views = matches.map((v) => Number(v.view_count ?? 0));
    return {
      bucket: b.label,
      video_count: matches.length,
      avg_views: matches.length > 0 ? Math.round(views.reduce((a, c) => a + c, 0) / matches.length) : 0,
    };
  });

  // Duration buckets
  const durBuckets = [
    { label: "Shorts (<60s)", min: 0,    max: 59   },
    { label: "1–3 min",       min: 60,   max: 180  },
    { label: "3–10 min",      min: 181,  max: 600  },
    { label: "10–20 min",     min: 601,  max: 1200 },
    { label: "20+ min",       min: 1201, max: 99999 },
  ];
  const durBucketStats = durBuckets.map((b) => {
    const matches = videoList.filter((v) => {
      const d = Number(v.duration_seconds ?? 0);
      return d >= b.min && d <= b.max;
    });
    const views = matches.map((v) => Number(v.view_count ?? 0));
    return {
      bucket: b.label,
      video_count: matches.length,
      avg_views: matches.length > 0 ? Math.round(views.reduce((a, c) => a + c, 0) / matches.length) : 0,
    };
  });

  // Top tags
  const tagAccum = new Map<string, { count: number; totalViews: number }>();
  for (const v of videoList) {
    if (!v.tags || v.tags.length === 0) continue;
    for (const raw of v.tags) {
      const tag = String(raw).trim().toLowerCase();
      if (!tag || tag.length < 2) continue;
      const cur = tagAccum.get(tag) ?? { count: 0, totalViews: 0 };
      cur.count++;
      cur.totalViews += Number(v.view_count ?? 0);
      tagAccum.set(tag, cur);
    }
  }
  const topTags = Array.from(tagAccum.entries())
    .filter(([, v]) => v.count >= 3)
    .map(([tag, v]) => ({
      tag, video_count: v.count,
      avg_views_per_video: Math.round(v.totalViews / v.count),
    }))
    .sort((a, b) => b.avg_views_per_video - a.avg_views_per_video)
    .slice(0, 15);

  return {
    startup_name: startup?.name ?? null,
    scope: {
      channels_in_scope: channelList.length,
      window_days: windowDays,
      reference_date: todayISO(),
    },
    channels: channelList.map((c) => ({
      title: c.title,
      handle: c.handle ?? c.custom_url,
      subscribers: c.subscriber_count,
      lifetime_views: c.view_count,
      total_videos: c.video_count,
      country: c.country,
      monetized: c.is_monetized,
      channel_created: c.channel_created,
    })),
    kpis_recent_window: recent,
    kpis_baseline_prev_window: baseline,
    kpis_delta_pct,
    per_channel_recent_kpis: perChannelKpis,
    video_cohort_summary: {
      total_videos: videoList.length,
      trajectory_mix: trajectoryTotals,
      long_tail_winners_count: longTail.length,
      top_5_long_tail: longTail.slice(0, 5),
    },
    top_videos_by_recent_views: topByRecentViews,
    top_videos_by_recent_revenue: topByRecentRevenue,
    audience: {
      demographics_top_buckets: demographics,
      top_countries,
      device_split: devices,
    },
    traffic_sources,
    retention_summary,
    content_patterns: {
      best_upload_slots_local_tz: bestUploadSlots,
      timezone: tz,
      title_length_buckets: titleBucketStats,
      duration_buckets: durBucketStats,
      top_tags_by_avg_views: topTags,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    const body = await req.json().catch(() => ({})) as RequestBody;
    if (!body.startup_id || !body.question?.trim()) {
      return new Response(JSON.stringify({ error: "startup_id and question are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const windowDays = Math.max(7, Math.min(180, Number(body.window_days || 30)));

    const snapshot = await buildSnapshot(admin, body.startup_id, body.channel_uuid ?? null, windowDays);

    if ("channels" in snapshot && snapshot.channels.length === 0) {
      return new Response(JSON.stringify({
        answer: "I don't have any YouTube channels for this scope yet. Add channels and run **Sync analytics** before asking questions.",
        snapshot_summary: { channels_in_scope: 0 },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = `You are KAI — the analytics co-pilot for ${snapshot.startup_name ?? "this team"}'s YouTube channels.

You will be given a JSON snapshot of channel performance, audience, retention, and content patterns. Answer the user's question using ONLY that data.

Your job:
1. Answer directly with specific, grounded numbers from the snapshot — quote them.
2. Surface non-obvious patterns (e.g., demographic vs traffic mismatches, retention cliffs, trajectory shifts).
3. Identify risks the user might not have noticed (revenue concentration, treadmill dependency, weak hooks, stale catalogs, churn).
4. When the question asks for ideas (topics, upload times, formats), ground every suggestion in a specific data point from the snapshot — never give generic advice.
5. Use markdown structure: **bold headers**, bullet lists, and short paragraphs. Tables are fine for comparisons.
6. Be concise but specific — every sentence should either cite a number or recommend an action tied to one.

Hard rules:
- Never invent numbers not in the snapshot.
- If the data doesn't support a confident answer, say "The data doesn't show this clearly" rather than guessing.
- Avoid generic creator-advice clichés ("post consistently", "engage your audience", "use eye-catching thumbnails") unless backed by a specific signal in the snapshot.
- For "what could go wrong" questions, identify specific failure modes visible in the data (e.g., "65% of recent views come from a single video" or "demographics are 80% male — limits monetization ceiling").
- For "topic suggestions", reference the strongest tags, audience demographics, and best-performing content patterns to ground each idea.
`;

    const userMessage = `Question: ${body.question.trim()}

Data snapshot:
\`\`\`json
${JSON.stringify(snapshot, null, 2)}
\`\`\``;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited by the AI gateway. Try again in a minute." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Top up in Lovable Settings → AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t.slice(0, 300));
      return new Response(JSON.stringify({ error: `AI gateway returned ${aiRes.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const answer = data.choices?.[0]?.message?.content || "(no answer returned)";

    return new Response(JSON.stringify({
      answer,
      snapshot_summary: {
        channels_in_scope: (snapshot as any).scope?.channels_in_scope ?? 0,
        window_days: windowDays,
        total_videos: (snapshot as any).video_cohort_summary?.total_videos ?? 0,
        recent_views: (snapshot as any).kpis_recent_window?.views ?? 0,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("youtube-kai-ask error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
