import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ConnectorLink {
  id: string;
  person_id: string | null;
  startup_id: string | null;
  slack_user_id: string | null;
  github_login: string | null;
}

export interface SlackUserOption {
  user_id_source: string;
  display_name: string | null;
  avatar_url: string | null;
}

// ── Links ───────────────────────────────────────────────────────────────────

// All links for a startup (used by People Pulse, Contributors tab, PeopleOS)
export function useConnectorLinks(startupId: string | undefined) {
  return useQuery({
    queryKey: ["connector-links", startupId],
    enabled: !!startupId,
    queryFn: async (): Promise<ConnectorLink[]> => {
      const { data, error } = await supabase
        .from("employee_connector_links")
        .select("id, person_id, startup_id, slack_user_id, github_login")
        .eq("startup_id", startupId!);
      if (error) throw error;
      return (data ?? []) as ConnectorLink[];
    },
  });
}

export function usePersonLink(personId: string | undefined) {
  return useQuery({
    queryKey: ["connector-link", personId],
    enabled: !!personId,
    queryFn: async (): Promise<ConnectorLink | null> => {
      const { data, error } = await supabase
        .from("employee_connector_links")
        .select("id, person_id, startup_id, slack_user_id, github_login")
        .eq("person_id", personId!)
        .maybeSingle();
      if (error) throw error;
      return (data as ConnectorLink) ?? null;
    },
  });
}

export function useSaveConnectorLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      personId,
      startupId,
      slackUserId,
      githubLogin,
    }: {
      personId: string;
      startupId: string;
      slackUserId: string | null;
      githubLogin: string | null;
    }) => {
      const { error } = await supabase.from("employee_connector_links").upsert(
        {
          person_id: personId,
          startup_id: startupId,
          slack_user_id: slackUserId,
          github_login: githubLogin,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "person_id" }
      );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["connector-links", vars.startupId] });
      qc.invalidateQueries({ queryKey: ["connector-link", vars.personId] });
      qc.invalidateQueries({ queryKey: ["people-pulse", vars.startupId] });
    },
  });
}

// ── Dropdown options ────────────────────────────────────────────────────────

export function useSlackUserOptions(startupId: string | undefined) {
  return useQuery({
    queryKey: ["slack-user-options", startupId],
    enabled: !!startupId,
    queryFn: async (): Promise<SlackUserOption[]> => {
      const { data, error } = await supabase
        .from("connector_data_slack_users")
        .select("user_id_source, display_name, avatar_url")
        .eq("startup_id", startupId!)
        .eq("is_bot", false)
        .order("display_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SlackUserOption[];
    },
  });
}

export function useGitHubLoginOptions(startupId: string | undefined) {
  return useQuery({
    queryKey: ["github-login-options", startupId],
    enabled: !!startupId,
    queryFn: async (): Promise<string[]> => {
      // No SQL DISTINCT via PostgREST — pull recent logins and dedupe locally.
      const since = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("connector_data_github_daily")
        .select("github_login")
        .eq("startup_id", startupId!)
        .gte("activity_date", since)
        .limit(5000);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of data ?? []) set.add(r.github_login as string);
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },
  });
}

// ── Per-person activity (My Activity + PeopleOS expandable row) ────────────

export interface GitHubDayActivity {
  activity_date: string;
  commits: number;
  prs_opened: number;
  prs_merged: number;
  additions: number;
  deletions: number;
}

export interface AttendanceDay {
  work_date: string;
  checked_in: boolean;
  was_active: boolean;
  posted_update: boolean;
}

export interface PersonActivity {
  github: {
    linked: boolean;
    days: GitHubDayActivity[];
    total_commits: number;
    prs_opened: number;
    prs_merged: number;
    additions: number;
    deletions: number;
  };
  slack: {
    linked: boolean;
    days: AttendanceDay[];
    checked_in_days: number;
    active_days: number;
  };
}

export function usePersonActivity(
  startupId: string | undefined,
  githubLogin: string | null | undefined,
  slackUserId: string | null | undefined,
  windowDays = 30
) {
  return useQuery({
    queryKey: ["person-activity", startupId, githubLogin ?? null, slackUserId ?? null, windowDays],
    enabled: !!startupId && (!!githubLogin || !!slackUserId),
    queryFn: async (): Promise<PersonActivity> => {
      const since = new Date(Date.now() - windowDays * 864e5).toISOString().slice(0, 10);

      const [ghRes, slackRes] = await Promise.all([
        githubLogin
          ? supabase
              .from("connector_data_github_daily")
              .select("activity_date, commits, prs_opened, prs_merged, additions, deletions")
              .eq("startup_id", startupId!)
              .eq("github_login", githubLogin)
              .gte("activity_date", since)
              .order("activity_date", { ascending: true })
          : Promise.resolve({ data: [], error: null } as any),
        slackUserId
          ? supabase
              .from("slack_daily_attendance")
              .select("work_date, checked_in, was_active, posted_update")
              .eq("startup_id", startupId!)
              .eq("user_id_source", slackUserId)
              .gte("work_date", since)
              .order("work_date", { ascending: true })
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (ghRes.error) throw ghRes.error;
      if (slackRes.error) throw slackRes.error;

      // Collapse per-(repo, day) GitHub rows into per-day totals
      const byDay = new Map<string, GitHubDayActivity>();
      for (const r of (ghRes.data ?? []) as any[]) {
        const cur = byDay.get(r.activity_date) ?? {
          activity_date: r.activity_date, commits: 0, prs_opened: 0, prs_merged: 0, additions: 0, deletions: 0,
        };
        cur.commits += r.commits;
        cur.prs_opened += r.prs_opened;
        cur.prs_merged += r.prs_merged;
        cur.additions += r.additions;
        cur.deletions += r.deletions;
        byDay.set(r.activity_date, cur);
      }
      const ghDays = Array.from(byDay.values()).sort((a, b) =>
        a.activity_date.localeCompare(b.activity_date)
      );
      const sum = (f: keyof GitHubDayActivity) =>
        ghDays.reduce((s, d) => s + Number(d[f] ?? 0), 0);

      const attDays = ((slackRes.data ?? []) as AttendanceDay[]);

      return {
        github: {
          linked: !!githubLogin,
          days: ghDays,
          total_commits: sum("commits"),
          prs_opened: sum("prs_opened"),
          prs_merged: sum("prs_merged"),
          additions: sum("additions"),
          deletions: sum("deletions"),
        },
        slack: {
          linked: !!slackUserId,
          days: attDays,
          checked_in_days: attDays.filter((d) => d.checked_in).length,
          active_days: attDays.filter((d) => d.was_active).length,
        },
      };
    },
  });
}
