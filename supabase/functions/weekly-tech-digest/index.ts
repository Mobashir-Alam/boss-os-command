import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generates a 1-paragraph "this week in tech" digest from the last 7 days of:
//   - completed project_tasks
//   - solved bugs
//   - merged GitHub PRs (if synced)
//   - bug comments / project chat activity
// Calls KAI for the summary, then writes a kai_insights row that the
// Tech Team dashboard pulls in.

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { startup_id } = await req.json();
    if (!startup_id) {
      return new Response(JSON.stringify({ error: "startup_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const since = new Date(Date.now() - 7 * 864e5).toISOString();

    // Pull the week's activity in parallel
    const [tasksRes, bugsRes, prsRes, commentsRes, profilesRes] = await Promise.all([
      supabase
        .from("project_tasks")
        .select("id, title, assignee_profile, project_id, projects(title)")
        .eq("status", "done")
        .gte("updated_at", since),
      supabase
        .from("bugs")
        .select("id, title, type, area, assignee_profile, solved_at")
        .eq("status", "solved")
        .gte("solved_at", since),
      supabase
        .from("connector_data_github")
        .select("title, repo_name, author_login, merged_at_source")
        .eq("record_type", "pull_request")
        .eq("state", "merged")
        .gte("merged_at_source", since),
      supabase
        .from("bug_comments")
        .select("id, author_id")
        .gte("created_at", since)
        .is("deleted_at", null),
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("department", "tech"),
    ]);

    const tasks = tasksRes.data ?? [];
    const bugs = bugsRes.data ?? [];
    const prs = prsRes.data ?? [];
    const comments = commentsRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const profileNameById = new Map<string, string>();
    profiles.forEach((p: any) => profileNameById.set(p.id, p.full_name ?? "Unknown"));

    // Per-person tally
    const perPerson: Record<string, { tasks: number; bugs: number; comments: number }> = {};
    const bump = (id: string | null, key: "tasks" | "bugs" | "comments") => {
      if (!id) return;
      perPerson[id] ||= { tasks: 0, bugs: 0, comments: 0 };
      perPerson[id][key] += 1;
    };
    tasks.forEach((t: any) => bump(t.assignee_profile, "tasks"));
    bugs.forEach((b: any) => bump(b.assignee_profile, "bugs"));
    comments.forEach((c: any) => bump(c.author_id, "comments"));

    const perPersonText = Object.entries(perPerson)
      .map(([id, c]) => {
        const name = profileNameById.get(id) ?? "Unknown";
        const parts = [];
        if (c.tasks) parts.push(`${c.tasks} task${c.tasks > 1 ? "s" : ""}`);
        if (c.bugs) parts.push(`${c.bugs} bug${c.bugs > 1 ? "s" : ""}`);
        if (c.comments) parts.push(`${c.comments} comment${c.comments > 1 ? "s" : ""}`);
        return `- ${name}: ${parts.join(", ")}`;
      })
      .join("\n");

    const context = `
WEEK ENDING: ${new Date().toISOString().split("T")[0]}

TOTALS:
- Tasks completed: ${tasks.length}
- Bugs solved: ${bugs.length}
- PRs merged: ${prs.length}
- Comments / discussion posts: ${comments.length}
- Active contributors: ${Object.keys(perPerson).length} of ${profiles.length} tech members

TASKS COMPLETED:
${tasks.slice(0, 15).map((t: any) => `- ${t.title} (${(t as any).projects?.title ?? "—"})`).join("\n") || "(none)"}

BUGS SOLVED:
${bugs.slice(0, 15).map((b: any) => `- [${b.type}] ${b.title}`).join("\n") || "(none)"}

PRs MERGED:
${prs.slice(0, 15).map((p: any) => `- ${p.title} (${p.repo_name}) by ${p.author_login ?? "?"}`).join("\n") || "(none synced this week)"}

PER-PERSON BREAKDOWN:
${perPersonText || "(no individual activity)"}
`;

    // Ask KAI for the summary
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You write a Friday-afternoon "this week in tech" digest for a startup tech team and CEO. RULES:
- 3-5 sentences max. Punchy, specific, recognise wins.
- Mention real names and counts when they stand out.
- Lead with the strongest signal (most-shipped person, biggest ship, hardest fix).
- Don't pad. Don't moralise. Don't say "great work team!" — just state what shipped.
- If activity is low, say so plainly without sugarcoating.`,
          },
          { role: "user", content: context },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway error ${aiRes.status}: ${t}`);
    }
    const aiBody = await aiRes.json();
    const summary = aiBody.choices?.[0]?.message?.content?.trim() || "Week summary unavailable.";

    // Write the insight (expires in 8 days so the next Friday's run replaces it)
    const today = new Date();
    const dateLabel = today.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const expiresAt = new Date(Date.now() + 8 * 864e5).toISOString();

    const { data: inserted, error: insertErr } = await supabase
      .from("kai_insights")
      .insert({
        startup_id,
        department_key: "tech",
        insight_type: "summary",
        title: `Tech Week — ${dateLabel}`,
        body: summary,
        confidence: "medium",
        data_sources: ["project_tasks", "bugs", "connector_data_github", "bug_comments"],
        expires_at: expiresAt,
      } as any)
      .select()
      .single();

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        totals: {
          tasks: tasks.length,
          bugs: bugs.length,
          prs: prs.length,
          comments: comments.length,
          contributors: Object.keys(perPerson).length,
        },
        insight_id: inserted?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("weekly-tech-digest error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
