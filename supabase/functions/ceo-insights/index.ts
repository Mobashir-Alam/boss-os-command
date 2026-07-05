// CEO Insights — AI-generated insight cards + per-source summaries for the
// Command Center.
//
// Body: { startup_id: string, period_days: 7|15|30, force?: boolean }
// Returns: { ok, generated_at, cached, insights: InsightCard[6], summaries: {youtube, slack, github} }
//
// Data is fetched with the service role, condensed into a factual context
// string, and sent to the AI helper (Lovable Gemini today; Claude Opus 4.8
// once ANTHROPIC_API_KEY is configured). Results are cached in
// ceo_insights_cache and only regenerated when >3h old (or force: true).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { askAI } from "../_shared/kai-ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3h

interface InsightCard {
  priority: number;
  source: "youtube" | "slack" | "github" | "cross";
  headline: string;
  finding: string;
  action: string;
  tone: "positive" | "warning" | "critical" | "neutral";
}

interface SourceSummaries {
  youtube: Record<string, unknown>;
  slack: Record<string, unknown>;
  github: Record<string, unknown>;
}

function daysAgoISO(n: number): string {
  return new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
}

// ── Data gathering ──────────────────────────────────────────────────────────

async function buildContext(
  admin: ReturnType<typeof createClient>,
  startupId: string,
  periodDays: number
): Promise<string> {
  const since = daysAgoISO(periodDays);

  // ── YouTube ──
  const { data: channels } = await admin
    .from("connector_data_youtube_channels")
    .select("id, title, subscriber_count, view_count, video_count")
    .eq("startup_id", startupId);
  const channelIds = (channels ?? []).map((c: any) => c.id);
  const channelMap = new Map((channels ?? []).map((c: any) => [c.id, c.title]));

  let ytViews = 0, ytSubsGained = 0, ytSubsLost = 0, ytRevenue = 0;
  const ytPerChannel = new Map<string, number>();
  if (channelIds.length > 0) {
    const { data: chAn } = await admin
      .from("connector_data_youtube_channel_analytics")
      .select("channel_uuid, views, subscribers_gained, subscribers_lost, estimated_revenue_usd, cpm_usd")
      .in("channel_uuid", channelIds)
      .gte("date", since);
    for (const r of chAn ?? []) {
      ytViews += Number((r as any).views ?? 0);
      ytSubsGained += Number((r as any).subscribers_gained ?? 0);
      ytSubsLost += Number((r as any).subscribers_lost ?? 0);
      ytRevenue += Number((r as any).estimated_revenue_usd ?? 0);
      const cid = (r as any).channel_uuid as string;
      ytPerChannel.set(cid, (ytPerChannel.get(cid) ?? 0) + Number((r as any).views ?? 0));
    }
  }
  const channelGrowth = Array.from(ytPerChannel.entries())
    .map(([cid, views]) => ({ channel: channelMap.get(cid) ?? cid, views }))
    .sort((a, b) => b.views - a.views);

  // Top 5 videos by recent views (latest analytics row per video). Videos are
  // pre-capped at the top 200 by lifetime views to keep the .in() URL short.
  let topVideos: Array<{ title: string; recent_views: number }> = [];
  if (channelIds.length > 0) {
    const { data: videos } = await admin
      .from("connector_data_youtube_videos")
      .select("id, title, view_count")
      .in("channel_uuid", channelIds)
      .order("view_count", { ascending: false })
      .limit(200);
    const vidMap = new Map((videos ?? []).map((v: any) => [v.id, v.title]));
    const vidIds = (videos ?? []).map((v: any) => v.id);
    if (vidIds.length > 0) {
      const { data: vidAn } = await admin
        .from("connector_data_youtube_video_analytics")
        .select("video_uuid, views, date")
        .in("video_uuid", vidIds);
      const latestByVid = new Map<string, { views: number; date: string }>();
      for (const a of vidAn ?? []) {
        const vid = (a as any).video_uuid as string;
        const cur = latestByVid.get(vid);
        if (!cur || (a as any).date > cur.date) {
          latestByVid.set(vid, { views: Number((a as any).views ?? 0), date: (a as any).date });
        }
      }
      topVideos = Array.from(latestByVid.entries())
        .map(([vid, info]) => ({ title: (vidMap.get(vid) as string) ?? "unknown", recent_views: info.views }))
        .sort((a, b) => b.recent_views - a.recent_views)
        .slice(0, 5);
    }
  }

  // ── Slack ──
  const { data: attRows } = await admin
    .from("slack_daily_attendance")
    .select("user_id_source, display_name, work_date, checked_in, was_active")
    .eq("startup_id", startupId)
    .gte("work_date", since);
  const att = attRows ?? [];
  const workDates = Array.from(new Set(att.map((r: any) => r.work_date)));
  const perUserAtt = new Map<string, { name: string; present: number; days: number }>();
  for (const r of att) {
    const u = perUserAtt.get((r as any).user_id_source) ?? {
      name: (r as any).display_name ?? (r as any).user_id_source, present: 0, days: 0,
    };
    u.days++;
    if ((r as any).checked_in) u.present++;
    perUserAtt.set((r as any).user_id_source, u);
  }
  const attendanceUsers = Array.from(perUserAtt.values());
  const totalCheckIns = att.filter((r: any) => r.checked_in).length;
  const attendanceRatePct = att.length > 0 ? Math.round((totalCheckIns / att.length) * 100) : null;
  const attendanceRisks = attendanceUsers
    .filter((u) => u.days >= 3 && u.present / u.days < 0.5)
    .map((u) => ({ name: u.name, checkin_rate_pct: Math.round((u.present / u.days) * 100) }));
  const mostCheckIns = attendanceUsers.slice().sort((a, b) => b.present - a.present)[0] ?? null;

  const { data: chanStats } = await admin
    .from("connector_data_slack_channel_stats")
    .select("channel_name, message_count")
    .eq("startup_id", startupId)
    .gte("stat_date", since);
  const chanTotals = new Map<string, number>();
  for (const r of chanStats ?? []) {
    const name = (r as any).channel_name ?? "unknown";
    chanTotals.set(name, (chanTotals.get(name) ?? 0) + Number((r as any).message_count ?? 0));
  }
  const mostActiveChannel = Array.from(chanTotals.entries()).sort(([, a], [, b]) => b - a)[0] ?? null;

  // ── GitHub ──
  const { data: ghDaily } = await admin
    .from("connector_data_github_daily")
    .select("github_login, repo_name, activity_date, commits, prs_merged")
    .eq("startup_id", startupId)
    .gte("activity_date", since);
  const gh = ghDaily ?? [];
  const ghTotalCommits = gh.reduce((s, r: any) => s + Number(r.commits ?? 0), 0);
  const ghPrsMerged = gh.reduce((s, r: any) => s + Number(r.prs_merged ?? 0), 0);
  const perLogin = new Map<string, number>();
  const activeRepos = new Set<string>();
  for (const r of gh) {
    perLogin.set((r as any).github_login, (perLogin.get((r as any).github_login) ?? 0) + Number((r as any).commits ?? 0));
    if (Number((r as any).commits ?? 0) > 0) activeRepos.add((r as any).repo_name);
  }
  const topContributors = Array.from(perLogin.entries())
    .map(([login, commits]) => ({ login, commits }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 3);

  const { data: allRepos } = await admin
    .from("connector_data_github_repos")
    .select("repo_name, is_archived")
    .eq("startup_id", startupId)
    .eq("is_archived", false);
  const dormantRepos = (allRepos ?? [])
    .map((r: any) => r.repo_name as string)
    .filter((name) => !activeRepos.has(name))
    .slice(0, 10);

  // Daily overlays for cross-source correlation
  const ghByDate = new Map<string, number>();
  for (const r of gh) {
    ghByDate.set((r as any).activity_date, (ghByDate.get((r as any).activity_date) ?? 0) + Number((r as any).commits ?? 0));
  }
  const attByDate = new Map<string, { checked: number; total: number }>();
  for (const r of att) {
    const cur = attByDate.get((r as any).work_date) ?? { checked: 0, total: 0 };
    cur.total++;
    if ((r as any).checked_in) cur.checked++;
    attByDate.set((r as any).work_date, cur);
  }
  const dailyOverlay = Array.from(new Set([...ghByDate.keys(), ...attByDate.keys()]))
    .sort()
    .map((d) => ({
      date: d,
      commits: ghByDate.get(d) ?? 0,
      attendance_pct: attByDate.has(d)
        ? Math.round(((attByDate.get(d)!.checked) / Math.max(1, attByDate.get(d)!.total)) * 100)
        : null,
    }));

  return JSON.stringify(
    {
      period_days: periodDays,
      youtube: {
        channels: (channels ?? []).length,
        total_views_period: ytViews,
        subscriber_delta_period: ytSubsGained - ytSubsLost,
        estimated_revenue_usd_period: Number(ytRevenue.toFixed(2)),
        top_videos_by_recent_views: topVideos,
        channel_views_ranking: channelGrowth,
      },
      slack: {
        attendance_rate_pct: attendanceRatePct,
        work_days_in_period: workDates.length,
        people_tracked: attendanceUsers.length,
        person_with_most_checkins: mostCheckIns ? { name: mostCheckIns.name, days: mostCheckIns.present } : null,
        most_active_channel: mostActiveChannel ? { name: mostActiveChannel[0], messages: mostActiveChannel[1] } : null,
        low_attendance_risks: attendanceRisks,
      },
      github: {
        total_commits_period: ghTotalCommits,
        prs_merged_period: ghPrsMerged,
        top_contributors: topContributors,
        active_repos: activeRepos.size,
        dormant_repos: dormantRepos,
      },
      daily_overlay_commits_vs_attendance: dailyOverlay,
    },
    null,
    1
  );
}

// ── Prompts ─────────────────────────────────────────────────────────────────

const INSIGHTS_SYSTEM = `You are the world's best data analyst and strategic advisor to a CEO.
You have access to 7/15/30-day cross-source data from YouTube, Slack, and GitHub.

Produce exactly 6 insight cards. Each card is a JSON object:
{ priority: 1-6, source: 'youtube'|'slack'|'github'|'cross',
  headline: string (max 12 words, punchy),
  finding: string (2-3 sentences, factual with numbers),
  action: string (1 sentence, what the CEO should do),
  tone: 'positive'|'warning'|'critical'|'neutral' }

Rules:
- Priority 1 is most urgent/important
- At least 1 cross-source insight that connects patterns across YouTube+Slack+GitHub
- If attendance is low on days with high GitHub commits, note the correlation
- If YouTube views spiked, check if the team was active (Slack) during that week
- Be ruthlessly specific: use actual numbers from the data
- Never hedge. CEO needs facts, not maybes.
- Return ONLY a JSON array of 6 objects, no markdown, no explanation`;

const SUMMARIES_SYSTEM = `You are a sharp analyst producing per-source summary cards for a CEO dashboard.
Given cross-source data (YouTube, Slack, GitHub), return ONLY a JSON object (no markdown, no explanation) shaped exactly like:
{
  "youtube": { "total_views": number, "top_video": string, "channel_with_most_growth": string, "recommendation": string },
  "slack": { "attendance_rate_pct": number|null, "most_active_channel": string, "top_checkin_person": string, "trend": "improving"|"declining"|"flat", "risk_flag": string|null },
  "github": { "total_commits": number, "prs_merged": number, "most_active_contributor": string, "dormant_repos": string[], "code_health": string }
}
Rules:
- Use only numbers present in the data. Strings must be short (max 15 words).
- youtube.recommendation: one concrete "post more of X" call grounded in top performers.
- slack.risk_flag: name anyone under 40% attendance this period, else null.
- github.code_health: one-sentence signal (velocity, concentration, dormancy).`;

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const firstBracket = candidate.search(/[[{]/);
  if (firstBracket === -1) throw new Error("AI returned no JSON");
  const open = candidate[firstBracket];
  const close = open === "[" ? "]" : "}";
  const last = candidate.lastIndexOf(close);
  return JSON.parse(candidate.slice(firstBracket, last + 1));
}

// ── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { startup_id, period_days, force } = (await req.json()) as {
      startup_id: string;
      period_days: number;
      force?: boolean;
    };
    if (!startup_id) throw new Error("startup_id required");
    const periodDays = [7, 15, 30].includes(Number(period_days)) ? Number(period_days) : 7;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Serve from cache when fresh (<3h) and not forced
    if (!force) {
      const { data: cached } = await admin
        .from("ceo_insights_cache")
        .select("generated_at, insights_json")
        .eq("startup_id", startup_id)
        .eq("period_days", periodDays)
        .maybeSingle();
      if (
        cached &&
        Date.now() - new Date(cached.generated_at as string).getTime() < CACHE_TTL_MS
      ) {
        const payload = cached.insights_json as { insights: InsightCard[]; summaries: SourceSummaries };
        return new Response(
          JSON.stringify({ ok: true, cached: true, generated_at: cached.generated_at, ...payload }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const context = await buildContext(admin, startup_id, periodDays);
    const userMsg = `Cross-source data for the last ${periodDays} days:\n${context}`;

    // Two AI calls: insight cards, then per-source summaries (sequential to
    // stay friendly to gateway rate limits).
    const insightsRes = await askAI({ system: INSIGHTS_SYSTEM, user: userMsg, maxTokens: 2048 });
    if (!insightsRes.ok) {
      return new Response(JSON.stringify({ ok: false, error: insightsRes.error }), {
        status: insightsRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const summariesRes = await askAI({ system: SUMMARIES_SYSTEM, user: userMsg, maxTokens: 1024 });

    let insights: InsightCard[] = [];
    try {
      const parsed = extractJson(insightsRes.answer);
      if (Array.isArray(parsed)) insights = parsed.slice(0, 6) as InsightCard[];
    } catch (e) {
      console.error("insight parse failed:", e, insightsRes.answer.slice(0, 300));
      throw new Error("AI returned malformed insights — try refreshing");
    }
    insights.sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9));

    let summaries: SourceSummaries | null = null;
    if (summariesRes.ok) {
      try {
        summaries = extractJson(summariesRes.answer) as SourceSummaries;
      } catch (e) {
        console.error("summaries parse failed:", e);
      }
    }

    const generatedAt = new Date().toISOString();
    const payload = { insights, summaries };
    const { error: upsertErr } = await admin.from("ceo_insights_cache").upsert(
      {
        startup_id,
        period_days: periodDays,
        generated_at: generatedAt,
        insights_json: payload,
      },
      { onConflict: "startup_id,period_days" }
    );
    if (upsertErr) console.error("cache upsert failed:", upsertErr.message);

    return new Response(
      JSON.stringify({ ok: true, cached: false, generated_at: generatedAt, ...payload }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ceo-insights error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
