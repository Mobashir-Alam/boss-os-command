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

async function buildSnapshot(admin: ReturnType<typeof createClient>, startup_id: string) {
  const dstr = (d: Date) => d.toISOString().slice(0, 10);
  const nAgo = (n: number) => dstr(new Date(Date.now() - n * 864e5));
  const recentStart = nAgo(7);
  const baselineStart = nAgo(14);

  const { data: daily } = await admin
    .from("connector_data_github_daily")
    .select("github_login,repo_name,activity_date,commits,prs_opened,prs_merged")
    .eq("startup_id", startup_id)
    .gte("activity_date", nAgo(28));

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

  const rows = daily ?? [];
  const sum = (rs: typeof rows, f: "commits" | "prs_opened" | "prs_merged") =>
    rs.reduce((s, r) => s + (r[f] as number), 0);

  const recent = rows.filter((r) => r.activity_date >= recentStart);
  const baseline = rows.filter((r) => r.activity_date >= baselineStart && r.activity_date < recentStart);

  // Per-person (last 7d)
  const perPerson = new Map<string, { name: string; commits: number; prs_merged: number; repos: Set<string> }>();
  for (const r of recent) {
    const u = perPerson.get(r.github_login) ?? { name: display(r.github_login), commits: 0, prs_merged: 0, repos: new Set<string>() };
    u.commits += r.commits;
    u.prs_merged += r.prs_merged;
    if (r.commits > 0 || r.prs_merged > 0) u.repos.add(r.repo_name);
    perPerson.set(r.github_login, u);
  }
  const people = Array.from(perPerson.values())
    .map((p) => ({ name: p.name, commits: p.commits, prs_merged: p.prs_merged, repos_touched: p.repos.size }))
    .sort((a, b) => b.commits - a.commits);

  // Per-repo (last 7d)
  const perRepo = new Map<string, { commits: number; contributors: Set<string> }>();
  for (const r of recent) {
    const x = perRepo.get(r.repo_name) ?? { commits: 0, contributors: new Set<string>() };
    x.commits += r.commits;
    if (r.commits > 0) x.contributors.add(r.github_login);
    perRepo.set(r.repo_name, x);
  }
  const repos = Array.from(perRepo.entries())
    .map(([name, x]) => ({ repo: name, commits: x.commits, contributors: x.contributors.size }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 15);

  // Open PRs (in-flight)
  const { data: openPrs } = await admin
    .from("connector_data_github")
    .select("repo_name,author_login,title,created_at_source")
    .eq("startup_id", startup_id)
    .eq("record_type", "pull_request")
    .eq("state", "open")
    .order("created_at_source", { ascending: true })
    .limit(30);

  const now = Date.now();
  const open_prs = (openPrs ?? []).map((p) => ({
    repo: p.repo_name,
    author: display(p.author_login ?? "unknown"),
    title: p.title,
    age_days: p.created_at_source ? Math.round((now - Date.parse(p.created_at_source)) / 864e5) : null,
  }));

  return {
    window: { recent_days: 7, baseline: "prior 7d" },
    totals_7d: {
      commits: sum(recent, "commits"),
      prs_merged: sum(recent, "prs_merged"),
      prs_opened: sum(recent, "prs_opened"),
      active_contributors: new Set(recent.filter((r) => r.commits > 0).map((r) => r.github_login)).size,
    },
    delta_vs_prior_7d_pct: {
      commits: pctDelta(sum(recent, "commits"), sum(baseline, "commits")),
      prs_merged: pctDelta(sum(recent, "prs_merged"), sum(baseline, "prs_merged")),
    },
    people,
    repos,
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

    const systemPrompt = `You are KAI, a pragmatic engineering-leadership analyst. You have a JSON snapshot of the team's GitHub activity for the last 7 days vs the prior 7-day baseline (commits, PRs, per-person, per-repo, open PRs with age).

Rules:
- Only cite numbers in the snapshot. Never invent data.
- Answer for two audiences: an eng lead (load balance, who's blocked, stuck PRs) and the CEO (are we shipping, is everyone contributing, risk).
- Flag risk concretely: stale open PRs (high age_days), repos with a single contributor (bus factor), people with zero activity, sharp drops vs baseline.
- "commits" reflect default-branch activity in the window; don't over-read raw counts as productivity — note nuance when relevant.
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
