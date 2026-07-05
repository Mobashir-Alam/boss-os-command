// Slack KAI — natural-language Q&A over the full Slack snapshot
//
// Body: { startup_id: string, question: string, scope?: "all" | string, stream?: boolean }
// Reads all Slack analytics tables via service role and asks the AI helper
// (Lovable Gemini today; auto-upgrades to Claude Opus 4.8 when ANTHROPIC_API_KEY
// is configured). stream: true returns SSE.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { askAI, streamAI } from "../_shared/kai-ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function pctDelta(current: number, baseline: number): number | null {
  if (!baseline) return null;
  return Math.round(((current - baseline) / baseline) * 100);
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// ─── Snapshot builder ────────────────────────────────────────

const FULL_DAYS = 60; // matches the slack-sync history window

async function buildSnapshot(
  admin: ReturnType<typeof createClient>,
  startup_id: string
) {
  const today = new Date();
  const dateStr = (d: Date) => d.toISOString().slice(0, 10);
  const nDaysAgo = (n: number) =>
    dateStr(new Date(Date.now() - n * 864e5));

  const period_end = dateStr(today);
  const full_start = nDaysAgo(FULL_DAYS);  // comprehensive window
  const period_start = nDaysAgo(14);       // "recent" slice for momentum
  const baseline_start = nDaysAgo(28);     // prior 14d for momentum

  // Workspace
  const { data: ws } = await admin
    .from("connector_slack_workspace")
    .select("workspace_name,workspace_domain,member_count_total,synced_at")
    .eq("startup_id", startup_id)
    .maybeSingle();

  // Channel stats — FULL window; recent/baseline slices derived below for momentum
  const { data: allChanStats } = await admin
    .from("connector_data_slack_channel_stats")
    .select("channel_id,channel_name,stat_date,message_count,active_users,reactions_total,replies_total,peak_hour")
    .eq("startup_id", startup_id)
    .gte("stat_date", full_start)
    .lte("stat_date", period_end);
  const chanStats = (allChanStats ?? []).filter((r) => r.stat_date >= period_start);
  const baselineStats = (allChanStats ?? []).filter((r) => r.stat_date >= baseline_start && r.stat_date < period_start);

  // Aggregate recent KPIs
  const recent = {
    messages: chanStats.reduce((s, r) => s + r.message_count, 0),
    reactions: chanStats.reduce((s, r) => s + r.reactions_total, 0),
    replies: chanStats.reduce((s, r) => s + r.replies_total, 0),
    active_channels: new Set(chanStats.filter(r => r.message_count > 0).map(r => r.channel_id)).size,
  };

  const baseline_rec = {
    messages: baselineStats?.reduce((s, r) => s + r.message_count, 0) ?? 0,
    reactions: baselineStats?.reduce((s, r) => s + r.reactions_total, 0) ?? 0,
    replies: baselineStats?.reduce((s, r) => s + r.replies_total, 0) ?? 0,
  };

  const kpis_delta_pct = {
    messages: pctDelta(recent.messages, baseline_rec.messages),
    reactions: pctDelta(recent.reactions, baseline_rec.reactions),
    replies: pctDelta(recent.replies, baseline_rec.replies),
  };

  // Per-channel breakdown over the FULL window (every channel)
  const channelMap = new Map<string, { name: string; messages: number; active_users: number; reactions: number; replies: number; last_active: string | null }>();
  for (const r of allChanStats ?? []) {
    const prev = channelMap.get(r.channel_id) ?? { name: r.channel_name, messages: 0, active_users: 0, reactions: 0, replies: 0, last_active: null };
    channelMap.set(r.channel_id, {
      name: r.channel_name,
      messages: prev.messages + r.message_count,
      active_users: Math.max(prev.active_users, r.active_users),
      reactions: prev.reactions + r.reactions_total,
      replies: prev.replies + r.replies_total,
      last_active: r.message_count > 0 && (!prev.last_active || r.stat_date > prev.last_active) ? r.stat_date : prev.last_active,
    });
  }
  const channels = Array.from(channelMap.values()).sort((a, b) => b.messages - a.messages);

  // User stats — FULL window (every contributor); recent slice for active posters
  const { data: allUserStats } = await admin
    .from("connector_data_slack_user_stats")
    .select("user_id_source,display_name,stat_date,messages_sent,reactions_given,replies_sent")
    .eq("startup_id", startup_id)
    .gte("stat_date", full_start)
    .lte("stat_date", period_end);
  const userStats = (allUserStats ?? []).filter((r) => r.stat_date >= period_start);

  const userMap = new Map<string, { name: string; messages: number; reactions: number; replies: number }>();
  for (const r of allUserStats ?? []) {
    const prev = userMap.get(r.user_id_source) ?? { name: r.display_name ?? r.user_id_source, messages: 0, reactions: 0, replies: 0 };
    userMap.set(r.user_id_source, {
      name: r.display_name ?? prev.name,
      messages: prev.messages + r.messages_sent,
      reactions: prev.reactions + r.reactions_given,
      replies: prev.replies + r.replies_sent,
    });
  }
  const contributors = Array.from(userMap.values())
    .sort((a, b) => b.messages - a.messages);

  // Timing: peak posting hour over the full window (each channel-day's peak_hour)
  const hourBuckets: number[] = new Array(24).fill(0);
  for (const r of allChanStats ?? []) {
    if (r.peak_hour != null) hourBuckets[r.peak_hour] += r.message_count;
  }
  const peak_hour = hourBuckets.indexOf(Math.max(...hourBuckets));

  // Total users
  const { count: total_users } = await admin
    .from("connector_data_slack_users")
    .select("id", { count: "exact", head: true })
    .eq("startup_id", startup_id)
    .eq("is_bot", false);

  // Active posters in period
  const active_poster_ids = new Set((userStats ?? []).filter(r => r.messages_sent > 0).map(r => r.user_id_source));
  const lurker_pct = total_users
    ? Math.round(((total_users - active_poster_ids.size) / total_users) * 100)
    : null;

  // Top reacted messages — full window
  const { data: topMsgs } = await admin
    .from("connector_data_slack")
    .select("channel_name,text,reaction_count,reply_count,message_date,raw_payload")
    .eq("startup_id", startup_id)
    .gte("message_date", full_start)
    .order("reaction_count", { ascending: false })
    .limit(15);

  // Attendance — FULL window, per person
  const { data: attRows } = await admin
    .from("slack_daily_attendance")
    .select("user_id_source,display_name,work_date,checked_in,check_in_source,posted_update,was_active,message_count")
    .eq("startup_id", startup_id)
    .gte("work_date", full_start);

  let attendance_summary: Record<string, unknown> | null = null;
  if (attRows && attRows.length > 0) {
    const workDates = Array.from(new Set(attRows.map((r) => r.work_date))).sort();
    const latestDate = workDates[workDates.length - 1];
    const perUser = new Map<string, { name: string; present: number; updates: number; active_no_checkin: number; self_reported: number; days: number }>();
    for (const r of attRows) {
      const u = perUser.get(r.user_id_source) ?? { name: r.display_name ?? r.user_id_source, present: 0, updates: 0, active_no_checkin: 0, self_reported: 0, days: 0 };
      u.days++;
      if (r.checked_in) u.present++;
      if (r.posted_update) u.updates++;
      if (r.was_active && !r.checked_in) u.active_no_checkin++;
      if (r.check_in_source === "self_reported") u.self_reported++;
      perUser.set(r.user_id_source, u);
    }
    const people = Array.from(perUser.values());
    // Today's exceptions
    const todayRows = attRows.filter((r) => r.work_date === latestDate);
    const checkedInToday = todayRows.filter((r) => r.checked_in).length;
    const activeNoCheckinToday = todayRows
      .filter((r) => r.was_active && !r.checked_in)
      .map((r) => r.display_name ?? r.user_id_source);
    const noUpdateToday = todayRows
      .filter((r) => r.was_active && !r.posted_update)
      .map((r) => r.display_name ?? r.user_id_source);

    attendance_summary = {
      latest_work_date: latestDate,
      work_days_in_window: workDates.length,
      today: {
        checked_in: checkedInToday,
        active_but_no_checkin: activeNoCheckinToday,
        active_but_no_update: noUpdateToday,
      },
      most_self_reported: people
        .filter((p) => p.self_reported > 0)
        .map((p) => ({ name: p.name, self_reported_days: p.self_reported, days_seen: p.days }))
        .sort((a, b) => b.self_reported_days - a.self_reported_days)
        .slice(0, 50),
      lowest_checkin_rate: people
        .filter((p) => p.days >= 3)
        .map((p) => ({ name: p.name, checkin_rate_pct: Math.round((p.present / p.days) * 100), days_seen: p.days }))
        .sort((a, b) => a.checkin_rate_pct - b.checkin_rate_pct)
        .slice(0, 50),
      lowest_update_rate: people
        .filter((p) => p.days >= 3)
        .map((p) => ({ name: p.name, update_rate_pct: Math.round((p.updates / p.days) * 100), days_seen: p.days }))
        .sort((a, b) => a.update_rate_pct - b.update_rate_pct)
        .slice(0, 50),
    };
  }

  return {
    workspace: {
      name: ws?.workspace_name ?? "Unknown",
      domain: ws?.workspace_domain,
      total_members: ws?.member_count_total,
      last_synced: ws?.synced_at,
    },
    window: { full_window_days: FULL_DAYS, momentum: "last 14 days vs prior 14 days" },
    kpis: {
      recent_14d: recent,
      delta_14d_vs_prior_pct: kpis_delta_pct,
    },
    channels,        // every channel over the full window
    contributors,    // every contributor over the full window
    engagement: {
      lurker_pct,
      active_posters_14d: active_poster_ids.size,
      peak_hour_utc: peak_hour,
      top_messages: topMsgs?.map(m => ({
        channel: m.channel_name,
        text: (m.text ?? "").slice(0, 200),
        reactions: m.reaction_count,
        replies: m.reply_count,
        date: m.message_date,
      })) ?? [],
    },
    attendance: attendance_summary,
  };
}

// ─── Main handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { startup_id, question, stream } = (await req.json()) as {
      startup_id: string;
      question: string;
      stream?: boolean;
    };
    if (!startup_id || !question) {
      throw new Error("startup_id and question are required");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const snapshot = await buildSnapshot(admin, startup_id);

    const systemPrompt = `You are KAI, a senior team operations and accountability analyst. You have a JSON snapshot of the workspace's Slack activity over the FULL synced window (~60 days):
- "kpis" — recent-14-days totals + a 14d-vs-prior-14d momentum read.
- "channels" — EVERY channel over the full window (messages, active users, reactions, replies, last_active).
- "contributors" — EVERY person over the full window (messages, reactions given, replies).
- "engagement" — lurker rate, peak posting hour (UTC), and the top reacted messages.
- "attendance" — the accountability section over the full window (check-in/update rates, self-reported backfills, today's exceptions).

Rules:
- Only cite numbers that appear in the snapshot. Never invent data. You have the whole picture — scan the full "channels"/"contributors" arrays for questions about a specific channel or person, not just the top entries.
- For accountability questions ("who isn't showing up", "who skips updates"), use the attendance section: check-in rates, update rates, and today's active_but_no_checkin / active_but_no_update lists.
- "active_but_no_checkin" means the person was clearly working in Slack but never posted in the attendance channel — flag these as the real accountability gap, not as absences.
- "most_self_reported" lists people whose attendance was filled from a later bulk message rather than a live same-day check-in. High self-reported counts mean someone consistently backfills instead of checking in on time — worth noting.
- There is NO "late" concept — shifts are dynamic. Never judge someone as late based on check-in time.
- If attendance is null, say attendance monitoring isn't configured yet rather than guessing.
- Surface non-obvious patterns: channel concentration, lurker ratios, reply vs message imbalances.
- Flag risks with specifics (e.g. "Omar checked in only 4 of 12 days").
- Be concise but insightful — avoid padding.
- Format with markdown headers and bullets for readability.

Snapshot:
\`\`\`json
${JSON.stringify(snapshot, null, 2)}
\`\`\``;

    if (stream === true) {
      return await streamAI(
        { system: systemPrompt, user: question, maxTokens: 4096 },
        corsHeaders
      );
    }

    const result = await askAI({ system: systemPrompt, user: question, maxTokens: 4096 });
    if (!result.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: result.error }),
        { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, answer: result.answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
