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
const HISTORY_DAYS = 60;
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

// Local wall-clock parts (year/month/day/hour) for an IANA timezone.
function localParts(ms: number, timeZone: string): { y: number; m: number; d: number; h: number } {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return {
    y: parseInt(get("year"), 10),
    m: parseInt(get("month"), 10),
    d: parseInt(get("day"), 10),
    // "24" can appear at midnight in some impls — normalize to 0
    h: parseInt(get("hour"), 10) % 24,
  };
}

// The local "work-day" a timestamp belongs to, after shifting by a boundary
// hour so night shifts don't split at midnight. With boundary=6, any activity
// before 6am local rolls into the previous calendar day's work-day.
function localWorkDate(tsSeconds: number, timeZone: string, boundaryHour: number): string {
  const ms = tsSeconds * 1000;
  const { y, m, d, h } = localParts(ms, timeZone);
  // Build a UTC date from the local Y-M-D, then subtract a day if before boundary.
  let base = Date.UTC(y, m - 1, d);
  if (h < boundaryHour) base -= 86400000;
  return new Date(base).toISOString().slice(0, 10);
}

// Offset (ms) of an IANA timezone from UTC at a given instant.
function tzOffsetMs(atMs: number, timeZone: string): number {
  const { y, m, d, h } = localParts(atMs, timeZone);
  const min = Number(
    new Intl.DateTimeFormat("en-US", { timeZone, minute: "2-digit" }).format(new Date(atMs))
  );
  const asUtc = Date.UTC(y, m - 1, d, h, isNaN(min) ? 0 : min);
  return asUtc - atMs;
}

// Convert a local wall-clock date+time in a timezone to a UTC epoch (ms).
function localToUtcMs(date: string, time: string, timeZone: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h || 0, mi || 0);
  return guess - tzOffsetMs(guess, timeZone);
}

interface MonitoringConfig {
  attendance_channel_id: string | null;
  updates_channel_suffix: string;
  timezone: string;
  day_boundary_hour: number;
  is_enabled: boolean;
}

interface AttendanceAcc {
  user_id: string;
  display_name: string;
  work_date: string;
  check_in_ms: number | null;   // earliest msg in attendance channel (live)
  update_ms: number | null;     // earliest msg in a *-work-update channel
  first_ms: number | null;      // earliest activity anywhere
  last_ms: number | null;       // latest activity anywhere
  message_count: number;
  // Self-reported (bulk) attendance — filled by the AI parse pass.
  self_reported: boolean;
  claim_start_ms: number | null;
  claim_text: string | null;
  claim_at_ms: number | null;
}

// One raw attendance-channel message, kept for the AI parse pass.
interface AttendanceMsg {
  user: string;
  display_name: string;
  ts: number;       // seconds
  text: string;
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
  admin: ReturnType<typeof createClient>,
  config: MonitoringConfig | null,
  attendance: Map<string, AttendanceAcc>,
  attendanceMessages: AttendanceMsg[]
): Promise<{ channel_stat_rows: number; user_stat_rows: number; top_msg_rows: number }> {
  // Role of this channel for attendance purposes
  const isAttendanceChannel =
    !!config?.attendance_channel_id && channel.id === config.attendance_channel_id;
  const isUpdatesChannel =
    !!config &&
    !!channel.name &&
    channel.name.endsWith(config.updates_channel_suffix);
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

      // — attendance accumulation (across all channels, local work-day) —
      if (config?.is_enabled) {
        const tsSec = parseFloat(msg.ts);
        const msgMs = tsSec * 1000;
        const workDate = localWorkDate(tsSec, config.timezone, config.day_boundary_hour);
        const aKey = `${workDate}:${msg.user}`;
        let acc = attendance.get(aKey);
        if (!acc) {
          acc = {
            user_id: msg.user,
            display_name: userMap.get(msg.user) ?? msg.user,
            work_date: workDate,
            check_in_ms: null,
            update_ms: null,
            first_ms: msgMs,
            last_ms: msgMs,
            message_count: 0,
            self_reported: false,
            claim_start_ms: null,
            claim_text: null,
            claim_at_ms: null,
          };
          attendance.set(aKey, acc);
        }
        acc.message_count++;
        if (acc.first_ms === null || msgMs < acc.first_ms) acc.first_ms = msgMs;
        if (acc.last_ms === null || msgMs > acc.last_ms) acc.last_ms = msgMs;
        if (isAttendanceChannel) {
          if (acc.check_in_ms === null || msgMs < acc.check_in_ms) acc.check_in_ms = msgMs;
          // Keep the raw message for the bulk-attendance AI parse pass.
          attendanceMessages.push({
            user: msg.user,
            display_name: userMap.get(msg.user) ?? msg.user,
            ts: tsSec,
            text: (msg.text ?? "").slice(0, 400),
          });
        }
        if (isUpdatesChannel && (acc.update_ms === null || msgMs < acc.update_ms)) {
          acc.update_ms = msgMs;
        }
      }

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

// ─── Bulk-attendance AI parse ────────────────────────────────
//
// Sends attendance-channel messages to the Lovable AI gateway and asks it to
// resolve any claimed work-days to absolute dates (anchored to each message's
// posted date + the configured timezone). Returns one entry per message with
// the claimed dates and optional shift start/end times. Free-form input like
// "8th 8-5pm, 9th 7pm-5am" resolves to explicit dates. On any failure it
// returns null so the sync proceeds without self-report data.

interface ParsedClaim {
  date: string;          // YYYY-MM-DD
  start: string | null;  // HH:MM local
  end: string | null;    // HH:MM local
}

function stripJsonFence(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

// Robustly pull an array out of an LLM response that may be fenced, wrapped in
// an object, or padded with prose.
function extractArray(content: string): unknown[] | null {
  const cleaned = stripJsonFence(content);
  const tryParse = (s: string): unknown[] | null => {
    try {
      const v = JSON.parse(s);
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object") {
        for (const k of ["results", "messages", "claims", "data", "items"]) {
          if (Array.isArray((v as Record<string, unknown>)[k])) {
            return (v as Record<string, unknown[]>)[k];
          }
        }
      }
    } catch (_e) { /* fall through */ }
    return null;
  };
  return tryParse(cleaned) ?? (cleaned.match(/\[[\s\S]*\]/) ? tryParse(cleaned.match(/\[[\s\S]*\]/)![0]) : null);
}

async function parseBulkAttendance(
  messages: AttendanceMsg[],
  timeZone: string,
  apiKey: string
): Promise<{ claims: Map<number, ParsedClaim[]> | null; raw: string; sent: number }> {
  if (messages.length === 0) return { claims: new Map(), raw: "", sent: 0 };

  // Cap + shape the payload the model sees.
  const capped = messages.slice(-100);
  const payload = capped.map((m, i) => ({
    i,
    posted_date: new Date(m.ts * 1000).toISOString().slice(0, 10),
    text: m.text,
  }));

  const systemPrompt = `You parse Slack #attendance messages. Each message's author is reporting which day(s) they worked, sometimes with shift times. Resolve every day reference to an absolute calendar date using that message's "posted_date" as the anchor, in timezone ${timeZone}. Always resolve to the most recent past-or-equal date — never a future date. Day numbers like "8th", "11 th", "12 th" refer to days of the current/most-recent month relative to posted_date.

Return ONLY a JSON array, no prose, no markdown fences. Shape:
[{"i": <message index>, "claims": [{"date": "YYYY-MM-DD", "start": "HH:MM" | null, "end": "HH:MM" | null}]}]

Rules:
- Use 24-hour HH:MM for start/end. "8 to 5 pm" → start 08:00, end 17:00. "7 pm to 5 am" → start 19:00, end 05:00. "12 am to 8 am" → start 00:00, end 08:00.
- Only include dates where the author states they worked / were present. Ignore messages announcing FUTURE leave or absence (return "claims": []).
- A plain greeting with no day reference → claims for posted_date only.
- Never invent dates that aren't implied by the text.`;

  let raw = "";
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });
    if (!res.ok) {
      raw = `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`;
      console.error("parseBulkAttendance gateway error:", raw);
      return { claims: null, raw, sent: capped.length };
    }
    const data = await res.json();
    raw = data.choices?.[0]?.message?.content ?? "";
    const arr = extractArray(raw);
    if (!arr) {
      console.error("parseBulkAttendance: could not extract array from:", raw.slice(0, 500));
      return { claims: null, raw, sent: capped.length };
    }

    const out = new Map<number, ParsedClaim[]>();
    arr.forEach((row, idx) => {
      const r = row as { i?: number; claims?: ParsedClaim[] };
      const i = typeof r.i === "number" ? r.i : idx; // fall back to position
      if (Array.isArray(r.claims)) out.set(i, r.claims);
    });
    return { claims: out, raw, sent: capped.length };
  } catch (err) {
    console.error("parseBulkAttendance threw:", (err as Error).message, "raw:", raw.slice(0, 300));
    return { claims: null, raw: raw || (err as Error).message, sent: capped.length };
  }
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

    // 0. Monitoring config (drives attendance computation). Absent = analytics only.
    const { data: cfgRow } = await admin
      .from("slack_monitoring_config")
      .select("attendance_channel_id,updates_channel_suffix,timezone,day_boundary_hour,is_enabled")
      .eq("startup_id", startup_id)
      .maybeSingle();
    const config = (cfgRow as MonitoringConfig | null) ?? null;
    const attendance = new Map<string, AttendanceAcc>();
    const attendanceMessages: AttendanceMsg[] = [];

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
          admin,
          config,
          attendance,
          attendanceMessages
        );
        total_channel_stat_rows += result.channel_stat_rows;
        total_user_stat_rows += result.user_stat_rows;
        total_top_msg_rows += result.top_msg_rows;
      } catch (err) {
        skipped.push(`${channel.name}: ${(err as Error).message}`);
      }
    }

    // 4b. Bulk-attendance parse: resolve claimed days from attendance messages
    //     and merge as self-reported check-ins (live check-ins always win).
    let self_report_rows = 0;
    let self_report_status = "skipped";
    let self_report_debug: Record<string, unknown> = {
      attendance_messages_seen: attendanceMessages.length,
      has_lovable_key: !!Deno.env.get("LOVABLE_API_KEY"),
      attendance_channel_configured: !!config?.attendance_channel_id,
    };
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (config?.is_enabled && config.attendance_channel_id && lovableKey && attendanceMessages.length > 0) {
      const parseRes = await parseBulkAttendance(attendanceMessages, config.timezone, lovableKey);
      const claimsByMsg = parseRes.claims;
      self_report_debug = {
        ...self_report_debug,
        ai_messages_sent: parseRes.sent,
        ai_raw_snippet: parseRes.raw.slice(0, 600),
        ai_parsed_messages: claimsByMsg?.size ?? -1,
      };
      if (claimsByMsg === null) {
        self_report_status = "parse_failed";
      } else {
        self_report_status = "ok";
        const nowMs = Date.now();
        for (const [i, claims] of claimsByMsg) {
          const src = attendanceMessages[i];
          if (!src) continue;
          const claimAtMs = src.ts * 1000;
          for (const claim of claims) {
            // Sanity: a real, non-future date within the sync window.
            if (!/^\d{4}-\d{2}-\d{2}$/.test(claim.date)) continue;
            const claimDateMs = Date.parse(`${claim.date}T00:00:00Z`);
            if (isNaN(claimDateMs) || claimDateMs > nowMs + 86400000) continue;

            const key = `${claim.date}:${src.user}`;
            const existing = attendance.get(key);
            // A live check-in for that day always wins — never downgrade it.
            if (existing && existing.check_in_ms !== null) continue;

            const startMs = claim.start ? localToUtcMs(claim.date, claim.start, config.timezone) : null;
            if (existing) {
              existing.self_reported = true;
              existing.claim_start_ms = startMs;
              existing.claim_text = src.text;
              existing.claim_at_ms = claimAtMs;
            } else {
              attendance.set(key, {
                user_id: src.user,
                display_name: src.display_name,
                work_date: claim.date,
                check_in_ms: null,
                update_ms: null,
                first_ms: null,
                last_ms: null,
                message_count: 0,
                self_reported: true,
                claim_start_ms: startMs,
                claim_text: src.text,
                claim_at_ms: claimAtMs,
              });
            }
            self_report_rows++;
          }
        }
      }
    }

    // 5. Write attendance rows (only if monitoring is configured + enabled)
    let attendance_rows = 0;
    if (config?.is_enabled && attendance.size > 0) {
      const rows = Array.from(attendance.values()).map((a) => {
        const live = a.check_in_ms !== null;
        const checkedIn = live || a.self_reported;
        const checkInMs = live ? a.check_in_ms : a.self_reported ? a.claim_start_ms : null;
        return {
          startup_id,
          user_id_source: a.user_id,
          display_name: a.display_name,
          work_date: a.work_date,
          checked_in: checkedIn,
          check_in_time: checkInMs !== null ? new Date(checkInMs).toISOString() : null,
          check_in_source: checkedIn ? (live ? "live" : "self_reported") : null,
          check_in_claim_text: !live && a.self_reported ? a.claim_text : null,
          check_in_claim_at: !live && a.self_reported && a.claim_at_ms ? new Date(a.claim_at_ms).toISOString() : null,
          posted_update: a.update_ms !== null,
          update_time: a.update_ms !== null ? new Date(a.update_ms).toISOString() : null,
          was_active: a.message_count > 0,
          first_activity: a.first_ms !== null ? new Date(a.first_ms).toISOString() : null,
          last_activity: a.last_ms !== null ? new Date(a.last_ms).toISOString() : null,
          message_count: a.message_count,
        };
      });
      // Chunked upsert to stay well under payload limits on busy workspaces.
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error, count } = await admin
          .from("slack_daily_attendance")
          .upsert(chunk, {
            onConflict: "startup_id,user_id_source,work_date",
            count: "exact",
          });
        if (error) throw error;
        attendance_rows += count ?? chunk.length;
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
        attendance_rows,
        attendance_enabled: !!config?.is_enabled,
        self_report_rows,
        self_report_status,
        self_report_debug,
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
