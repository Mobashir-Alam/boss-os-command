// GitHub KAI — natural-language Q&A over the engineering snapshot.
//
// Body: { startup_id: string, question: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function pctDelta(cur: number, base: number): number | null {
  if (!base) return null;
  return Math.round(((cur - base) / base) * 100);
}

// Pulls the FULL synced history so KAI can reason over everything the
// dashboard shows — every contributor, every repo (incl. dormant/archived),
// all open PRs — plus a 7d-vs-prior-7d momentum read.
const FULL_DAYS = 180;

async function buildSnapshot(admin: ReturnType<typeof createClient>, startup_id: string) {
  const dstr = (d: Date) => d.toISOString().slice(0, 10);
  const nAgo = (n: number) => dstr(new Date(Date.now() - n * 864e5));
  const recentStart = nAgo(7);
  const priorStart = nAgo(14);

  const { data: daily } = await admin
    .from("connector_data_github_daily")
    .select("github_login,repo_name,activity_date,commits,prs_opened,prs_merged")
    .eq("startup_id", startup_id)
    .gte("activity_date", nAgo(FULL_DAYS));

  // Identity map for friendly names
  const { data: profs } = await admin
    .from("profiles")
    .select("full_name,github_username")
    .not("github_username", "is", null);
  const nameByLogin = new Map<string, string>();
  for (const p of profs ?? []) {
    if (p.github_username) nameByLogin.set((p.github_username as string).toLowerCase(), p.full_name as string);
  }
  const display = (login: string) => nameByLogin.get(login.toLowerCase()) ?? login;
  const isMapped = (login: string) => nameByLogin.has(login.toLowerCase());

  const rows = daily ?? [];
  const sum = (rs: typeof rows, f: "commits" | "prs_opened" | "prs_merged") =>
    rs.reduce((s, r) => s + (r[f] as number), 0);

  const recent = rows.filter((r) => r.activity_date >= recentStart);
  const prior = rows.filter((r) => r.activity_date >= priorStart && r.activity_date < recentStart);

  // ── Per-person over the FULL window (every contributor) ──
  const perPerson = new Map<string, {
    login: string; name: string; mapped: boolean;
    commits: number; prs_opened: number; prs_merged: number;
    repos: Set<string>; last_active: string | null;
  }>();
  for (const r of rows) {
    const u = perPerson.get(r.github_login) ?? {
      login: r.github_login, name: display(r.github_login), mapped: isMapped(r.github_login),
      commits: 0, prs_opened: 0, prs_merged: 0, repos: new Set<string>(), last_active: null,
    };
    u.commits += r.commits; u.prs_opened += r.prs_opened; u.prs_merged += r.prs_merged;
    if (r.commits > 0 || r.prs_merged > 0) u.repos.add(r.repo_name);
    if (!u.last_active || r.activity_date > u.last_active) u.last_active = r.activity_date;
    perPerson.set(r.github_login, u);
  }
  const people = Array.from(perPerson.values())
    .map((p) => ({
      name: p.name, github_login: p.login, mapped: p.mapped,
      commits: p.commits, prs_opened: p.prs_opened, prs_merged: p.prs_merged,
      repos_touched: p.repos.size, last_active: p.last_active,
    }))
    .sort((a, b) => b.commits - a.commits);

  // ── Per-repo over the FULL window (every repo with activity) ──
  const perRepo = new Map<string, { commits: number; prs_merged: number; contribs: Map<string, number>; last_active: string | null }>();
  for (const r of rows) {
    const x = perRepo.get(r.repo_name) ?? { commits: 0, prs_merged: 0, contribs: new Map<string, number>(), last_active: null };
    x.commits += r.commits; x.prs_merged += r.prs_merged;
    if (r.commits > 0) x.contribs.set(r.github_login, (x.contribs.get(r.github_login) ?? 0) + r.commits);
    if ((r.commits > 0 || r.prs_merged > 0) && (!x.last_active || r.activity_date > x.last_active)) x.last_active = r.activity_date;
    perRepo.set(r.repo_name, x);
  }
  const repos = Array.from(perRepo.entries())
    .map(([repo, x]) => {
      const contributors = Array.from(x.contribs.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([login, c]) => ({ name: display(login), commits: c }));
      return {
        repo, commits: x.commits, prs_merged: x.prs_merged,
        contributor_count: contributors.length,
        contributors: contributors.slice(0, 8),
        last_active: x.last_active,
        bus_factor_risk: contributors.length <= 1 || (contributors[0] && contributors[0].commits / x.commits >= 0.8),
      };
    })
    .sort((a, b) => b.commits - a.commits);

  // ── Full repo registry (every repo in the org, incl. dormant + archived) ──
  const { data: registry } = await admin
    .from("connector_data_github_repos")
    .select("repo_name,is_private,is_archived,pushed_at")
    .eq("startup_id", startup_id);
  const all_repos = (registry ?? [])
    .map((r) => ({
      repo: r.repo_name, private: r.is_private, archived: r.is_archived,
      last_pushed: r.pushed_at ? (r.pushed_at as string).slice(0, 10) : null,
    }))
    .sort((a, b) => (b.last_pushed ?? "").localeCompare(a.last_pushed ?? ""));

  // ── Open PRs (in-flight) ──
  const { data: openPrs } = await admin
    .from("connector_data_github")
    .select("repo_name,author_login,title,created_at_source")
    .eq("startup_id", startup_id)
    .eq("record_type", "pull_request")
    .eq("state", "open")
    .order("created_at_source", { ascending: true })
    .limit(100);

  const now = Date.now();
  const open_prs = (openPrs ?? []).map((p) => ({
    repo: p.repo_name,
    author: display(p.author_login ?? "unknown"),
    title: p.title,
    age_days: p.created_at_source ? Math.round((now - Date.parse(p.created_at_source)) / 864e5) : null,
  }));

  return {
    window: { full_window_days: FULL_DAYS, momentum: "last 7 days vs prior 7 days" },
    totals: {
      full_window: {
        commits: sum(rows, "commits"),
        prs_opened: sum(rows, "prs_opened"),
        prs_merged: sum(rows, "prs_merged"),
        contributors: people.length,
        repos_with_activity: repos.filter((r) => r.commits > 0).length,
        repos_in_org: all_repos.length,
      },
      last_7d: {
        commits: sum(recent, "commits"),
        prs_merged: sum(recent, "prs_merged"),
        prs_opened: sum(recent, "prs_opened"),
        active_contributors: new Set(recent.filter((r) => r.commits > 0).map((r) => r.github_login)).size,
      },
      delta_7d_vs_prior_pct: {
        commits: pctDelta(sum(recent, "commits"), sum(prior, "commits")),
        prs_merged: pctDelta(sum(recent, "prs_merged"), sum(prior, "prs_merged")),
      },
    },
    people,
    repos,
    all_repos,
    open_prs,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { startup_id, question } = (await req.json()) as { startup_id: string; question: string };
    if (!startup_id || !question) throw new Error("startup_id and question are required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const snapshot = await buildSnapshot(admin, startup_id);

    const systemPrompt = `You are KAI, a pragmatic engineering-leadership analyst. You have a JSON snapshot of the team's GitHub activity over the FULL synced history (~180 days):
- "totals" — full-window totals, a last-7-days slice, and 7d-vs-prior-7d momentum deltas.
- "people" — EVERY contributor over the window with commits, PRs opened/merged, repos touched, and last_active. "mapped: false" means an unmapped GitHub handle (not yet linked to an employee).
- "repos" — EVERY repo with activity over the window, each with its full contributor breakdown (name + commits), prs_merged, last_active, and a bus_factor_risk flag.
- "all_repos" — the COMPLETE repo list in the org, including dormant and archived ones (with last_pushed).
- "open_prs" — all currently-open PRs with age_days.

Rules:
- Only cite numbers in the snapshot. Never invent data. You have the whole picture here — use "people"/"repos" for "who worked on what / how much", "all_repos" for the full inventory, "totals.last_7d" + deltas for momentum.
- Answer for two audiences: an eng lead (load balance, who's blocked, stuck PRs) and the CEO (are we shipping, is everyone contributing, risk).
- Flag risk concretely: stale open PRs (high age_days), bus_factor_risk repos, people with little/no recent activity, sharp momentum drops, dormant/archived repos that still matter.
- "commits" reflect default-branch activity; don't over-read raw counts as productivity — note nuance when relevant.
- When the user asks about a specific person or repo, scan the full "people"/"repos" arrays (not just the top entries).
- Be concise, markdown headers + bullets.

Snapshot:
\`\`\`json
${JSON.stringify(snapshot, null, 2)}
\`\`\``;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ ok: false, error: "Rate limited — try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ ok: false, error: "AI credits exhausted — contact your admin." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) throw new Error(`AI gateway ${aiRes.status}: ${(await aiRes.text()).slice(0, 200)}`);

    const aiJson = await aiRes.json();
    const answer = aiJson.choices?.[0]?.message?.content ?? "No answer returned.";
    return new Response(JSON.stringify({ ok: true, answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
