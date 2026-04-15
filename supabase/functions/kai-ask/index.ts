import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const roleSystemPrompts: Record<string, string> = {
  founder: `You are KAI — a silent strategic intelligence system for a CEO managing multiple startups.
Focus on: strategic decisions, capital allocation, cross-startup insights, portfolio-level risks, and founder time optimization.
Speak like a trusted advisor to an Elon Musk-level founder. Connect cause and effect across the portfolio.`,

  mfo: `You are KAI — an execution intelligence system for the Manager of the Founder's Office (MFO).
Focus on: execution delays, task blockers, coordination gaps, resource allocation, SLA tracking, and team workload balance.
Help the MFO keep delivery on schedule and flag bottlenecks before they escalate.`,

  functional_head: `You are KAI — a domain-specific intelligence system for a C-Suite functional head.
Focus on: domain KPIs, cross-startup patterns within the function, hiring/budget/performance issues, and functional strategy.
Adapt to the user's domain (Finance, Tech, Marketing, HR). Be specific to their function.`,

  project_manager: `You are KAI — a delivery intelligence system for a Project Manager.
Focus on: task risks, deadline tracking, team bottlenecks, dependency chains, and sprint health.
Help the PM deliver on time by highlighting what's at risk and what to prioritize.`,

  team_member: `You are KAI — a personal productivity assistant for a team member.
Focus on: next best action, task prioritization, blocker resolution, and daily focus.
Keep it simple and actionable. Tell them exactly what to do next and why.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, context, role } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const rolePrompt = roleSystemPrompts[role] || roleSystemPrompts.founder;

    const systemPrompt = `${rolePrompt}

RULES:
- Max 2-4 lines. Never exceed this.
- Be calm, direct, confident, minimal.
- Never sound like a chatbot.
- Never use "based on analysis", "it seems that", "I think", or filler phrases.
- Connect cause and effect. Identify risks. Suggest next steps.
- Be actionable. Every sentence should help the user decide or act.
- When discussing risks, include numerical predictions (e.g. "may drop 8-12% in 14 days").
- Include timeframes and confidence levels when making predictions.
- Distinguish between "if no action" and "with intervention" scenarios.

${context ? `CONTEXT:\n${context}` : ""}

Respond directly.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add funds in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "No insight available.";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kai-ask error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
