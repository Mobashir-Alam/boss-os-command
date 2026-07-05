// Provider-agnostic AI helper for every KAI edge function.
//
// TODAY: all KAI calls go through the Lovable AI gateway (Gemini) with
// LOVABLE_API_KEY — the user does not have an Anthropic API key yet, so the
// provider must NOT change.
//
// LATER: the moment ANTHROPIC_API_KEY is added to the edge function secrets,
// this helper automatically routes to Claude Opus 4.8 (see ./anthropic.ts) —
// no code changes needed. Until then it is Lovable-only.
//
// Both providers are normalized to the same interfaces:
//   askAI({system, user, maxTokens})            → { ok, answer } | { ok:false, status, error }
//   streamAI({system, user, maxTokens}, cors)   → SSE Response of
//        data: {"type":"text","text":"..."}  events, terminated by  data: [DONE]

import { askClaude, streamClaude, type ClaudeCallOptions, type ClaudeResult } from "./anthropic.ts";

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_MODEL = "google/gemini-3-flash-preview";

export type AiCallOptions = ClaudeCallOptions;
export type AiResult = ClaudeResult;

function useAnthropic(): boolean {
  return !!Deno.env.get("ANTHROPIC_API_KEY");
}

function lovableKey(): string {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return key;
}

// ── Non-streaming ───────────────────────────────────────────────────────────

export async function askAI(opts: AiCallOptions): Promise<AiResult> {
  if (useAnthropic()) return askClaude(opts);

  const res = await fetch(LOVABLE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: LOVABLE_MODEL,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("AI gateway error:", res.status, text.slice(0, 300));
    if (res.status === 429) return { ok: false, status: 429, error: "Rate limited. Try again shortly." };
    if (res.status === 402) return { ok: false, status: 402, error: "AI credits exhausted. Add funds in Settings." };
    return { ok: false, status: 500, error: `AI gateway returned ${res.status}` };
  }

  const body = await res.json();
  const answer = body.choices?.[0]?.message?.content ?? "";
  return { ok: true, answer: answer || "No insight available." };
}

// ── Streaming (SSE) ─────────────────────────────────────────────────────────

export async function streamAI(
  opts: AiCallOptions,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (useAnthropic()) return streamClaude(opts, corsHeaders);

  const res = await fetch(LOVABLE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: LOVABLE_MODEL,
      stream: true,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    console.error("AI gateway stream error:", res.status, text.slice(0, 300));
    const msg =
      res.status === 429
        ? "Rate limited. Try again shortly."
        : res.status === 402
          ? "AI credits exhausted. Add funds in Settings."
          : `AI gateway returned ${res.status}`;
    return new Response(JSON.stringify({ error: msg }), {
      status: res.status === 429 || res.status === 402 ? res.status : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Proxy the OpenAI-compatible SSE stream, normalizing each chunk to
  // {"type":"text","text": "..."} so the frontend parser is provider-agnostic.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const upstream = res.body;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      let buffer = "";
      const emit = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                emit({ type: "text", text: delta });
              }
            } catch {
              /* partial line — wait for more bytes */
            }
          }
        }
      } catch (e) {
        emit({ type: "error", error: e instanceof Error ? e.message : "stream failed" });
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
