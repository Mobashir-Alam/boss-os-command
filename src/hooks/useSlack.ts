import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Raw row types ────────────────────────────────────────────

export interface SlackWorkspace {
  workspace_id: string;
  workspace_name: string | null;
  workspace_domain: string | null;
  team_icon_url: string | null;
  member_count_total: number | null;
  synced_at: string;
}

export interface SlackChannel {
  channel_id: string;
  channel_name: string | null;
  is_private: boolean;
  is_archived: boolean;
  member_count: number | null;
  topic: string | null;
  purpose: string | null;
}

export interface SlackChannelStat {
  channel_id: string;
  channel_name: string | null;
  stat_date: string;
  message_count: number;
  active_users: number;
  reactions_total: number;
  replies_total: number;
  files_shared: number;
  peak_hour: number | null;
}

export interface SlackUser {
  user_id_source: string;
  display_name: string | null;
  real_name: string | null;
  title: string | null;
  is_bot: boolean;
  is_admin: boolean;
  avatar_url: string | null;
}

export interface SlackUserStat {
  user_id_source: string;
  display_name: string | null;
  stat_date: string;
  messages_sent: number;
  reactions_given: number;
  replies_sent: number;
}

export interface SlackTopMessage {
  channel_name: string | null;
  message_ts: string;
  user_id_source: string | null;
  text: string | null;
  reaction_count: number;
  reply_count: number;
  message_date: string | null;
  raw_payload: Record<string, unknown>;
}

// ─── Derived types ────────────────────────────────────────────

export interface SlackKpi {
  label: string;
  key: string;
  value: number;
  baseline: number;
  delta_pct: number | null;
  series: { date: string; value: number }[];
}

export interface SlackPulseSnapshot {
  kpis: SlackKpi[];
  anomalies: { channel: string; metric: string; message: string }[];
}

export interface SlackChannelRow {
  channel_id: string;
  name: string;
  messages: number;
  active_users: number;
  reactions: number;
  replies: number;
  trend: "up" | "flat" | "down";
  last_active: string | null;
}

export interface SlackContributor {
  user_id: string;
  name: string;
  avatar_url: string | null;
  messages: number;
  reactions: number;
  replies: number;
}

export interface SlackHeatmapCell {
  day: number; // 0=Sun
  hour: number; // 0-23 UTC
  count: number;
}

// ─── Workspace ───────────────────────────────────────────────

export function useSlackWorkspace(startupId?: string) {
  return useQuery({
    queryKey: ["slack-workspace", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connector_slack_workspace")
        .select("workspace_id,workspace_name,workspace_domain,team_icon_url,member_count_total,synced_at")
        .eq("startup_id", startupId!)
        .maybeSingle();
      if (error) throw error;
      return data as SlackWorkspace | null;
    },
  });
}

// ─── Pulse (KPIs + anomalies) ────────────────────────────────

export function useSlackPulse(startupId?: string, baselineDays: 7 | 28 = 7) {
  return useQuery({
    queryKey: ["slack-pulse", startupId, baselineDays],
    enabled: !!startupId,
    queryFn: async () => {
      const today = new Date();
      const dateStr = (d: Date) => d.toISOString().slice(0, 10);
      const nAgo = (n: number) =>
        dateStr(new Date(today.getTime() - n * 864e5));

      const recentStart = nAgo(14);
      const recentEnd = dateStr(today);
      const baselineStart = nAgo(14 + baselineDays);
      const baselineEnd = nAgo(14);

      const [{ data: recent }, { data: baseline }] = await Promise.all([
        supabase
          .from("connector_data_slack_channel_stats")
          .select("channel_id,channel_name,stat_date,message_count,active_users,reactions_total,replies_total")
          .eq("startup_id", startupId!)
          .gte("stat_date", recentStart)
          .lte("stat_date", recentEnd),
        supabase
          .from("connector_data_slack_channel_stats")
          .select("channel_id,channel_name,stat_date,message_count,active_users,reactions_total,replies_total")
          .eq("startup_id", startupId!)
          .gte("stat_date", baselineStart)
          .lte("stat_date", baselineEnd),
      ]);

      // Daily aggregates for recent period (for sparklines)
      const dayMap = new Map<string, { messages: number; active_users: number; reactions: number; replies: number }>();
      for (const r of recent ?? []) {
        const prev = dayMap.get(r.stat_date) ?? { messages: 0, active_users: 0, reactions: 0, replies: 0 };
        dayMap.set(r.stat_date, {
          messages: prev.messages + r.message_count,
          active_users: prev.active_users + r.active_users,
          reactions: prev.reactions + r.reactions_total,
          replies: prev.replies + r.replies_total,
        });
      }
      const sorted = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b));

      const sumRecent = { messages: 0, active_users: 0, reactions: 0, replies: 0 };
      for (const [, v] of sorted) {
        sumRecent.messages += v.messages;
        sumRecent.active_users += v.active_users;
        sumRecent.reactions += v.reactions;
        sumRecent.replies += v.replies;
      }

      const sumBaseline = { messages: 0, active_users: 0, reactions: 0, replies: 0 };
      for (const r of baseline ?? []) {
        sumBaseline.messages += r.message_count;
        sumBaseline.active_users += r.active_users;
        sumBaseline.reactions += r.reactions_total;
        sumBaseline.replies += r.replies_total;
      }

      function pct(a: number, b: number) {
        if (!b) return null;
        return Math.round(((a - b) / b) * 100);
      }

      const kpis: SlackKpi[] = [
        {
          label: "Messages",
          key: "messages",
          value: sumRecent.messages,
          baseline: sumBaseline.messages,
          delta_pct: pct(sumRecent.messages, sumBaseline.messages),
          series: sorted.map(([date, v]) => ({ date, value: v.messages })),
        },
        {
          label: "Active Users",
          key: "active_users",
          value: sumRecent.active_users,
          baseline: sumBaseline.active_users,
          delta_pct: pct(sumRecent.active_users, sumBaseline.active_users),
          series: sorted.map(([date, v]) => ({ date, value: v.active_users })),
        },
        {
          label: "Reactions",
          key: "reactions",
          value: sumRecent.reactions,
          baseline: sumBaseline.reactions,
          delta_pct: pct(sumRecent.reactions, sumBaseline.reactions),
          series: sorted.map(([date, v]) => ({ date, value: v.reactions })),
        },
        {
          label: "Replies",
          key: "replies",
          value: sumRecent.replies,
          baseline: sumBaseline.replies,
          delta_pct: pct(sumRecent.replies, sumBaseline.replies),
          series: sorted.map(([date, v]) => ({ date, value: v.replies })),
        },
      ];

      // Simple anomaly detection: any channel whose last-7d avg > 2× its prior-7d avg
      const channelRecentMap = new Map<string, { name: string; messages: number[] }>();
      for (const r of (recent ?? []).slice(-7)) {
        const prev = channelRecentMap.get(r.channel_id) ?? { name: r.channel_name ?? r.channel_id, messages: [] };
        prev.messages.push(r.message_count);
        channelRecentMap.set(r.channel_id, prev);
      }
      const channelBaseMap = new Map<string, number[]>();
      for (const r of baseline ?? []) {
        const prev = channelBaseMap.get(r.channel_id) ?? [];
        prev.push(r.message_count);
        channelBaseMap.set(r.channel_id, prev);
      }

      const anomalies: { channel: string; metric: string; message: string }[] = [];
      for (const [cid, { name, messages }] of channelRecentMap) {
        const avgRecent = messages.reduce((s, v) => s + v, 0) / (messages.length || 1);
        const baseArr = channelBaseMap.get(cid) ?? [];
        const avgBase = baseArr.reduce((s, v) => s + v, 0) / (baseArr.length || 1);
        if (avgBase > 0 && avgRecent > avgBase * 2.5) {
          anomalies.push({ channel: name, metric: "messages", message: `Spike: ${Math.round(avgRecent)} msg/day vs ${Math.round(avgBase)} avg` });
        } else if (avgBase > 5 && avgRecent < avgBase * 0.2) {
          anomalies.push({ channel: name, metric: "messages", message: `Gone quiet: ${Math.round(avgRecent)} msg/day vs ${Math.round(avgBase)} avg` });
        }
      }

      return { kpis, anomalies } as SlackPulseSnapshot;
    },
  });
}

// ─── Channel breakdown ───────────────────────────────────────

export function useSlackChannelBreakdown(startupId?: string) {
  return useQuery({
    queryKey: ["slack-channel-breakdown", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const nAgo = (n: number) =>
        new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);

      const [{ data: recent }, { data: prior }] = await Promise.all([
        supabase
          .from("connector_data_slack_channel_stats")
          .select("channel_id,channel_name,stat_date,message_count,active_users,reactions_total,replies_total")
          .eq("startup_id", startupId!)
          .gte("stat_date", nAgo(14))
          .lte("stat_date", today),
        supabase
          .from("connector_data_slack_channel_stats")
          .select("channel_id,channel_name,stat_date,message_count")
          .eq("startup_id", startupId!)
          .gte("stat_date", nAgo(28))
          .lte("stat_date", nAgo(14)),
      ]);

      const recentMap = new Map<string, SlackChannelRow>();
      for (const r of recent ?? []) {
        const prev = recentMap.get(r.channel_id);
        if (!prev) {
          recentMap.set(r.channel_id, {
            channel_id: r.channel_id,
            name: r.channel_name ?? r.channel_id,
            messages: r.message_count,
            active_users: r.active_users,
            reactions: r.reactions_total,
            replies: r.replies_total,
            trend: "flat",
            last_active: r.stat_date,
          });
        } else {
          prev.messages += r.message_count;
          prev.active_users = Math.max(prev.active_users, r.active_users);
          prev.reactions += r.reactions_total;
          prev.replies += r.replies_total;
          if (r.stat_date > (prev.last_active ?? "")) prev.last_active = r.stat_date;
        }
      }

      const priorMap = new Map<string, number>();
      for (const r of prior ?? []) {
        priorMap.set(r.channel_id, (priorMap.get(r.channel_id) ?? 0) + r.message_count);
      }

      for (const row of recentMap.values()) {
        const p = priorMap.get(row.channel_id) ?? 0;
        if (!p) { row.trend = "flat"; continue; }
        const ratio = row.messages / p;
        row.trend = ratio > 1.2 ? "up" : ratio < 0.8 ? "down" : "flat";
      }

      return Array.from(recentMap.values()).sort((a, b) => b.messages - a.messages);
    },
  });
}

// ─── People (leaderboard + lurker ratio) ─────────────────────

export function useSlackPeople(startupId?: string) {
  return useQuery({
    queryKey: ["slack-people", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const nAgo = (n: number) =>
        new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

      const [{ data: stats }, { data: users }, { data: ws }] = await Promise.all([
        supabase
          .from("connector_data_slack_user_stats")
          .select("user_id_source,display_name,messages_sent,reactions_given,replies_sent")
          .eq("startup_id", startupId!)
          .gte("stat_date", nAgo(14)),
        supabase
          .from("connector_data_slack_users")
          .select("user_id_source,display_name,avatar_url,is_admin")
          .eq("startup_id", startupId!)
          .eq("is_bot", false),
        supabase
          .from("connector_slack_workspace")
          .select("member_count_total")
          .eq("startup_id", startupId!)
          .maybeSingle(),
      ]);

      const avatarMap = new Map<string, { avatar: string | null; name: string | null }>();
      for (const u of users ?? []) {
        avatarMap.set(u.user_id_source, { avatar: u.avatar_url, name: u.display_name });
      }

      const userAgg = new Map<string, SlackContributor>();
      for (const r of stats ?? []) {
        const prev = userAgg.get(r.user_id_source);
        const info = avatarMap.get(r.user_id_source);
        if (!prev) {
          userAgg.set(r.user_id_source, {
            user_id: r.user_id_source,
            name: r.display_name ?? info?.name ?? r.user_id_source,
            avatar_url: info?.avatar ?? null,
            messages: r.messages_sent,
            reactions: r.reactions_given,
            replies: r.replies_sent,
          });
        } else {
          prev.messages += r.messages_sent;
          prev.reactions += r.reactions_given;
          prev.replies += r.replies_sent;
        }
      }

      const leaderboard = Array.from(userAgg.values())
        .sort((a, b) => b.messages - a.messages)
        .slice(0, 15);

      // Full roster: every non-bot member, including zero-activity lurkers, so
      // any person can be opened in the profile popup.
      const roster: SlackContributor[] = (users ?? []).map((u) => {
        const agg = userAgg.get(u.user_id_source);
        return {
          user_id: u.user_id_source,
          name: u.display_name ?? u.user_id_source,
          avatar_url: u.avatar_url ?? null,
          messages: agg?.messages ?? 0,
          reactions: agg?.reactions ?? 0,
          replies: agg?.replies ?? 0,
        };
      }).sort((a, b) => b.messages - a.messages || a.name.localeCompare(b.name));

      const totalMembers = ws?.member_count_total ?? (users?.length ?? 0);
      const activePosters = new Set(
        (stats ?? []).filter((r) => r.messages_sent > 0).map((r) => r.user_id_source)
      ).size;
      const lurker_pct = totalMembers
        ? Math.round(((totalMembers - activePosters) / totalMembers) * 100)
        : 0;

      return { leaderboard, roster, lurker_pct, total_members: totalMembers, active_posters: activePosters };
    },
  });
}

// ─── Per-person profile (popup) ──────────────────────────────

export interface PersonMessage {
  channel_id: string;
  channel_name: string | null;
  message_ts: string;
  posted_at: string | null;
  text: string | null;
  reaction_count: number;
  reply_count: number;
  has_files: boolean;
  category: "attendance" | "work_update" | "other";
}

export interface PersonProfile {
  user_id: string;
  name: string;
  title: string | null;
  avatar_url: string | null;
  stats: {
    total_messages: number;
    checkin_days: number;
    work_days_seen: number;
    update_days: number;
  };
  attendance: PersonMessage[];
  work_updates: PersonMessage[];
  other: PersonMessage[];
  all: PersonMessage[];
}

export function usePersonProfile(
  startupId: string | undefined,
  userId: string | null,
  config: SlackMonitoringConfig | null | undefined
) {
  return useQuery({
    queryKey: ["slack-person-profile", startupId, userId],
    enabled: !!startupId && !!userId,
    queryFn: async (): Promise<PersonProfile> => {
      const nAgo = (n: number) =>
        new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

      const [{ data: msgs }, { data: att }, { data: roster }] = await Promise.all([
        supabase
          .from("connector_data_slack_messages")
          .select("channel_id,channel_name,message_ts,posted_at,text,reaction_count,reply_count,has_files")
          .eq("startup_id", startupId!)
          .eq("user_id_source", userId!)
          .order("posted_at", { ascending: false })
          .limit(1000),
        supabase
          .from("slack_daily_attendance")
          .select("work_date,checked_in,posted_update,was_active")
          .eq("startup_id", startupId!)
          .eq("user_id_source", userId!)
          .gte("work_date", nAgo(60)),
        supabase
          .from("connector_data_slack_users")
          .select("user_id_source,display_name,real_name,title,avatar_url")
          .eq("startup_id", startupId!)
          .eq("user_id_source", userId!)
          .maybeSingle(),
      ]);

      const suffix = config?.updates_channel_suffix ?? "work-update";
      const attChannelId = config?.attendance_channel_id ?? null;

      const categorize = (m: { channel_id: string; channel_name: string | null }): PersonMessage["category"] => {
        if (attChannelId && m.channel_id === attChannelId) return "attendance";
        if (m.channel_name?.endsWith(suffix)) return "work_update";
        return "other";
      };

      const all: PersonMessage[] = (msgs ?? []).map((m) => ({
        ...m,
        category: categorize(m),
      }));

      const attRows = att ?? [];
      return {
        user_id: userId!,
        name: roster?.display_name ?? roster?.real_name ?? userId!,
        title: roster?.title ?? null,
        avatar_url: roster?.avatar_url ?? null,
        stats: {
          total_messages: all.length,
          checkin_days: attRows.filter((r) => r.checked_in).length,
          work_days_seen: attRows.length,
          update_days: attRows.filter((r) => r.posted_update).length,
        },
        attendance: all.filter((m) => m.category === "attendance"),
        work_updates: all.filter((m) => m.category === "work_update"),
        other: all.filter((m) => m.category === "other"),
        all,
      };
    },
  });
}

// ─── Timing heatmap ──────────────────────────────────────────

export function useSlackTiming(startupId?: string) {
  return useQuery({
    queryKey: ["slack-timing", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const nAgo = (n: number) =>
        new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

      const { data } = await supabase
        .from("connector_data_slack_channel_stats")
        .select("stat_date,message_count,peak_hour")
        .eq("startup_id", startupId!)
        .gte("stat_date", nAgo(28))
        .not("peak_hour", "is", null);

      // Build hour × dow heatmap using peak_hour as proxy
      const heatmap: number[][] = Array.from({ length: 7 }, () =>
        new Array(24).fill(0)
      );
      const hourTotals = new Array(24).fill(0);

      for (const r of data ?? []) {
        if (r.peak_hour == null) continue;
        const dow = new Date(r.stat_date).getUTCDay();
        heatmap[dow][r.peak_hour] += r.message_count;
        hourTotals[r.peak_hour] += r.message_count;
      }

      const maxVal = Math.max(...heatmap.flat(), 1);
      const cells: SlackHeatmapCell[] = [];
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          cells.push({ day, hour, count: heatmap[day][hour] });
        }
      }

      const peak_hour = hourTotals.indexOf(Math.max(...hourTotals));
      const peak_dow = heatmap.map(row => row.reduce((s, v) => s + v, 0)).reduce((best, v, i, arr) => v > arr[best] ? i : best, 0);

      return { cells, maxVal, peak_hour, peak_dow };
    },
  });
}

// ─── Engagement (top messages + emoji stats) ─────────────────

export function useSlackEngagement(startupId?: string) {
  return useQuery({
    queryKey: ["slack-engagement", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const nAgo = (n: number) =>
        new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

      const { data: msgs } = await supabase
        .from("connector_data_slack")
        .select("channel_name,text,user_id_source,reaction_count,reply_count,message_date,raw_payload")
        .eq("startup_id", startupId!)
        .gte("message_date", nAgo(14))
        .order("reaction_count", { ascending: false })
        .limit(20);

      // Aggregate emoji counts from raw_payload.reactions
      const emojiMap = new Map<string, number>();
      for (const msg of msgs ?? []) {
        const reactions = (msg.raw_payload as Record<string, unknown>)?.reactions as
          | { name: string; count: number }[]
          | undefined;
        if (!reactions) continue;
        for (const rx of reactions) {
          emojiMap.set(rx.name, (emojiMap.get(rx.name) ?? 0) + rx.count);
        }
      }

      const top_emojis = Array.from(emojiMap.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      const top_messages = (msgs ?? []).slice(0, 10).map((m) => ({
        channel: m.channel_name ?? "unknown",
        text: m.text ?? "",
        reactions: m.reaction_count,
        replies: m.reply_count,
        date: m.message_date,
      }));

      // Thread engagement rate: % of messages with replies
      const total = msgs?.length ?? 0;
      const withReplies = msgs?.filter((m) => m.reply_count > 0).length ?? 0;
      const thread_rate = total ? Math.round((withReplies / total) * 100) : 0;

      return { top_messages, top_emojis, thread_rate };
    },
  });
}

// ─── Sync trigger ─────────────────────────────────────────────

export function useTriggerSlackSync() {
  return useMutation({
    mutationFn: async (startupId: string) => {
      const { data, error } = await supabase.functions.invoke("slack-sync", {
        body: { startup_id: startupId },
      });
      if (error) throw error;
      return data as {
        ok: boolean;
        workspace: string;
        channels_synced: number;
        users_synced: number;
        channel_stat_rows: number;
        user_stat_rows: number;
        top_msg_rows: number;
        message_rows: number;
        attendance_rows: number;
        attendance_enabled: boolean;
        self_report_rows: number;
        self_report_status: string;
        skipped: string[];
      };
    },
  });
}

// ─── KAI mutation ─────────────────────────────────────────────

export function useAskSlackKai() {
  return useMutation({
    mutationFn: async ({
      startupId,
      question,
    }: {
      startupId: string;
      question: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "slack-kai-ask",
        { body: { startup_id: startupId, question } }
      );
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Unknown error");
      return data.answer as string;
    },
  });
}

// ─── Accountability: config ──────────────────────────────────

export interface SlackMonitoringConfig {
  attendance_channel_id: string | null;
  attendance_channel_name: string | null;
  updates_channel_suffix: string;
  timezone: string;
  day_boundary_hour: number;
  update_backfill_cap_days: number;
  is_enabled: boolean;
}

export function useSlackConfig(startupId?: string) {
  return useQuery({
    queryKey: ["slack-config", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("slack_monitoring_config")
        .select("attendance_channel_id,attendance_channel_name,updates_channel_suffix,timezone,day_boundary_hour,update_backfill_cap_days,is_enabled")
        .eq("startup_id", startupId!)
        .maybeSingle();
      if (error) throw error;
      return data as SlackMonitoringConfig | null;
    },
  });
}

export function useSaveSlackConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      startupId,
      config,
    }: {
      startupId: string;
      config: SlackMonitoringConfig;
    }) => {
      const { error } = await supabase
        .from("slack_monitoring_config")
        .upsert(
          { startup_id: startupId, ...config, updated_at: new Date().toISOString() },
          { onConflict: "startup_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["slack-config", vars.startupId] });
    },
  });
}

// ─── Accountability: daily attendance ────────────────────────

export interface AttendanceRow {
  user_id_source: string;
  display_name: string | null;
  work_date: string;
  checked_in: boolean;
  check_in_time: string | null;
  check_in_source: "live" | "self_reported" | null;
  check_in_claim_text: string | null;
  posted_update: boolean;
  update_time: string | null;
  was_active: boolean;
  first_activity: string | null;
  last_activity: string | null;
  message_count: number;
}

export type CheckInSource = "live" | "self_reported" | null;

export type AttendanceStatus = "checked_in" | "active_no_checkin" | "absent";

export interface TodayPerson {
  user_id: string;
  name: string;
  avatar_url: string | null;
  status: AttendanceStatus;
  check_in_time: string | null;
  check_in_source: CheckInSource;
  check_in_claim_text: string | null;
  posted_update: boolean;
  message_count: number;
  first_activity: string | null;
  last_activity: string | null;
  days_since_update: number | null; // null = no update in lookback window
}

// Whole days between two YYYY-MM-DD strings (b - a).
function dateDiffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

export interface TodayBoard {
  work_date: string | null;
  people: TodayPerson[];
  checked_in: TodayPerson[];
  active_no_checkin: TodayPerson[];
  absent: TodayPerson[];
  no_update: TodayPerson[];
}

// Latest available work-day board. Joins the attendance rows for the most
// recent work_date with the full roster, so people with zero activity show
// as absent (they have no attendance row at all). `backfillCap` controls how
// stale a person's last update can be before they're flagged: a normal batch
// cadence within the cap won't trigger a "no update" nag.
export function useTodayBoard(startupId?: string, backfillCap = 3) {
  return useQuery({
    queryKey: ["slack-today-board", startupId, backfillCap],
    enabled: !!startupId,
    queryFn: async (): Promise<TodayBoard> => {
      const lookback = Math.max(backfillCap + 3, 5);
      const nAgo = (n: number) =>
        new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

      const [{ data: rows }, { data: roster }] = await Promise.all([
        supabase
          .from("slack_daily_attendance")
          .select("user_id_source,display_name,work_date,checked_in,check_in_time,check_in_source,check_in_claim_text,posted_update,update_time,was_active,first_activity,last_activity,message_count")
          .eq("startup_id", startupId!)
          .gte("work_date", nAgo(lookback))
          .order("work_date", { ascending: false }),
        supabase
          .from("connector_data_slack_users")
          .select("user_id_source,display_name,avatar_url")
          .eq("startup_id", startupId!)
          .eq("is_bot", false),
      ]);

      const allRows = (rows ?? []) as AttendanceRow[];
      if (allRows.length === 0) {
        return { work_date: null, people: [], checked_in: [], active_no_checkin: [], absent: [], no_update: [] };
      }
      const latest = allRows[0].work_date;
      const todayRows = allRows.filter((r) => r.work_date === latest);
      const rowByUser = new Map(todayRows.map((r) => [r.user_id_source, r]));

      // Most recent update date per user across the lookback window.
      const lastUpdateByUser = new Map<string, string>();
      for (const r of allRows) {
        if (!r.posted_update) continue;
        const prev = lastUpdateByUser.get(r.user_id_source);
        if (!prev || r.work_date > prev) lastUpdateByUser.set(r.user_id_source, r.work_date);
      }

      const people: TodayPerson[] = (roster ?? []).map((u) => {
        const r = rowByUser.get(u.user_id_source);
        const status: AttendanceStatus = r
          ? r.checked_in
            ? "checked_in"
            : "active_no_checkin"
          : "absent";
        const lastUpdate = lastUpdateByUser.get(u.user_id_source);
        const days_since_update = lastUpdate ? dateDiffDays(lastUpdate, latest) : null;
        return {
          user_id: u.user_id_source,
          name: r?.display_name ?? u.display_name ?? u.user_id_source,
          avatar_url: u.avatar_url,
          status,
          check_in_time: r?.check_in_time ?? null,
          check_in_source: r?.check_in_source ?? null,
          check_in_claim_text: r?.check_in_claim_text ?? null,
          posted_update: r?.posted_update ?? false,
          message_count: r?.message_count ?? 0,
          first_activity: r?.first_activity ?? null,
          last_activity: r?.last_activity ?? null,
          days_since_update,
        };
      });

      return {
        work_date: latest,
        people,
        checked_in: people.filter((p) => p.status === "checked_in"),
        active_no_checkin: people.filter((p) => p.status === "active_no_checkin"),
        absent: people.filter((p) => p.status === "absent"),
        // Flag only once a present person exceeds the batch cap (or never
        // updated in the window) — keeps normal catch-up cadence quiet.
        no_update: people.filter(
          (p) => p.status !== "absent" && (p.days_since_update === null || p.days_since_update > backfillCap)
        ),
      };
    },
  });
}

// ─── Accountability: monthly sheet ───────────────────────────

export type UpdateState = "posted" | "catchup" | "missing";

export interface MonthlyPersonRow {
  user_id: string;
  name: string;
  avatar_url: string | null;
  byDate: Record<string, { status: AttendanceStatus; posted_update: boolean; update_state: UpdateState; check_in_time: string | null; check_in_source: CheckInSource; check_in_claim_text: string | null }>;
  present_days: number;
  active_no_checkin_days: number;
  absent_days: number;
  update_days: number;      // literal: days an update was actually posted
  covered_days: number;     // posted + catch-up days
}

export interface MonthlySheet {
  dates: string[]; // YYYY-MM-DD across the month, ascending
  rows: MonthlyPersonRow[];
  month: string; // "2026-06"
}

export function useMonthlySheet(startupId?: string, month?: string, backfillCap = 3) {
  return useQuery({
    queryKey: ["slack-monthly-sheet", startupId, month, backfillCap],
    enabled: !!startupId && !!month,
    queryFn: async (): Promise<MonthlySheet> => {
      const [y, m] = month!.split("-").map(Number);
      const start = `${month}-01`;
      const lastDay = new Date(y, m, 0).getDate(); // day 0 of next month = last day
      const end = `${month}-${String(lastDay).padStart(2, "0")}`;
      // Extend the fetch a few days past month-end so a catch-up update posted
      // in early next month can still backfill the final days of this month.
      const [ey, em, ed] = end.split("-").map(Number);
      const endExt = new Date(Date.UTC(ey, em - 1, ed) + backfillCap * 86400000)
        .toISOString()
        .slice(0, 10);

      const [{ data: rows }, { data: roster }] = await Promise.all([
        supabase
          .from("slack_daily_attendance")
          .select("user_id_source,display_name,work_date,checked_in,posted_update,was_active,check_in_time,check_in_source,check_in_claim_text")
          .eq("startup_id", startupId!)
          .gte("work_date", start)
          .lte("work_date", endExt),
        supabase
          .from("connector_data_slack_users")
          .select("user_id_source,display_name,avatar_url")
          .eq("startup_id", startupId!)
          .eq("is_bot", false),
      ]);

      const dates: string[] = [];
      for (let d = 1; d <= lastDay; d++) {
        dates.push(`${month}-${String(d).padStart(2, "0")}`);
      }

      const allRows = (rows ?? []) as AttendanceRow[];
      const rowMap = new Map<string, AttendanceRow>();
      // Per-user sorted list of dates an update was actually posted (incl. the
      // few days past month-end), used to backfill earlier gap days.
      const updateDatesByUser = new Map<string, string[]>();
      for (const r of allRows) {
        rowMap.set(`${r.user_id_source}:${r.work_date}`, r);
        if (r.posted_update) {
          const arr = updateDatesByUser.get(r.user_id_source) ?? [];
          arr.push(r.work_date);
          updateDatesByUser.set(r.user_id_source, arr);
        }
      }
      for (const arr of updateDatesByUser.values()) arr.sort();

      const sheetRows: MonthlyPersonRow[] = (roster ?? []).map((u) => {
        const byDate: MonthlyPersonRow["byDate"] = {};
        const updateDates = updateDatesByUser.get(u.user_id_source) ?? [];
        let present = 0, activeNo = 0, absent = 0, updates = 0, covered = 0;
        for (const date of dates) {
          const r = rowMap.get(`${u.user_id_source}:${date}`);
          if (!r) continue; // no data for that day → leave blank (weekend/off)
          const status: AttendanceStatus = r.checked_in
            ? "checked_in"
            : r.was_active
            ? "active_no_checkin"
            : "absent";

          // Update state: posted same-day, else credited as catch-up if a later
          // update lands within the cap, else missing. cap 0 = strict.
          let update_state: UpdateState;
          if (r.posted_update) {
            update_state = "posted";
            updates++;
            covered++;
          } else if (
            backfillCap > 0 &&
            updateDates.some((ud) => ud > date && dateDiffDays(date, ud) <= backfillCap)
          ) {
            update_state = "catchup";
            covered++;
          } else {
            update_state = "missing";
          }

          byDate[date] = {
            status,
            posted_update: r.posted_update,
            update_state,
            check_in_time: r.check_in_time,
            check_in_source: r.check_in_source ?? null,
            check_in_claim_text: r.check_in_claim_text ?? null,
          };
          if (status === "checked_in") present++;
          else if (status === "active_no_checkin") activeNo++;
          else absent++;
        }
        return {
          user_id: u.user_id_source,
          name: u.display_name ?? u.user_id_source,
          avatar_url: u.avatar_url,
          byDate,
          present_days: present,
          active_no_checkin_days: activeNo,
          absent_days: absent,
          update_days: updates,
          covered_days: covered,
        };
      });

      // Sort: most-present first, then by name
      sheetRows.sort((a, b) => b.present_days - a.present_days || a.name.localeCompare(b.name));

      return { dates, rows: sheetRows, month: month! };
    },
  });
}

// ─── Accountability: live presence ───────────────────────────

export function useSlackPresence() {
  return useMutation({
    mutationFn: async (startupId: string) => {
      const { data, error } = await supabase.functions.invoke("slack-presence", {
        body: { startup_id: startupId },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Presence check failed");
      return data as {
        ok: boolean;
        presence: Record<string, string>;
        active_count: number;
        checked_at: string;
      };
    },
  });
}
