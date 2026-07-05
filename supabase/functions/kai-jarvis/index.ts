// KAI Jarvis Mode — a navigating, explaining, person-aware assistant.
//
// Body: {
//   question: string,
//   mode: "navigate" | "explain" | "person" | "general",
//   currentRoute?: string,
//   pageContext?: string,       // description of the current page (frontend map)
//   personName?: string,
//   startupId: string
// }
//
// Capabilities:
//   A) NAVIGATE — returns { action: { action: "navigate", route } } alongside
//      the text answer when the question shows intent to open a page.
//   B) EXPLAIN PAGE — uses the injected page context for a short walkthrough.
//   C) PERSON LOOKUP — resolves a name → employee_connector_links, summarizes
//      their last 7 days of GitHub work (or Slack attendance as fallback).
//
// AI provider: _shared/kai-ai.ts (Lovable Gemini today; Claude Opus 4.8 once
// ANTHROPIC_API_KEY is configured — no code change needed).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { askAI } from "../_shared/kai-ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Navigation catalog — route + what lives there. Mirrors src/lib/pageContext.ts.
const ROUTES: Array<{ route: string; description: string }> = [
  { route: "/", description: "CEO Command Center — cross-source strategic view (YouTube + Slack + GitHub)" },
  { route: "/team/social-media", description: "YouTube analytics dashboard (channels, videos, views, retention, cohort, revenue)" },
  { route: "/team/slack", description: "Slack Team Ops dashboard (attendance check-ins, monthly sheet, channels, people, engagement)" },
  { route: "/team/github", description: "GitHub engineering dashboard (commits, PRs, contributors, repos)" },
  { route: "/people", description: "People OS — employee roster, roles, KPIs, connector links" },
  { route: "/employee", description: "Employee dashboard — the logged-in person's projects, tasks, and activity" },
  { route: "/finances", description: "CFO / finance dashboard" },
  { route: "/my-work", description: "My Work — personal task board" },
  { route: "/inbox", description: "Inbox — notifications" },
];

interface RequestBody {
  question: string;
  mode?: "navigate" | "explain" | "person" | "general";
  currentRoute?: string;
  pageContext?: string;
  personName?: string;
  startupId: string;
}

// ── Person lookup ───────────────────────────────────────────────────────────

interface PersonData {
  found: boolean;
  name: string;
  github_login: string | null;
  slack_user_id: string | null;
  github_summary: string | null;
  slack_summary: string | null;
  note: string | null;
}

async function lookupPerson(
  admin: ReturnType<typeof createClient>,
  startupId: string,
  rawName: string
): Promise<PersonData> {
  const name = rawName.trim();
  const notFound: PersonData = {
    found: false, name, github_login: null, slack_user_id: null,
    github_summary: null, slack_summary: null,
    note: `No employee matching "${name}" was found in People OS.`,
  };
  if (!name) return notFound;

  // Resolve name → person (first/partial name match)
  const { data: people } = await admin
    .from("people")
    .select("id, full_name")
    .ilike("full_name", `%${name}%`)
    .limit(5);
  const person = (people ?? [])[0];
  if (!person) return notFound;

  // person → connector links
  const { data: link } = await admin
    .from("employee_connector_links")
    .select("github_login, slack_user_id")
    .eq("person_id", person.id)
    .maybeSingle();

  const sinceDate = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const result: PersonData = {
    found: true,
    name: person.full_name as string,
    github_login: (link?.github_login as string) ?? null,
    slack_user_id: (link?.slack_user_id as string) ?? null,
    github_summary: null,
    slack_summary: null,
    note: link ? null : `${person.full_name} has no linked Slack/GitHub accounts yet (link them in People OS).`,
  };

  if (result.github_login) {
    const { data: daily } = await admin
      .from("connector_data_github_daily")
      .select("repo_name, activity_date, commits, prs_opened, prs_merged, additions, deletions")
      .eq("startup_id", startupId)
      .eq("github_login", result.github_login)
      .gte("activity_date", sinceDate)
      .order("activity_date", { ascending: true });
    const rows = daily ?? [];
    const total = (f: string) => rows.reduce((s, r: any) => s + Number(r[f] ?? 0), 0);
    const repos = Array.from(new Set(rows.map((r: any) => r.repo_name)));
    result.github_summary = JSON.stringify({
      window: "last 7 days",
      commits: total("commits"),
      prs_opened: total("prs_opened"),
      prs_merged: total("prs_merged"),
      additions: total("additions"),
      deletions: total("deletions"),
      repos_touched: repos,
      per_day: rows.map((r: any) => ({
        date: r.activity_date, repo: r.repo_name, commits: r.commits,
        prs_opened: r.prs_opened, prs_merged: r.prs_merged,
      })),
    });
  }

  if (result.slack_user_id) {
    const { data: att } = await admin
      .from("slack_daily_attendance")
      .select("work_date, checked_in, check_in_time, posted_update, was_active, message_count")
      .eq("startup_id", startupId)
      .eq("user_id_source", result.slack_user_id)
      .gte("work_date", sinceDate)
      .order("work_date", { ascending: true });
    const rows = att ?? [];
    result.slack_summary = JSON.stringify({
      window: "last 7 days",
      days_seen: rows.length,
      checked_in_days: rows.filter((r: any) => r.checked_in).length,
      active_days: rows.filter((r: any) => r.was_active).length,
      update_days: rows.filter((r: any) => r.posted_update).length,
      per_day: rows,
    });
  }

  return result;
}

// Heuristic: pull a candidate person name out of "what did X do" / "tell me about X"
function extractPersonName(question: string): string | null {
  const patterns = [
    /what (?:did|has|have|is|was) ([a-z][a-z .'-]{1,40}?) (?:do|done|been|doing|up to|working)/i,
    /tell me about ([a-z][a-z .'-]{1,40}?)(?:\?|$|'s)/i,
    /how (?:is|was|active is) ([a-z][a-z .'-]{1,40}?) (?:doing|performing|this)/i,
  ];
  for (const p of patterns) {
    const m = question.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

// Extract a strict-JSON payload from the model's reply (may be fenced).
function parseModelJson(raw: string): { answer: string; action: { action: string; route: string } | null } {
  const fallback = { answer: raw.trim(), action: null };
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return fallback;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    if (typeof parsed?.answer !== "string") return fallback;
    const action =
      parsed.action && parsed.action.action === "navigate" && typeof parsed.action.route === "string"
        ? { action: "navigate", route: parsed.action.route }
        : null;
    return { answer: parsed.answer, action };
  } catch {
    return fallback;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    if (!body.question?.trim() || !body.startupId) {
      return new Response(JSON.stringify({ error: "question and startupId are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const mode = body.mode ?? "general";
    const question = body.question.trim();

    // Person data — explicit personName, person mode, or heuristic match
    let personData: PersonData | null = null;
    const candidateName =
      body.personName?.trim() || (mode === "person" || mode === "general" ? extractPersonName(question) : null);
    if (candidateName) {
      personData = await lookupPerson(admin, body.startupId, candidateName);
    }

    const routeCatalog = ROUTES.map((r) => `- ${r.route} — ${r.description}`).join("\n");
    const contextParts: string[] = [];
    if (body.currentRoute) {
      contextParts.push(`The user is currently on route: ${body.currentRoute}`);
    }
    if (body.pageContext) {
      contextParts.push(`Current page shows: ${body.pageContext}`);
    }
    if (personData) {
      contextParts.push(
        `PERSON LOOKUP for "${candidateName}": ${JSON.stringify({
          found: personData.found,
          name: personData.name,
          github_linked: !!personData.github_login,
          slack_linked: !!personData.slack_user_id,
          note: personData.note,
          github_last_7d: personData.github_summary ? JSON.parse(personData.github_summary) : null,
          slack_attendance_last_7d: personData.slack_summary ? JSON.parse(personData.slack_summary) : null,
        })}`
      );
    }

    const systemPrompt = `You are KAI in Jarvis Mode — a navigating, explaining assistant inside the Founder OS dashboard.

AVAILABLE PAGES (for navigation):
${routeCatalog}

${contextParts.length > 0 ? `CONTEXT:\n${contextParts.join("\n\n")}\n` : ""}
YOU MUST respond with ONLY a JSON object (no markdown fences, no prose outside it):
{
  "answer": "<your reply — plain text, concise>",
  "action": { "action": "navigate", "route": "<route>" } | null
}

Rules:
- Requested mode: ${mode}.
- If the user's question shows intent to SEE or OPEN a page ("show me YouTube", "open GitHub", "go to Slack attendance"), set action to navigate with the best-matching route from the catalog and keep the answer to one short confirming sentence.
- If the user asks to explain the current page ("explain this page", "what does this show"), give a 3-5 sentence walkthrough using the page context. action = null.
- If PERSON LOOKUP data is present, summarize what that person did in the last 7 days using the actual numbers (commits, PRs, repos). If GitHub isn't linked, say so and summarize their Slack attendance instead. If neither is linked, say their accounts aren't linked yet and suggest linking them in People OS. action = null (unless they also asked to open a page).
- Otherwise answer normally as a sharp, minimal operations copilot. action = null.
- Never invent routes or numbers.`;

    const result = await askAI({ system: systemPrompt, user: question, maxTokens: 1024 });
    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = parseModelJson(result.answer);
    // Guard: only allow navigation to known routes
    if (parsed.action && !ROUTES.some((r) => r.route === parsed.action!.route)) {
      parsed.action = null;
    }

    return new Response(JSON.stringify({ ok: true, answer: parsed.answer, action: parsed.action }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kai-jarvis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
