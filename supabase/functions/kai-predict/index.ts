import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { issueTitle, kpiData, role, startupName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are KAI — a predictive intelligence engine for a startup portfolio OS.
You analyze KPI trends, issue severity, and time progression to predict future outcomes.

RULES:
- Be numerical and specific. No fluff.
- Predictions must include concrete numbers (percentages, days, dollar amounts).
- Timeframes must be specific (7 days, 14 days, 30 days).
- Confidence must reflect data quality: High = strong trend data, Medium = partial signals, Low = extrapolation.
- Always provide at least 2 predictions per issue.
- Include one "if no action" scenario and one "if action taken" scenario.`;

    const userPrompt = `Analyze this issue and generate predictive intelligence:

Issue: ${issueTitle}
Startup: ${startupName || "Portfolio-wide"}
Role context: ${role || "founder"}
${kpiData ? `Current KPI data:\n${kpiData}` : ""}

Generate predictions about what will happen if no action is taken, and what happens with intervention.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_predictions",
              description: "Generate structured predictive intelligence for a startup issue.",
              parameters: {
                type: "object",
                properties: {
                  predictions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        prediction: {
                          type: "string",
                          description: "Clear, numerical prediction statement. E.g. 'Retention may drop another 8-12% in 14 days'",
                        },
                        timeframe: {
                          type: "string",
                          description: "Specific timeframe. E.g. '7 days', '14 days', '30 days'",
                        },
                        confidence: {
                          type: "string",
                          enum: ["High", "Medium", "Low"],
                        },
                        scenario: {
                          type: "string",
                          enum: ["no_action", "with_action"],
                          description: "Whether this prediction assumes no intervention or active intervention",
                        },
                      },
                      required: ["prediction", "timeframe", "confidence", "scenario"],
                      additionalProperties: false,
                    },
                  },
                  riskLevel: {
                    type: "string",
                    enum: ["critical", "high", "medium", "low"],
                    description: "Overall risk level if no action is taken",
                  },
                  recommendedAction: {
                    type: "string",
                    description: "Single most impactful action to take. One sentence.",
                  },
                },
                required: ["predictions", "riskLevel", "recommendedAction"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_predictions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "No predictions generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kai-predict error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
