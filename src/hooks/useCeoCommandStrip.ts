import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CommandTile {
  value: number;
  deltaPct: number | null; // vs prior 7 days; null when no baseline
  spark: number[];         // last 7 days, oldest → newest
}

export interface CommandStripData {
  youtubeViews7d: CommandTile;
  slackAttendanceTodayPct: { value: number | null; checkedIn: number; roster: number; spark: number[] };
  githubCommits7d: CommandTile;
  activeEmployees7d: { value: number };
}

const dstr = (d: Date) => d.toISOString().slice(0, 10);
const nAgo = (n: number) => dstr(new Date(Date.now() - n * 864e5));

function pct(cur: number, base: number): number | null {
  if (!base) return cur > 0 ? 100 : null;
  return Math.round(((cur - base) / base) * 100);
}

// Same work-day roll-over logic as the Slack Today board: before the boundary
// hour, "today" is still the previous calendar day.
function currentWorkDate(timeZone = "Asia/Kolkata", boundaryHour = 6): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  let base = Date.UTC(get("year"), get("month") - 1, get("day"));
  if (get("hour") < boundaryHour) base -= 86400000;
  return new Date(base).toISOString().slice(0, 10);
}

// Live numbers for the four Command Strip tiles. Parallel Supabase queries,
// all scoped to the startup.
export function useCeoCommandStrip(startupId: string | undefined) {
  return useQuery({
    queryKey: ["ceo-command-strip", startupId],
    enabled: !!startupId,
    queryFn: async (): Promise<CommandStripData> => {
      const since7 = nAgo(7);
      const since14 = nAgo(14);
      const workDate = currentWorkDate();

      const [ytChannelsRes, ghRes, attRes, rosterRes] = await Promise.all([
        supabase
          .from("connector_data_youtube_channels")
          .select("id")
          .eq("startup_id", startupId!),
        supabase
          .from("connector_data_github_daily")
          .select("activity_date, commits")
          .eq("startup_id", startupId!)
          .gte("activity_date", since14),
        supabase
          .from("slack_daily_attendance")
          .select("user_id_source, work_date, checked_in")
          .eq("startup_id", startupId!)
          .gte("work_date", since7),
        supabase
          .from("connector_data_slack_users")
          .select("user_id_source")
          .eq("startup_id", startupId!)
          .eq("is_bot", false),
      ]);
      if (ghRes.error) throw ghRes.error;
      if (attRes.error) throw attRes.error;

      // ── YouTube views: daily channel analytics is the per-day source of
      // truth (video_analytics rows are rolling 30d snapshots, not daily).
      const channelIds = (ytChannelsRes.data ?? []).map((c: any) => c.id);
      let ytRows: Array<{ date: string; views: number }> = [];
      if (channelIds.length > 0) {
        // cap: URL limit @200 (a startup has ~7 channels — far below the cap)
        const { data: an, error } = await supabase
          .from("connector_data_youtube_channel_analytics")
          .select("date, views")
          .in("channel_uuid", channelIds.slice(0, 200))
          .gte("date", since14);
        if (error) throw error;
        ytRows = (an ?? []) as Array<{ date: string; views: number }>;
      }
      const ytByDay = new Map<string, number>();
      for (const r of ytRows) ytByDay.set(r.date, (ytByDay.get(r.date) ?? 0) + Number(r.views ?? 0));
      const ytCur = Array.from(ytByDay.entries()).filter(([d]) => d >= since7);
      const ytPrev = Array.from(ytByDay.entries()).filter(([d]) => d < since7);
      const ytCurTotal = ytCur.reduce((s, [, v]) => s + v, 0);
      const ytPrevTotal = ytPrev.reduce((s, [, v]) => s + v, 0);
      const ytSpark = ytCur.sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);

      // ── GitHub commits ──
      const ghByDay = new Map<string, number>();
      for (const r of ghRes.data ?? []) {
        ghByDay.set(r.activity_date, (ghByDay.get(r.activity_date) ?? 0) + Number(r.commits ?? 0));
      }
      const ghCur = Array.from(ghByDay.entries()).filter(([d]) => d >= since7);
      const ghPrev = Array.from(ghByDay.entries()).filter(([d]) => d < since7);
      const ghCurTotal = ghCur.reduce((s, [, v]) => s + v, 0);
      const ghPrevTotal = ghPrev.reduce((s, [, v]) => s + v, 0);
      const ghSpark = ghCur.sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);

      // ── Slack attendance today + 7d spark + active employees ──
      const att = attRes.data ?? [];
      const usersWithHistory = new Set(att.map((r) => r.user_id_source));
      const roster = (rosterRes.data ?? []).filter((u) =>
        usersWithHistory.has(u.user_id_source)
      );
      const todayRows = att.filter((r) => r.work_date === workDate);
      const checkedInToday = new Set(
        todayRows.filter((r) => r.checked_in).map((r) => r.user_id_source)
      ).size;
      const rosterCount = Math.max(roster.length, checkedInToday);

      const attByDay = new Map<string, number>();
      for (const r of att) {
        if (r.checked_in) attByDay.set(r.work_date, (attByDay.get(r.work_date) ?? 0) + 1);
      }
      const attSpark = Array.from(attByDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => v);

      const activeEmployees = new Set(
        att.filter((r) => r.checked_in).map((r) => r.user_id_source)
      ).size;

      return {
        youtubeViews7d: { value: ytCurTotal, deltaPct: pct(ytCurTotal, ytPrevTotal), spark: ytSpark },
        slackAttendanceTodayPct: {
          value: rosterCount > 0 ? Math.round((checkedInToday / rosterCount) * 100) : null,
          checkedIn: checkedInToday,
          roster: rosterCount,
          spark: attSpark,
        },
        githubCommits7d: { value: ghCurTotal, deltaPct: pct(ghCurTotal, ghPrevTotal), spark: ghSpark },
        activeEmployees7d: { value: activeEmployees },
      };
    },
  });
}
