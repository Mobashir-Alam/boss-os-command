import { useQuery, useMutation } from "@tanstack/react-query";
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

      const totalMembers = ws?.member_count_total ?? (users?.length ?? 0);
      const activePosters = new Set(
        (stats ?? []).filter((r) => r.messages_sent > 0).map((r) => r.user_id_source)
      ).size;
      const lurker_pct = totalMembers
        ? Math.round(((totalMembers - activePosters) / totalMembers) * 100)
        : 0;

      return { leaderboard, lurker_pct, total_members: totalMembers, active_posters: activePosters };
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
