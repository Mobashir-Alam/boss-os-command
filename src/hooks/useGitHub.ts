import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Raw types ───────────────────────────────────────────────

interface DailyRow {
  github_login: string;
  repo_name: string;
  activity_date: string;
  commits: number;
  prs_opened: number;
  prs_merged: number;
  additions: number;
  deletions: number;
}

export interface GitHubKpi {
  label: string;
  key: string;
  value: number;
  baseline: number;
  delta_pct: number | null;
  series: { date: string; value: number }[];
}

export interface GitHubPerson {
  github_login: string;
  name: string;          // mapped employee name, or the handle
  avatar_url: string | null;
  mapped: boolean;
  commits: number;
  prs_opened: number;
  prs_merged: number;
  repos_touched: number;
  top_repo: string | null;
  last_active: string | null;
}

export interface GitHubRepo {
  repo_name: string;
  commits: number;
  prs_merged: number;
  contributors: number;
  top_contributor: string | null;
  contributors_list: { name: string; commits: number }[]; // who worked on it + commit counts
  last_active: string | null;     // last commit/PR in the activity window
  pushed_at: string | null;       // last push from the repo registry (any branch)
  is_private: boolean;
  is_archived: boolean;
  language: string | null;
  bus_factor_risk: boolean;       // single dominant contributor
  active: boolean;                // had commits/PRs in the activity window
  bus_factor_risk_relevant: boolean;
}

// ─── Identity helpers ────────────────────────────────────────

interface ProfileLite {
  id: string;
  full_name: string | null;
  github_username: string | null;
  avatar_url: string | null;
}

async function fetchProfiles(): Promise<ProfileLite[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,github_username,avatar_url");
  if (error) throw error;
  return (data ?? []) as ProfileLite[];
}

function identityMaps(profiles: ProfileLite[]) {
  const nameByLogin = new Map<string, string>();
  const avatarByLogin = new Map<string, string | null>();
  for (const p of profiles) {
    if (p.github_username) {
      nameByLogin.set(p.github_username.toLowerCase(), p.full_name ?? p.github_username);
      avatarByLogin.set(p.github_username.toLowerCase(), p.avatar_url ?? null);
    }
  }
  return { nameByLogin, avatarByLogin };
}

const nAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

async function fetchDaily(startupId: string, sinceDays: number): Promise<DailyRow[]> {
  const { data, error } = await supabase
    .from("connector_data_github_daily")
    .select("github_login,repo_name,activity_date,commits,prs_opened,prs_merged,additions,deletions")
    .eq("startup_id", startupId)
    .gte("activity_date", nAgo(sinceDays));
  if (error) throw error;
  return (data ?? []) as DailyRow[];
}

// ─── Overview (KPIs + anomalies) ─────────────────────────────

export function useGitHubOverview(startupId?: string, baselineDays: 7 | 28 = 7) {
  return useQuery({
    queryKey: ["github-overview", startupId, baselineDays],
    enabled: !!startupId,
    queryFn: async () => {
      const rows = await fetchDaily(startupId!, 14 + baselineDays);
      const recentStart = nAgo(14);
      const baselineStart = nAgo(14 + baselineDays);

      const dayMap = new Map<string, { commits: number; prs_merged: number; prs_opened: number }>();
      for (const r of rows) {
        if (r.activity_date < recentStart) continue;
        const prev = dayMap.get(r.activity_date) ?? { commits: 0, prs_merged: 0, prs_opened: 0 };
        prev.commits += r.commits; prev.prs_merged += r.prs_merged; prev.prs_opened += r.prs_opened;
        dayMap.set(r.activity_date, prev);
      }
      const sorted = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b));

      const recent = rows.filter((r) => r.activity_date >= recentStart);
      const baseline = rows.filter((r) => r.activity_date >= baselineStart && r.activity_date < recentStart);
      const sum = (rs: DailyRow[], f: keyof DailyRow) => rs.reduce((s, r) => s + (r[f] as number), 0);
      const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);

      const activeRecent = new Set(recent.filter((r) => r.commits > 0).map((r) => r.github_login)).size;
      const activeBase = new Set(baseline.filter((r) => r.commits > 0).map((r) => r.github_login)).size;

      const kpis: GitHubKpi[] = [
        { label: "Commits", key: "commits", value: sum(recent, "commits"), baseline: sum(baseline, "commits"), delta_pct: pct(sum(recent, "commits"), sum(baseline, "commits")), series: sorted.map(([date, v]) => ({ date, value: v.commits })) },
        { label: "PRs merged", key: "prs_merged", value: sum(recent, "prs_merged"), baseline: sum(baseline, "prs_merged"), delta_pct: pct(sum(recent, "prs_merged"), sum(baseline, "prs_merged")), series: sorted.map(([date, v]) => ({ date, value: v.prs_merged })) },
        { label: "PRs opened", key: "prs_opened", value: sum(recent, "prs_opened"), baseline: sum(baseline, "prs_opened"), delta_pct: pct(sum(recent, "prs_opened"), sum(baseline, "prs_opened")), series: sorted.map(([date, v]) => ({ date, value: v.prs_opened })) },
        { label: "Active devs", key: "active", value: activeRecent, baseline: activeBase, delta_pct: pct(activeRecent, activeBase), series: [] },
      ];

      // Anomalies: per-person commit spike/drop vs their own prior week
      const perPersonRecent = new Map<string, number>();
      const perPersonBase = new Map<string, number>();
      for (const r of recent) perPersonRecent.set(r.github_login, (perPersonRecent.get(r.github_login) ?? 0) + r.commits);
      for (const r of baseline) perPersonBase.set(r.github_login, (perPersonBase.get(r.github_login) ?? 0) + r.commits);
      const anomalies: { who: string; message: string }[] = [];
      for (const [login, cur] of perPersonRecent) {
        const base = perPersonBase.get(login) ?? 0;
        if (base >= 5 && cur < base * 0.25) anomalies.push({ who: login, message: `Slowed sharply: ${cur} commits vs ${base} prior` });
      }
      for (const [login, base] of perPersonBase) {
        if (base >= 3 && !perPersonRecent.has(login)) anomalies.push({ who: login, message: `Went quiet: 0 commits (was ${base})` });
      }

      return { kpis, anomalies };
    },
  });
}

// ─── People ──────────────────────────────────────────────────

export function useGitHubPeople(startupId?: string, windowDays = 14) {
  return useQuery({
    queryKey: ["github-people", startupId, windowDays],
    enabled: !!startupId,
    queryFn: async (): Promise<GitHubPerson[]> => {
      const [rows, profiles] = await Promise.all([fetchDaily(startupId!, windowDays), fetchProfiles()]);
      const { nameByLogin, avatarByLogin } = identityMaps(profiles);

      const map = new Map<string, GitHubPerson & { _repoCommits: Map<string, number> }>();
      for (const r of rows) {
        let p = map.get(r.github_login);
        if (!p) {
          const key = r.github_login.toLowerCase();
          const mapped = nameByLogin.has(key);
          p = {
            github_login: r.github_login,
            name: mapped ? nameByLogin.get(key)! : r.github_login,
            avatar_url: avatarByLogin.get(key) ?? null,
            mapped,
            commits: 0, prs_opened: 0, prs_merged: 0, repos_touched: 0,
            top_repo: null, last_active: null,
            _repoCommits: new Map<string, number>(),
          };
          map.set(r.github_login, p);
        }
        p.commits += r.commits;
        p.prs_opened += r.prs_opened;
        p.prs_merged += r.prs_merged;
        if (r.commits > 0 || r.prs_merged > 0) p._repoCommits.set(r.repo_name, (p._repoCommits.get(r.repo_name) ?? 0) + r.commits + r.prs_merged);
        if (!p.last_active || r.activity_date > p.last_active) p.last_active = r.activity_date;
      }

      return Array.from(map.values()).map((p) => {
        const repos = Array.from(p._repoCommits.entries()).sort(([, a], [, b]) => b - a);
        return {
          github_login: p.github_login,
          name: p.name,
          avatar_url: p.avatar_url,
          mapped: p.mapped,
          commits: p.commits,
          prs_opened: p.prs_opened,
          prs_merged: p.prs_merged,
          repos_touched: p._repoCommits.size,
          top_repo: repos[0]?.[0] ?? null,
          last_active: p.last_active,
        };
      }).sort((a, b) => b.commits - a.commits);
    },
  });
}

// ─── Repos ───────────────────────────────────────────────────

interface RepoRegistryRow {
  repo_name: string;
  full_name: string;
  is_private: boolean;
  is_archived: boolean;
  language: string | null;
  pushed_at: string | null;
}

export function useGitHubRepos(startupId?: string, windowDays = 14) {
  return useQuery({
    queryKey: ["github-repos", startupId, windowDays],
    enabled: !!startupId,
    queryFn: async (): Promise<GitHubRepo[]> => {
      const [rows, profiles, registryRes] = await Promise.all([
        fetchDaily(startupId!, windowDays),
        fetchProfiles(),
        supabase
          .from("connector_data_github_repos")
          .select("repo_name,full_name,is_private,is_archived,language,pushed_at")
          .eq("startup_id", startupId!),
      ]);
      const { nameByLogin } = identityMaps(profiles);
      const display = (login: string) => nameByLogin.get(login.toLowerCase()) ?? login;
      const registry = (registryRes.data ?? []) as RepoRegistryRow[];

      // Activity rollup per repo (from the daily window)
      const map = new Map<string, { commits: number; prs_merged: number; contribCommits: Map<string, number>; last: string | null }>();
      for (const r of rows) {
        let x = map.get(r.repo_name);
        if (!x) { x = { commits: 0, prs_merged: 0, contribCommits: new Map(), last: null }; map.set(r.repo_name, x); }
        x.commits += r.commits;
        x.prs_merged += r.prs_merged;
        if (r.commits > 0) x.contribCommits.set(r.github_login, (x.contribCommits.get(r.github_login) ?? 0) + r.commits);
        if ((r.commits > 0 || r.prs_merged > 0) && (!x.last || r.activity_date > x.last)) x.last = r.activity_date;
      }

      const build = (repoName: string, reg?: RepoRegistryRow): GitHubRepo => {
        const x = map.get(repoName);
        const contribs = x ? Array.from(x.contribCommits.entries()).sort(([, a], [, b]) => b - a) : [];
        const total = contribs.reduce((s, [, c]) => s + c, 0);
        const topShare = total ? (contribs[0]?.[1] ?? 0) / total : 0;
        const commits = x?.commits ?? 0;
        const active = commits > 0 || (x?.prs_merged ?? 0) > 0;
        return {
          repo_name: repoName,
          commits,
          prs_merged: x?.prs_merged ?? 0,
          contributors: x?.contribCommits.size ?? 0,
          top_contributor: contribs[0] ? display(contribs[0][0]) : null,
          contributors_list: contribs.map(([login, c]) => ({ name: display(login), commits: c })),
          last_active: x?.last ?? null,
          pushed_at: reg?.pushed_at ?? null,
          is_private: reg?.is_private ?? false,
          is_archived: reg?.is_archived ?? false,
          language: reg?.language ?? null,
          bus_factor_risk: active && (contribs.length <= 1 || topShare >= 0.8),
          active,
          bus_factor_risk_relevant: active,
        };
      };

      // Prefer the registry (all repos); fall back to activity-only repos if the
      // registry hasn't been synced yet.
      let result: GitHubRepo[];
      if (registry.length > 0) {
        const seen = new Set(registry.map((r) => r.repo_name));
        result = registry.map((r) => build(r.repo_name, r));
        // Include any active repo missing from the registry (edge case)
        for (const repoName of map.keys()) if (!seen.has(repoName)) result.push(build(repoName));
      } else {
        result = Array.from(map.keys()).map((repoName) => build(repoName));
      }

      // Active first (by commits), then dormant by most-recent push
      return result.sort((a, b) =>
        (b.active ? 1 : 0) - (a.active ? 1 : 0) ||
        b.commits - a.commits ||
        (b.pushed_at ?? "").localeCompare(a.pushed_at ?? "")
      );
    },
  });
}

// ─── Focus / Right now (open PRs + last-7d touches) ──────────

export interface OpenPR {
  repo_name: string;
  author: string;
  title: string;
  external_id: string;
  age_days: number | null;
  url: string | null;
  stale: boolean;
}

export function useGitHubFocus(startupId?: string) {
  return useQuery({
    queryKey: ["github-focus", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const [{ data: prs }, profiles] = await Promise.all([
        supabase
          .from("connector_data_github")
          .select("repo_name,author_login,title,external_id,created_at_source,raw_payload")
          .eq("startup_id", startupId!)
          .eq("record_type", "pull_request")
          .eq("state", "open")
          .order("created_at_source", { ascending: true })
          .limit(50),
        fetchProfiles(),
      ]);
      const { nameByLogin } = identityMaps(profiles);
      const display = (login: string | null) => (login ? nameByLogin.get(login.toLowerCase()) ?? login : "unknown");
      const now = Date.now();

      const openPrs: OpenPR[] = (prs ?? []).map((p) => {
        const age = p.created_at_source ? Math.round((now - Date.parse(p.created_at_source)) / 864e5) : null;
        return {
          repo_name: p.repo_name,
          author: display(p.author_login),
          title: p.title ?? "(untitled)",
          external_id: p.external_id,
          age_days: age,
          url: (p.raw_payload as Record<string, unknown>)?.html_url as string ?? null,
          stale: (age ?? 0) >= 7,
        };
      });

      return { openPrs, stale_count: openPrs.filter((p) => p.stale).length };
    },
  });
}

// ─── Person drill-down ───────────────────────────────────────

export function useGitHubPersonProfile(startupId: string | undefined, login: string | null) {
  return useQuery({
    queryKey: ["github-person", startupId, login],
    enabled: !!startupId && !!login,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connector_data_github")
        .select("record_type,repo_name,title,state,created_at_source,merged_at_source,external_id,raw_payload")
        .eq("startup_id", startupId!)
        .eq("author_login", login!)
        .order("created_at_source", { ascending: false })
        .limit(300);
      if (error) throw error;
      const rows = data ?? [];
      return {
        commits: rows.filter((r) => r.record_type === "commit"),
        prs: rows.filter((r) => r.record_type === "pull_request"),
      };
    },
  });
}

// ─── Identity mapping (handle → employee) ────────────────────

export interface UnmappedLogin { github_login: string; commits: number }

export function useGitHubIdentity(startupId?: string) {
  return useQuery({
    queryKey: ["github-identity", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const [rows, profiles] = await Promise.all([fetchDaily(startupId!, 60), fetchProfiles()]);
      const { nameByLogin } = identityMaps(profiles);
      const commitByLogin = new Map<string, number>();
      for (const r of rows) commitByLogin.set(r.github_login, (commitByLogin.get(r.github_login) ?? 0) + r.commits);
      const unmapped: UnmappedLogin[] = Array.from(commitByLogin.entries())
        .filter(([login]) => !nameByLogin.has(login.toLowerCase()))
        .map(([github_login, commits]) => ({ github_login, commits }))
        .sort((a, b) => b.commits - a.commits);
      return { unmapped, profiles };
    },
  });
}

export function useMapGitHubIdentity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, githubLogin }: { profileId: string; githubLogin: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ github_username: githubLogin })
        .eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["github-identity"] });
      qc.invalidateQueries({ queryKey: ["github-people"] });
      qc.invalidateQueries({ queryKey: ["github-repos"] });
    },
  });
}

// ─── Sync + KAI ──────────────────────────────────────────────

export function useTriggerGitHubSync() {
  return useMutation({
    mutationFn: async (startupId: string) => {
      const { data, error } = await supabase.functions.invoke("github-sync", { body: { startup_id: startupId } });
      if (error) {
        // FunctionsHttpError carries the real response body in .context — pull
        // the actual reason out instead of the generic "non-2xx" message.
        let detail = error.message;
        try {
          const body = await (error as { context?: Response }).context?.json?.();
          if (body?.error) detail = body.error;
        } catch { /* keep generic */ }
        throw new Error(detail);
      }
      if (!data?.ok) throw new Error(data?.error ?? "Sync failed");
      return data as {
        ok: boolean; orgs: string[]; repos_synced: number; repos_registered: number; records_upserted: number;
        daily_rows: number; commits: number; prs: number; rate_limited: boolean; time_budget_hit: boolean; errors: string[];
      };
    },
  });
}

export function useAskGitHubKai() {
  return useMutation({
    mutationFn: async ({ startupId, question }: { startupId: string; question: string }) => {
      const { data, error } = await supabase.functions.invoke("github-kai-ask", { body: { startup_id: startupId, question } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Unknown error");
      return data.answer as string;
    },
  });
}
