// GitHub engineering analytics sync.
//
// Reads the PAT from connector_credentials (connector_type='github'), pulls
// commits + PRs + issues for active repos across the configured orgs over a
// rolling window, upserts raw records into connector_data_github, and writes
// per-(login, repo, day) rollups into connector_data_github_daily.
//
// Body: { startup_id: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GH_BASE = "https://api.github.com";
const WINDOW_DAYS = 180; // pull 180d of history; "All time" view reads whatever has accumulated
const MAX_REPOS_PER_ORG = 80; // gurucool-xyz has ~56 repos; cover all active ones
const MAX_COMMIT_PAGES = 20; // 100/page → up to 2000 commits/repo/window
const MAX_PR_PAGES = 10;     // 100/page → up to 1000 PRs/org per state (open|merged)
// Soft wall-clock budget. Repos are processed most-recently-pushed first, so if
// we run out of time the least-active repos are the ones skipped, and the
// partial data collected so far is still upserted. Re-run to fill the rest.
const TIME_BUDGET_MS = 110_000;

// Bot / automation logins we never want polluting People stats.
const BOT_LOGINS = new Set(["web-flow", "github-actions[bot]", "dependabot[bot]"]);
function isBot(login: string | null | undefined): boolean {
  if (!login) return true;
  return login.endsWith("[bot]") || BOT_LOGINS.has(login) || login === "dependabot";
}

function sinceISO(): string {
  return new Date(Date.now() - WINDOW_DAYS * 864e5).toISOString();
}

async function gh(path: string, token: string): Promise<{ ok: boolean; status: number; body: any; remaining: number }> {
  const url = path.startsWith("http") ? path : `${GH_BASE}${path}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "FounderOS-GitHubSync/1.0",
    },
  });
  const remaining = parseInt(r.headers.get("x-ratelimit-remaining") ?? "9999", 10);
  let body: any = null;
  try { body = await r.json(); } catch { /* empty */ }
  return { ok: r.ok, status: r.status, body, remaining };
}

interface DailyAcc {
  github_login: string;
  repo_name: string;
  activity_date: string;
  commits: number;
  prs_opened: number;
  prs_merged: number;
}

function dateOf(iso: string): string {
  return iso.slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { startup_id } = (await req.json()) as { startup_id: string };
    if (!startup_id) throw new Error("startup_id required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Credentials
    const { data: cred, error: credErr } = await admin
      .from("connector_credentials")
      .select("credentials")
      .eq("startup_id", startup_id)
      .eq("connector_type", "github")
      .eq("is_active", true)
      .maybeSingle();
    if (credErr) throw new Error(`DB read failed: ${credErr.message}`);
    if (!cred) throw new Error("No active github credential found in connector_credentials");

    const c = cred.credentials as { token?: string; org?: string; orgs?: string[] };
    const token = c.token;
    if (!token) throw new Error("credentials.token missing");
    const orgs = (c.orgs && c.orgs.length ? c.orgs : c.org ? [c.org] : []);
    if (orgs.length === 0) throw new Error("No orgs configured (credentials.orgs or credentials.org)");

    // Identity map: github_login → profile id
    const { data: profileRows } = await admin
      .from("profiles")
      .select("id,github_username")
      .not("github_username", "is", null);
    const loginToProfile = new Map<string, string>();
    for (const p of profileRows ?? []) {
      if (p.github_username) loginToProfile.set((p.github_username as string).toLowerCase(), p.id as string);
    }

    const since = sinceISO();
    const sinceDate = since.slice(0, 10);
    const ghRecords: Record<string, unknown>[] = [];
    const daily = new Map<string, DailyAcc>();
    const repoRegistry: Record<string, unknown>[] = [];
    const errors: string[] = [];
    // External ids of every currently-open PR we fetched this run, used to
    // reconcile (close) stale "open" rows. prReconcilable stays true only if we
    // fetched every org's open PRs completely (no early break / failure / cap).
    const openExternalIds = new Set<string>();
    let prReconcilable = true;
    let repos_synced = 0;
    let rate_limited = false;
    let time_budget_hit = false;
    const startMs = Date.now();

    function bumpDaily(login: string, repo: string, date: string, field: "commits" | "prs_opened" | "prs_merged") {
      const key = `${login}:${repo}:${date}`;
      let acc = daily.get(key);
      if (!acc) {
        acc = { github_login: login, repo_name: repo, activity_date: date, commits: 0, prs_opened: 0, prs_merged: 0 };
        daily.set(key, acc);
      }
      acc[field]++;
    }

    for (const org of orgs) {
      // Active repos (pushed within window, not archived)
      const reposRes = await gh(`/orgs/${org}/repos?per_page=100&sort=pushed`, token);
      if (!reposRes.ok) {
        errors.push(`${org} repos: ${reposRes.status} — ${(reposRes.body as any)?.message ?? "no message"}`);
        continue;
      }
      const allRepos = (reposRes.body as any[]) ?? [];

      // Registry: every repo in the org (incl. archived/dormant) so the Repos
      // tab can list them all, not just the recently-active ones.
      for (const r of allRepos) {
        repoRegistry.push({
          startup_id,
          org,
          repo_name: r.name,
          full_name: r.full_name,
          is_private: !!r.private,
          is_archived: !!r.archived,
          language: r.language ?? null,
          open_issues: r.open_issues_count ?? 0,
          pushed_at: r.pushed_at ?? null,
        });
      }

      const repos = allRepos
        .filter((r) => !r.archived && r.pushed_at >= since)
        .slice(0, MAX_REPOS_PER_ORG);

      for (const repo of repos) {
        if (rate_limited) break;
        if (Date.now() - startMs > TIME_BUDGET_MS) { time_budget_hit = true; break; }
        const full = repo.full_name as string;
        const repoName = repo.name as string;
        repos_synced++;

        // ── Commits ──
        for (let page = 1; page <= MAX_COMMIT_PAGES; page++) {
          const res = await gh(`/repos/${full}/commits?since=${since}&per_page=100&page=${page}`, token);
          if (res.remaining < 50) { rate_limited = true; break; }
          if (!res.ok) {
            // 409 = empty repo; ignore quietly
            if (res.status !== 409) errors.push(`${full} commits p${page}: ${res.status}`);
            break;
          }
          const commits = (res.body as any[]) ?? [];
          if (commits.length === 0) break;

          for (const cm of commits) {
            const login: string | null = cm.author?.login ?? null;
            // Only skip genuine bot ACCOUNTS. A null login just means the commit
            // email isn't linked to a GitHub account — that's a real commit and
            // must still be counted (attributed by the commit author's name).
            if (login && isBot(login)) continue;
            const date = dateOf(cm.commit?.author?.date ?? cm.commit?.committer?.date ?? since);
            const effLogin = login ?? (cm.commit?.author?.name as string) ?? "unknown";
            ghRecords.push({
              startup_id,
              record_type: "commit",
              external_id: cm.sha,
              repo_name: repoName,
              author_login: effLogin,
              author_profile_id: login ? loginToProfile.get(login.toLowerCase()) ?? null : null,
              title: (cm.commit?.message ?? "").split("\n")[0].slice(0, 500),
              state: null,
              body: null,
              labels: [],
              created_at_source: cm.commit?.author?.date ?? null,
              updated_at_source: null,
              closed_at_source: null,
              merged_at_source: null,
              raw_payload: { sha: cm.sha, html_url: cm.html_url },
            });
            bumpDaily(effLogin, repoName, date, "commits");
          }
          if (commits.length < 100) break;
        }
      }

      if (rate_limited || time_budget_hit) { prReconcilable = false; break; }

      // ── PRs across the org via search. ALL open PRs are paginated so every
      //    non-merged PR is captured; merged-in-window PRs feed velocity. ──
      const pushPR = (pr: any, merged: boolean): string | null => {
        const login: string | null = pr.user?.login ?? null;
        if (login && isBot(login)) return null; // skip bot accounts, keep null-author PRs
        const repoName = pr.repository_url?.split("/").slice(-1)[0] ?? "unknown";
        const mergedAt = pr.pull_request?.merged_at ?? null;
        const extId = `${repoName}#${pr.number}`;
        ghRecords.push({
          startup_id,
          record_type: "pull_request",
          external_id: extId,
          repo_name: repoName,
          author_login: login,
          author_profile_id: login ? loginToProfile.get(login.toLowerCase()) ?? null : null,
          title: pr.title,
          state: mergedAt ? "merged" : "open",
          body: (pr.body ?? "").slice(0, 2000),
          labels: (pr.labels ?? []).map((l: any) => l.name),
          created_at_source: pr.created_at ?? null,
          updated_at_source: pr.updated_at ?? null,
          closed_at_source: pr.closed_at ?? null,
          merged_at_source: mergedAt,
          raw_payload: { number: pr.number, html_url: pr.html_url, comments: pr.comments },
        });
        if (login) {
          if (merged && mergedAt) bumpDaily(login, repoName, dateOf(mergedAt), "prs_merged");
          else if (!merged) bumpDaily(login, repoName, dateOf(pr.created_at), "prs_opened");
        }
        return extId;
      };

      // OPEN PRs — paginate to capture them all; collect ids for reconciliation.
      // The Search API has its own ~30/min budget, so detect throttling by HTTP
      // status (403/429) rather than the core x-ratelimit-remaining header.
      for (let page = 1; page <= MAX_PR_PAGES; page++) {
        const res = await gh(`/search/issues?q=type:pr+org:${org}+state:open&per_page=100&page=${page}&sort=updated`, token);
        if (!res.ok) {
          if (res.status === 403 || res.status === 429) rate_limited = true;
          errors.push(`${org} PRs(open) p${page}: ${res.status}`);
          prReconcilable = false;
          break;
        }
        const items = (res.body?.items as any[]) ?? [];
        for (const pr of items) { const id = pushPR(pr, false); if (id) openExternalIds.add(id); }
        if (items.length < 100) break;
        if (page === MAX_PR_PAGES) prReconcilable = false; // hit the cap → possibly truncated
      }

      // MERGED-in-window PRs — paginate for accurate merge velocity.
      for (let page = 1; page <= MAX_PR_PAGES; page++) {
        const res = await gh(`/search/issues?q=type:pr+org:${org}+merged:>=${sinceDate}&per_page=100&page=${page}&sort=updated`, token);
        if (!res.ok) {
          if (res.status === 403 || res.status === 429) rate_limited = true;
          errors.push(`${org} PRs(merged) p${page}: ${res.status}`);
          break;
        }
        const items = (res.body?.items as any[]) ?? [];
        for (const pr of items) pushPR(pr, true);
        if (items.length < 100) break;
      }
    }
    if (rate_limited || time_budget_hit) prReconcilable = false;

    // ── Upsert repo registry ──
    let repos_registered = 0;
    if (repoRegistry.length > 0) {
      const { error, count } = await admin
        .from("connector_data_github_repos")
        .upsert(repoRegistry, { onConflict: "startup_id,full_name", count: "exact" });
      if (error) throw new Error(`github_repos upsert: ${error.message}`);
      repos_registered = count ?? repoRegistry.length;
    }

    // ── Upsert raw records (chunked) ──
    let records_upserted = 0;
    for (let i = 0; i < ghRecords.length; i += 500) {
      const chunk = ghRecords.slice(i, i + 500);
      const { error, count } = await admin
        .from("connector_data_github")
        .upsert(chunk, { onConflict: "startup_id,record_type,external_id", count: "exact" });
      if (error) throw new Error(`github upsert: ${error.message}`);
      records_upserted += count ?? chunk.length;
    }

    // ── Upsert daily rollups (chunked) ──
    let daily_rows = 0;
    const dailyArr = Array.from(daily.values()).map((d) => ({ startup_id, ...d }));
    for (let i = 0; i < dailyArr.length; i += 500) {
      const chunk = dailyArr.slice(i, i + 500);
      const { error, count } = await admin
        .from("connector_data_github_daily")
        .upsert(chunk, { onConflict: "startup_id,github_login,repo_name,activity_date", count: "exact" });
      if (error) throw new Error(`github_daily upsert: ${error.message}`);
      daily_rows += count ?? chunk.length;
    }

    // ── Reconcile stale "open" PRs ──
    // Anything still marked "open" in the DB but absent from this run's freshly
    // fetched open set has since been merged or closed on GitHub. Only safe when
    // we fetched every org's open PRs completely (prReconcilable).
    let prs_closed_stale = 0;
    if (prReconcilable) {
      const { data: dbOpen } = await admin
        .from("connector_data_github")
        .select("external_id")
        .eq("startup_id", startup_id)
        .eq("record_type", "pull_request")
        .eq("state", "open");
      const stale = (dbOpen ?? [])
        .map((r) => r.external_id as string)
        .filter((id) => !openExternalIds.has(id));
      for (let i = 0; i < stale.length; i += 200) {
        const chunk = stale.slice(i, i + 200);
        const { error } = await admin
          .from("connector_data_github")
          .update({ state: "closed" })
          .eq("startup_id", startup_id)
          .eq("record_type", "pull_request")
          .in("external_id", chunk);
        if (!error) prs_closed_stale += chunk.length;
      }
    }

    // Touch last_synced_at
    await admin
      .from("connector_credentials")
      .update({ last_synced_at: new Date().toISOString(), last_sync_error: errors.length ? errors.slice(0, 3).join("; ") : null })
      .eq("startup_id", startup_id)
      .eq("connector_type", "github");

    return new Response(
      JSON.stringify({
        ok: true,
        orgs,
        repos_synced,
        repos_registered,
        records_upserted,
        daily_rows,
        commits: ghRecords.filter((r) => r.record_type === "commit").length,
        prs: ghRecords.filter((r) => r.record_type === "pull_request").length,
        prs_closed_stale,
        rate_limited,
        time_budget_hit,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
