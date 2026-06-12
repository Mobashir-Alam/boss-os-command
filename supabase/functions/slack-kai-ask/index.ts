// Slack KAI — natural-language Q&A over the full Slack snapshot
//
// Body: { startup_id: string, question: string, scope?: "all" | string }
// Reads all Slack analytics tables via service role, builds a compact JSON
// snapshot, and calls the Lovable AI gateway (google/gemini-flash).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

async function buildSnapshot(
  admin: ReturnType<typeof createClient>,
  startup_id: string
) {
  const today = new Date();
  const dateStr = (d: Date) => d.toISOString().slice(0, 10);
  const nDaysAgo = (n: number) =>
    dateStr(new Date(Date.now() - n * 864e5));

  const period_end = dateStr(today);
  const period_start = nDaysAgo(14);
  const baseline_start = nDaysAgo(28);
  const baseline_end = nDaysAgo(14);

  // Workspace
  const { data: ws } = await admin
    .from("connector_slack_workspace")
    .select("workspace_name,workspace_domain,member_count_total,synced_at")
    .eq("startup_id", startup_id)
    .maybeSingle();

  // Channel stats — last 14 days
  const { data: chanStats } = await admin
    .from("connector_data_slack_channel_stats")
    .select("channel_id,channel_name,stat_date,message_count,active_users,reactions_total,replies_total")
    .eq("startup_id", startup_id)
    .gte("stat_date", period_start)
    .lte("stat_date", period_end);

  // Channel stats — prior 14 days (baseline)
  const { data: baselineStats } = await admin
    .from("connector_data_slack_channel_stats")
    .select("channel_id,channel_name,stat_date,message_count,active_users,reactions_total,replies_total")
    .eq("startup_id", startup_id)
    .gte("stat_date", baseline_start)
    .lte("stat_date", baseline_end);

  // Aggregate recent KPIs
  const recent = {
    messages: chanStats?.reduce((s, r) => s + r.message_count, 0) ?? 0,
    active_users: new Set(chanStats?.flatMap(() => []) ?? []).size, // approx via user_stats
    reactions: chanStats?.reduce((s, r) => s + r.reactions_total, 0) ?? 0,
    replies: chanStats?.reduce((s, r) => s + r.replies_total, 0) ?? 0,
    active_channels: new Set(chanStats?.filter(r => r.message_count > 0).map(r => r.channel_id) ?? []).size,
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

  // Per-channel breakdown (last 14d)
  const channelMap = new Map<string, { name: string; messages: number; active_users: number; reactions: number }>();
  for (const r of chanStats ?? []) {
    const prev = channelMap.get(r.channel_id) ?? { name: r.channel_name, messages: 0, active_users: 0, reactions: 0 };
    channelMap.set(r.channel_id, {
      name: r.channel_name,
      messages: prev.messages + r.message_count,
      active_users: Math.max(prev.active_users, r.active_users),
      reactions: prev.reactions + r.reactions_total,
    });
  }
  const top_channels = Array.from(channelMap.values())
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 8);

  // User stats — last 14 days
  const { data: userStats } = await admin
    .from("connector_data_slack_user_stats")
    .select("user_id_source,display_name,stat_date,messages_sent,reactions_given,replies_sent")
    .eq("startup_id", startup_id)
    .gte("stat_date", period_start)
    .lte("stat_date", period_end);

  const userMap = new Map<string, { name: string; messages: number; reactions: number; replies: number }>();
  for (const r of userStats ?? []) {
    const prev = userMap.get(r.user_id_source) ?? { name: r.display_name ?? r.user_id_source, messages: 0, reactions: 0, replies: 0 };
    userMap.set(r.user_id_source, {
      name: r.display_name ?? prev.name,
      messages: prev.messages + r.messages_sent,
      reactions: prev.reactions + r.reactions_given,
      replies: prev.replies + r.replies_sent,
    });
  }
  const top_contributors = Array.from(userMap.values())
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 8);

  // Timing: aggregate hour × day of week from channel stats raw peek_hour
  const { data: timingStats } = await admin
    .from("connector_data_slack_channel_stats")
    .select("stat_date,message_count,peak_hour")
    .eq("startup_id", startup_id)
    .gte("stat_date", period_start)
    .lte("stat_date", period_end)
    .not("peak_hour", "is", null);

  const hourBuckets: number[] = new Array(24).fill(0);
  for (const r of timingStats ?? []) {
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

  // Top reacted messages
  const { data: topMsgs } = await admin
    .from("connector_data_slack")
    .select("channel_name,text,reaction_count,reply_count,message_date,raw_payload")
    .eq("startup_id", startup_id)
    .gte("message_date", period_start)
    .order("reaction_count", { ascending: false })
    .limit(5);

  // Attendance — last 14 work-days, per person
  const { data: attRows } = await admin
    .from("slack_daily_attendance")
    .select("user_id_source,display_name,work_date,checked_in,posted_update,was_active,message_count")
    .eq("startup_id", startup_id)
    .gte("work_date", period_start);

  let attendance_summary: Record<string, unknown> | null = null;
  if (attRows && attRows.length > 0) {
    const workDates = Array.from(new Set(attRows.map((r) => r.work_date))).sort();
    const latestDate = workDates[workDates.length - 1];
    const perUser = new Map<string, { name: string; present: number; updates: number; active_no_checkin: number; days: number }>();
    for (const r of attRows) {
      const u = perUser.get(r.user_id_source) ?? { name: r.display_name ?? r.user_id_source, present: 0, updates: 0, active_no_checkin: 0, days: 0 };
      u.days++;
      if (r.checked_in) u.present++;
      if (r.posted_update) u.updates++;
      if (r.was_active && !r.checked_in) u.active_no_checkin++;
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
      lowest_checkin_rate: people
        .filter((p) => p.days >= 3)
        .map((p) => ({ name: p.name, checkin_rate_pct: Math.round((p.present / p.days) * 100), days_seen: p.days }))
        .sort((a, b) => a.checkin_rate_pct - b.checkin_rate_pct)
        .slice(0, 8),
      lowest_update_rate: people
        .filter((p) => p.days >= 3)
        .map((p) => ({ name: p.name, update_rate_pct: Math.round((p.updates / p.days) * 100), days_seen: p.days }))
        .sort((a, b) => a.update_rate_pct - b.update_rate_pct)
        .slice(0, 8),
    };
  }

  return {
    workspace: {
      name: ws?.workspace_name ?? "Unknown",
      domain: ws?.workspace_domain,
      total_members: ws?.member_count_total,
      last_synced: ws?.synced_at,
    },
    period: { start: period_start, end: period_end, days: 14 },
    kpis: {
      recent,
      delta_vs_prior_14d_pct: kpis_delta_pct,
    },
    top_channels,
    top_contributors,
    engagement: {
      lurker_pct,
      active_posters: active_poster_ids.size,
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
    const { startup_id, question } = (await req.json()) as {
      startup_id: string;
      question: string;
    };
    if (!startup_id || !question) {
      throw new Error("startup_id and question are required");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const snapshot = await buildSnapshot(admin, startup_id);

    const systemPrompt = `You are KAI, a senior team operations and accountability analyst. You have a JSON snapshot of the workspace's Slack activity for the last 14 days vs the prior 14-day baseline, plus an attendance section (who checked in, who posted work updates, who was active but never checked in).

Rules:
- Only cite numbers that appear in the snapshot. Never invent data.
- For accountability questions ("who isn't showing up", "who skips updates"), use the attendance section: check-in rates, update rates, and today's active_but_no_checkin / active_but_no_update lists.
- "active_but_no_checkin" means the person was clearly working in Slack but never posted in the attendance channel — flag these as the real accountability gap, not as absences.
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

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const aiRes = await fetch(
      "https://api.lovable.app/ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-flash-1.5",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
          max_tokens: 1024,
          temperature: 0.3,
        }),
      }
    );

    if (aiRes.status === 429) {
      return new Response(
        JSON.stringify({ ok: false, error: "Rate limited — wait a moment and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (aiRes.status === 402) {
      return new Response(
        JSON.stringify({ ok: false, error: "AI credits exhausted — contact your admin." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`AI gateway error ${aiRes.status}: ${txt}`);
    }

    const aiJson = await aiRes.json();
    const answer =
      aiJson.choices?.[0]?.message?.content ?? "No answer returned.";

    return new Response(
      JSON.stringify({ ok: true, answer }),
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
