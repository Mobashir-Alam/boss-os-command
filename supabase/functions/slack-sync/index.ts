// Slack analytics sync
//
// Reads SLACK_BOT_TOKEN from Supabase Edge Function secrets.
// Body: { startup_id: string }
//
// Steps:
//   1. Fetch workspace info (team.info)
//   2. Fetch user roster (users.list)
//   3. Fetch all channels the bot is a member of (conversations.list)
//   4. For each channel, fetch last 30 days of message history
//      and aggregate daily stats on the fly (no full corpus stored)
//   5. Upsert top messages per channel into connector_data_slack
//   6. Upsert all aggregates into analytics tables

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SLACK_API = "https://slack.com/api";
const HISTORY_DAYS = 30;
const MAX_CHANNELS = 60;
const TOP_MESSAGES_PER_CHANNEL = 5;

// ─── Slack API helpers ────────────────────────────────────────

async function slackGet(
  method: string,
  token: string,
  params: Record<string, string> = {}
): Promise<Record<string, unknown>> {
  const url = new URL(`${SLACK_API}/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!data.ok) {
    const err = (data.error as string) ?? "unknown_error";
    // channel_not_found / not_in_channel: bot was removed, skip silently
    if (err === "channel_not_found" || err === "not_in_channel") {
      return { ok: false, _skippable: true, error: err };
    }
    throw new Error(`Slack ${method}: ${err}`);
  }
  return data;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function tsToDate(ts: string): string {
  return new Date(parseFloat(ts) * 1000).toISOString().slice(0, 10);
}

function tsToHour(ts: string): number {
  return new Date(parseFloat(ts) * 1000).getUTCHours();
}

function oldestTs(): string {
  return String((Date.now() / 1000 - HISTORY_DAYS * 86400).toFixed(6));
}

// ─── Types ───────────────────────────────────────────────────

interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  is_bot: boolean;
  is_admin?: boolean;
  profile?: { display_name?: string; title?: string; image_48?: string };
  deleted?: boolean;
}

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_archived: boolean;
  num_members?: number;
  topic?: { value?: string };
  purpose?: { value?: string };
  created?: number;
}

interface SlackReaction {
  name: string;
  count: number;
  users: string[];
}

interface SlackMessage {
  type: string;
  subtype?: string;
  ts: string;
  user?: string;
  text?: string;
  thread_ts?: string;
  reply_count?: number;
  reactions?: SlackReaction[];
  files?: unknown[];
}

interface DayChannelStat {
  message_count: number;
  active_user_ids: Set<string>;
  reactions_total: number;
  replies_total: number;
  files_shared: number;
  hour_counts: number[];
}

interface DayUserStat {
  display_name: string;
  messages_sent: number;
  reactions_given: number;
  replies_sent: number;
}

// ─── Sync helpers ────────────────────────────────────────────

async function fetchAllPages<T>(
  method: string,
  token: string,
  params: Record<string, string>,
  key: string
): Promise<T[]> {
  const results: T[] = [];
  let cursor = "";
  do {
    const p = cursor ? { ...params, cursor } : params;
    const data = await slackGet(method, token, p);
    const items = (data[key] as T[]) ?? [];
    results.push(...items);
    const meta = data.response_metadata as
      | { next_cursor?: string }
      | undefined;
    cursor = meta?.next_cursor ?? "";
    if (cursor) await sleep(800);
  } while (cursor);
  return results;
}

async function syncChannel(
  token: string,
  channel: SlackChannel,
  startupId: string,
  userMap: Map<string, string>,
  admin: ReturnType<typeof createClient>
): Promise<{ channel_stat_rows: number; user_stat_rows: number; top_msg_rows: number }> {
  // key: date → channel daily stats
  const channelStats = new Map<string, DayChannelStat>();
  // key: date:userId → user daily stats
  const userStats = new Map<string, DayUserStat>();
  // top messages by combined engagement (reactions + replies), so the tab
  // stays useful even in channels where the team rarely reacts.
  const topMessages: { msg: SlackMessage; score: number }[] = [];

  const oldest = oldestTs();
  let cursor = "";

  do {
    const params: Record<string, string> = {
      channel: channel.id,
      oldest,
      limit: "200",
    };
    if (cursor) params.cursor = cursor;

    const data = await slackGet("conversations.history", token, params);
    if ((data as Record<string, unknown>)._skippable) break;

    const messages = (data.messages as SlackMessage[]) ?? [];

    for (const msg of messages) {
      if (msg.type !== "message" || msg.subtype) continue;
      if (!msg.user) continue;

      const date = tsToDate(msg.ts);
      const hour = tsToHour(msg.ts);

      // — channel day stat —
      if (!channelStats.has(date)) {
        channelStats.set(date, {
          message_count: 0,
          active_user_ids: new Set(),
          reactions_total: 0,
          replies_total: 0,
          files_shared: 0,
          hour_counts: new Array(24).fill(0),
        });
      }
      const cs = channelStats.get(date)!;
      cs.message_count++;
      cs.active_user_ids.add(msg.user);
      cs.hour_counts[hour]++;
      cs.replies_total += msg.reply_count ?? 0;
      if (msg.files?.length) cs.files_shared++;

      const totalRx = msg.reactions?.reduce((s, r) => s + r.count, 0) ?? 0;
      cs.reactions_total += totalRx;

      // — user day stat —
      const uKey = `${date}:${msg.user}`;
      if (!userStats.has(uKey)) {
        userStats.set(uKey, {
          display_name: userMap.get(msg.user) ?? msg.user,
          messages_sent: 0,
          reactions_given: 0,
          replies_sent: msg.thread_ts && msg.thread_ts !== msg.ts ? 1 : 0,
        });
      }
      const us = userStats.get(uKey)!;
      us.messages_sent++;
      if (msg.thread_ts && msg.thread_ts !== msg.ts) us.replies_sent++;

      // track reactions given per user
      if (msg.reactions) {
        for (const rx of msg.reactions) {
          for (const uid of rx.users) {
            const rxKey = `${date}:${uid}`;
            if (!userStats.has(rxKey)) {
              userStats.set(rxKey, {
                display_name: userMap.get(uid) ?? uid,
                messages_sent: 0,
                reactions_given: 0,
                replies_sent: 0,
              });
            }
            userStats.get(rxKey)!.reactions_given++;
          }
        }
      }

      // track top messages by combined engagement score
      const score = totalRx + (msg.reply_count ?? 0);
      if (score > 0) {
        topMessages.push({ msg, score });
      }
    }

    const meta = data.response_metadata as { next_cursor?: string } | undefined;
    cursor = meta?.next_cursor ?? "";
    if (cursor) await sleep(1000);
  } while (cursor);

  // — upsert channel stats —
  const channelStatRows = Array.from(channelStats.entries()).map(
    ([date, cs]) => ({
      startup_id: startupId,
      channel_id: channel.id,
      channel_name: channel.name,
      stat_date: date,
      message_count: cs.message_count,
      active_users: cs.active_user_ids.size,
      reactions_total: cs.reactions_total,
      replies_total: cs.replies_total,
      files_shared: cs.files_shared,
      peak_hour: cs.hour_counts.indexOf(Math.max(...cs.hour_counts)),
    })
  );

  let channel_stat_rows = 0;
  if (channelStatRows.length > 0) {
    const { error, count } = await admin
      .from("connector_data_slack_channel_stats")
      .upsert(channelStatRows, {
        onConflict: "startup_id,channel_id,stat_date",
        count: "exact",
      });
    if (error) throw error;
    channel_stat_rows = count ?? 0;
  }

  // — upsert user stats —
  const userStatRows = Array.from(userStats.entries()).map(([key, us]) => {
    const [date, userId] = key.split(":");
    return {
      startup_id: startupId,
      user_id_source: userId,
      display_name: us.display_name,
      stat_date: date,
      messages_sent: us.messages_sent,
      reactions_given: us.reactions_given,
      replies_sent: us.replies_sent,
    };
  });

  let user_stat_rows = 0;
  if (userStatRows.length > 0) {
    const { error, count } = await admin
      .from("connector_data_slack_user_stats")
      .upsert(userStatRows, {
        onConflict: "startup_id,user_id_source,stat_date",
        count: "exact",
      });
    if (error) throw error;
    user_stat_rows = count ?? 0;
  }

  // — upsert top messages —
  const top = topMessages
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_MESSAGES_PER_CHANNEL);

  let top_msg_rows = 0;
  if (top.length > 0) {
    const msgRows = top.map(({ msg }) => ({
      startup_id: startupId,
      channel_id: channel.id,
      channel_name: channel.name,
      message_ts: msg.ts,
      user_id_source: msg.user ?? null,
      text: (msg.text ?? "").slice(0, 2000),
      thread_ts: msg.thread_ts ?? null,
      reaction_count: msg.reactions?.reduce((s, r) => s + r.count, 0) ?? 0,
      reply_count: msg.reply_count ?? 0,
      has_files: !!msg.files?.length,
      message_date: tsToDate(msg.ts),
      raw_payload: {
        reactions: msg.reactions?.map((r) => ({
          name: r.name,
          count: r.count,
        })),
      },
    }));
    const { error, count } = await admin
      .from("connector_data_slack")
      .upsert(msgRows, {
        onConflict: "startup_id,channel_id,message_ts",
        count: "exact",
      });
    if (error) throw error;
    top_msg_rows = count ?? 0;
  }

  return { channel_stat_rows, user_stat_rows, top_msg_rows };
}

// ─── Main handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("SLACK_BOT_TOKEN");
    if (!token) throw new Error("SLACK_BOT_TOKEN secret not set");

    const { startup_id } = (await req.json()) as { startup_id: string };
    if (!startup_id) throw new Error("startup_id required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Workspace info
    const teamData = await slackGet("team.info", token);
    const team = teamData.team as Record<string, unknown>;
    const { error: wsErr } = await admin.from("connector_slack_workspace").upsert(
      {
        startup_id,
        workspace_id: team.id as string,
        workspace_name: team.name as string,
        workspace_domain: team.domain as string,
        team_icon_url:
          (team.icon as Record<string, string> | undefined)?.image_68 ?? null,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "startup_id" }
    );
    // If the workspace table write fails, the schema isn't deployed — fail loud
    // rather than returning a misleading "complete" with zero rows.
    if (wsErr) throw new Error(`DB write failed (is the migration applied?): ${wsErr.message}`);

    // 2. User roster
    const rawUsers = await fetchAllPages<SlackUser>(
      "users.list",
      token,
      { limit: "200" },
      "members"
    );
    const humanUsers = rawUsers.filter((u) => !u.deleted && !u.is_bot);
    const userMap = new Map<string, string>();
    for (const u of humanUsers) {
      const dn =
        u.profile?.display_name || u.real_name || u.name || u.id;
      userMap.set(u.id, dn);
    }

    await admin.from("connector_slack_workspace").upsert(
      { startup_id, member_count_total: humanUsers.length, synced_at: new Date().toISOString() },
      { onConflict: "startup_id" }
    );

    const userRows = humanUsers.map((u) => ({
      startup_id,
      user_id_source: u.id,
      display_name:
        u.profile?.display_name || u.real_name || u.name || u.id,
      real_name: u.real_name ?? null,
      title: u.profile?.title ?? null,
      is_bot: false,
      is_admin: u.is_admin ?? false,
      avatar_url: u.profile?.image_48 ?? null,
    }));
    if (userRows.length > 0) {
      await admin
        .from("connector_data_slack_users")
        .upsert(userRows, { onConflict: "startup_id,user_id_source" });
    }

    // 3. Channels
    const rawChannels = await fetchAllPages<SlackChannel>(
      "conversations.list",
      token,
      { types: "public_channel,private_channel", limit: "200", exclude_archived: "false" },
      "channels"
    );
    // Only process channels bot is a member of and not archived (unless explicitly needed)
    const channels = rawChannels
      .filter((c) => !c.is_archived)
      .slice(0, MAX_CHANNELS);

    const channelRows = rawChannels.map((c) => ({
      startup_id,
      channel_id: c.id,
      channel_name: c.name,
      is_private: c.is_private,
      is_archived: c.is_archived,
      member_count: c.num_members ?? null,
      topic: c.topic?.value ?? null,
      purpose: c.purpose?.value ?? null,
      created_at_source: c.created
        ? new Date(c.created * 1000).toISOString()
        : null,
    }));
    if (channelRows.length > 0) {
      await admin
        .from("connector_data_slack_channels")
        .upsert(channelRows, { onConflict: "startup_id,channel_id" });
    }

    // 4. Per-channel history sync
    let total_channel_stat_rows = 0;
    let total_user_stat_rows = 0;
    let total_top_msg_rows = 0;
    const skipped: string[] = [];

    for (const channel of channels) {
      try {
        await sleep(500); // 500ms between channels → ~120 req/min, safe for Tier 3
        const result = await syncChannel(
          token,
          channel,
          startup_id,
          userMap,
          admin
        );
        total_channel_stat_rows += result.channel_stat_rows;
        total_user_stat_rows += result.user_stat_rows;
        total_top_msg_rows += result.top_msg_rows;
      } catch (err) {
        skipped.push(`${channel.name}: ${(err as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        workspace: team.name,
        channels_synced: channels.length,
        users_synced: userRows.length,
        channel_stat_rows: total_channel_stat_rows,
        user_stat_rows: total_user_stat_rows,
        top_msg_rows: total_top_msg_rows,
        skipped,
      }),
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
