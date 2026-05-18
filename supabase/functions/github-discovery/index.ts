import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Phase 2A — one-shot GitHub discovery.
//
// Reads a PAT stored in connector_credentials (connector_type='github'),
// then enumerates org metadata so we can decide repo scope + identity
// mapping before building the proper sync.
//
// Input (JSON body):
//   { startup_id: uuid, orgs: ["Gurucool","Nasheedio"] }
//
// Output: a structured JSON report with everything we need to plan
// integration. NOTHING is stored in the DB — purely read-only.

const GH_BASE = "https://api.github.com";

interface DiscoveryReport {
  pat_owner: { login: string; name: string | null; email: string | null } | null;
  accessible_orgs: Array<{ login: string; description: string | null }>;
  orgs: Record<string, OrgReport>;
  unique_github_usernames: string[];
  errors: string[];
}

interface OrgReport {
  members: Array<{ login: string; name: string | null }>;
  repos: Array<{
    name: string;
    full_name: string;
    private: boolean;
    archived: boolean;
    default_branch: string;
    language: string | null;
    description: string | null;
    pushed_at: string;
    size_kb: number;
    open_pr_count: number | null;
    open_issue_count: number;
    top_contributors: Array<{ login: string; commits: number }>;
    recent_prs_sample: Array<{
      number: number;
      title: string;
      author: string | null;
      state: string;
      created_at: string;
      merged_at: string | null;
      labels: string[];
    }>;
  }>;
}

async function ghFetch(path: string, token: string): Promise<any> {
  const url = path.startsWith("http") ? path : `${GH_BASE}${path}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "FounderOS-Discovery/1.0",
    },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`GitHub ${r.status} on ${path}: ${t.slice(0, 200)}`);
  }
  return r.json();
}

async function gatherOrgReport(org: string, token: string, errors: string[]): Promise<OrgReport> {
  const report: OrgReport = { members: [], repos: [] };

  // Members
  try {
    const members = await ghFetch(`/orgs/${org}/members?per_page=100`, token);
    report.members = (members as any[]).map((m) => ({
      login: m.login,
      name: m.name ?? null,
    }));
  } catch (e: any) {
    errors.push(`${org} members: ${e.message}`);
  }

  // Repos
  let repos: any[] = [];
  try {
    repos = await ghFetch(`/orgs/${org}/repos?per_page=100&sort=pushed`, token);
  } catch (e: any) {
    errors.push(`${org} repos: ${e.message}`);
    return report;
  }

  // For each repo, gather extra data — but limit to top 10 by recency
  // to keep API calls reasonable.
  const TOP_N = 10;
  const sortedRepos = repos.slice(0, TOP_N);
  // Also include all archived/abandoned repos in the basic list but skip deep probing for them

  for (const r of repos) {
    const isTopRepo = sortedRepos.some((x) => x.full_name === r.full_name);
    const entry: OrgReport["repos"][number] = {
      name: r.name,
      full_name: r.full_name,
      private: !!r.private,
      archived: !!r.archived,
      default_branch: r.default_branch,
      language: r.language ?? null,
      description: r.description ?? null,
      pushed_at: r.pushed_at,
      size_kb: r.size ?? 0,
      open_pr_count: null,
      open_issue_count: r.open_issues_count ?? 0,
      top_contributors: [],
      recent_prs_sample: [],
    };

    if (isTopRepo && !r.archived) {
      // Open PR count via search (fast)
      try {
        const search = await ghFetch(
          `/search/issues?q=repo:${r.full_name}+type:pr+state:open&per_page=1`,
          token
        );
        entry.open_pr_count = search.total_count ?? 0;
      } catch (e: any) {
        errors.push(`${r.full_name} open PRs: ${e.message}`);
      }

      // Sample 20 most-recent PRs (any state)
      try {
        const prs = await ghFetch(
          `/repos/${r.full_name}/pulls?state=all&sort=updated&direction=desc&per_page=20`,
          token
        );
        entry.recent_prs_sample = (prs as any[]).map((pr) => ({
          number: pr.number,
          title: pr.title,
          author: pr.user?.login ?? null,
          state: pr.merged_at ? "merged" : pr.state,
          created_at: pr.created_at,
          merged_at: pr.merged_at,
          labels: (pr.labels ?? []).map((l: any) => l.name).slice(0, 5),
        }));
      } catch (e: any) {
        errors.push(`${r.full_name} PRs: ${e.message}`);
      }

      // Top contributors
      try {
        const contribs = await ghFetch(
          `/repos/${r.full_name}/contributors?per_page=20`,
          token
        );
        entry.top_contributors = (contribs as any[]).slice(0, 10).map((c) => ({
          login: c.login,
          commits: c.contributions ?? 0,
        }));
      } catch (e: any) {
        // Contributors API can be slow to populate for new repos — non-fatal
        errors.push(`${r.full_name} contributors: ${e.message}`);
      }
    }

    report.repos.push(entry);
  }

  return report;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    const body = await req.json().catch(() => ({}));
    const startupId = body.startup_id as string | undefined;
    const orgsInput = (body.orgs as string[] | undefined) ?? ["Nasheedio"];

    if (!startupId) {
      return new Response(
        JSON.stringify({ error: "startup_id is required in body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pull the PAT from connector_credentials
    const { data: cred, error: credErr } = await admin
      .from("connector_credentials")
      .select("credentials")
      .eq("startup_id", startupId)
      .eq("connector_type", "github")
      .eq("is_active", true)
      .maybeSingle();
    if (credErr) throw new Error(`DB read failed: ${credErr.message}`);
    if (!cred) {
      return new Response(
        JSON.stringify({
          error:
            "No active github credential found. INSERT into connector_credentials first with { token: '<pat>', org: '<org-name>' }.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = (cred.credentials as any)?.token;
    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({ error: "credentials.token is missing or not a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errors: string[] = [];
    const report: DiscoveryReport = {
      pat_owner: null,
      accessible_orgs: [],
      orgs: {},
      unique_github_usernames: [],
      errors,
    };

    // 1. Who's the PAT?
    try {
      const me = await ghFetch("/user", token);
      report.pat_owner = {
        login: me.login,
        name: me.name ?? null,
        email: me.email ?? null,
      };
    } catch (e: any) {
      errors.push(`/user: ${e.message}`);
    }

    // 2. Accessible orgs
    try {
      const orgs = await ghFetch("/user/orgs?per_page=100", token);
      report.accessible_orgs = (orgs as any[]).map((o) => ({
        login: o.login,
        description: o.description ?? null,
      }));
    } catch (e: any) {
      errors.push(`/user/orgs: ${e.message}`);
    }

    // 3. Detailed report per requested org
    for (const org of orgsInput) {
      report.orgs[org] = await gatherOrgReport(org, token, errors);
    }

    // 4. Aggregate unique usernames
    const usernames = new Set<string>();
    Object.values(report.orgs).forEach((or) => {
      or.members.forEach((m) => usernames.add(m.login));
      or.repos.forEach((r) => {
        r.top_contributors.forEach((c) => usernames.add(c.login));
        r.recent_prs_sample.forEach((pr) => {
          if (pr.author) usernames.add(pr.author);
        });
      });
    });
    report.unique_github_usernames = Array.from(usernames).sort();

    return new Response(JSON.stringify(report, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("github-discovery error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
