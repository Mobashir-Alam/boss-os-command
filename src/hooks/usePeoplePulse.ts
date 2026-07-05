import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PeoplePulsePerson {
  personId: string;
  name: string;
  avatarUrl: string | null;
  githubLogin: string | null;
  slackUserId: string | null;
  commits7d: number;
  attendanceDays7d: number;
  workDays7d: number;
  comboScore: number; // 0..1
}

const nAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

// Section D: one compact card per person with employee_connector_links set up.
// combo score = attendance_rate * 0.4 + min(1, commits/20) * 0.6
export function usePeoplePulse(startupId: string | undefined) {
  return useQuery({
    queryKey: ["people-pulse", startupId],
    enabled: !!startupId,
    queryFn: async (): Promise<PeoplePulsePerson[]> => {
      const since = nAgo(7);

      const { data: links, error: linksErr } = await supabase
        .from("employee_connector_links")
        .select("person_id, slack_user_id, github_login")
        .eq("startup_id", startupId!);
      if (linksErr) throw linksErr;
      const linkRows = (links ?? []).filter((l) => l.person_id);
      if (linkRows.length === 0) return [];

      const personIds = linkRows.map((l) => l.person_id as string);
      const githubLogins = linkRows.map((l) => l.github_login).filter((x): x is string => !!x);
      const slackIds = linkRows.map((l) => l.slack_user_id).filter((x): x is string => !!x);

      const [peopleRes, ghRes, attRes, slackUsersRes] = await Promise.all([
        // cap: URL limit @200 — team rosters are far below this
        supabase.from("people").select("id, full_name").in("id", personIds.slice(0, 200)),
        githubLogins.length > 0
          ? supabase
              .from("connector_data_github_daily")
              .select("github_login, activity_date, commits")
              .eq("startup_id", startupId!)
              // cap: URL limit @200
              .in("github_login", githubLogins.slice(0, 200))
              .gte("activity_date", since)
          : Promise.resolve({ data: [], error: null } as any),
        slackIds.length > 0
          ? supabase
              .from("slack_daily_attendance")
              .select("user_id_source, work_date, checked_in")
              .eq("startup_id", startupId!)
              // cap: URL limit @200
              .in("user_id_source", slackIds.slice(0, 200))
              .gte("work_date", since)
          : Promise.resolve({ data: [], error: null } as any),
        slackIds.length > 0
          ? supabase
              .from("connector_data_slack_users")
              .select("user_id_source, avatar_url")
              .eq("startup_id", startupId!)
              // cap: URL limit @200
              .in("user_id_source", slackIds.slice(0, 200))
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (peopleRes.error) throw peopleRes.error;

      const nameById = new Map(
        (peopleRes.data ?? []).map((p: any) => [p.id as string, p.full_name as string])
      );
      const avatarBySlack = new Map(
        ((slackUsersRes.data ?? []) as any[]).map((u) => [u.user_id_source, u.avatar_url])
      );

      const commitsByLogin = new Map<string, number>();
      for (const r of (ghRes.data ?? []) as any[]) {
        commitsByLogin.set(r.github_login, (commitsByLogin.get(r.github_login) ?? 0) + Number(r.commits ?? 0));
      }

      const attRows = (attRes.data ?? []) as any[];
      const workDays = new Set(attRows.map((r) => r.work_date)).size;
      const attendanceByUser = new Map<string, number>();
      for (const r of attRows) {
        if (r.checked_in) {
          attendanceByUser.set(r.user_id_source, (attendanceByUser.get(r.user_id_source) ?? 0) + 1);
        }
      }

      return linkRows
        .map((l) => {
          const commits = l.github_login ? (commitsByLogin.get(l.github_login) ?? 0) : 0;
          const attDays = l.slack_user_id ? (attendanceByUser.get(l.slack_user_id) ?? 0) : 0;
          const attendanceRate = workDays > 0 ? attDays / workDays : 0;
          const commitsNormalized = Math.min(1, commits / 20);
          const comboScore = attendanceRate * 0.4 + commitsNormalized * 0.6;
          return {
            personId: l.person_id as string,
            name: nameById.get(l.person_id as string) ?? "Unknown",
            avatarUrl: l.slack_user_id ? (avatarBySlack.get(l.slack_user_id) ?? null) : null,
            githubLogin: l.github_login ?? null,
            slackUserId: l.slack_user_id ?? null,
            commits7d: commits,
            attendanceDays7d: attDays,
            workDays7d: workDays,
            comboScore,
          };
        })
        .sort((a, b) => b.comboScore - a.comboScore);
    },
  });
}
