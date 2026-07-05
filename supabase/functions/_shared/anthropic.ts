// Shared Anthropic Claude client for all KAI edge functions.
//
// Replaces the old Lovable AI gateway (ai.gateway.lovable.dev). All calls go
// straight to the Anthropic Messages API with ANTHROPIC_API_KEY from the edge
// function secrets. Default model: Claude Opus 4.8 with adaptive thinking.

export const CLAUDE_MODEL = "claude-opus-4-8";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export interface ClaudeCallOptions {
  system: string;
  /** User-turn content (the question, optionally with a data snapshot). */
  user: string;
  maxTokens?: number;
}

export type ClaudeResult =
  | { ok: true; answer: string }
  | { ok: false; status: number; error: string };

function apiKey(): string {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  return key;
}

function buildBody(opts: ClaudeCallOptions, stream: boolean) {
  return {
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    thinking: { type: "adaptive" },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    ...(stream ? { stream: true } : {}),
  };
}

/** Single-shot (non-streaming) Claude call. Returns the concatenated text blocks. */
export async function askClaude(opts: ClaudeCallOptions): Promise<ClaudeResult> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey(),
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(buildBody(opts, false)),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Anthropic API error:", res.status, text.slice(0, 500));
    if (res.status === 429) return { ok: false, status: 429, error: "Rate limited — try again in a moment." };
    if (res.status === 529) return { ok: false, status: 529, error: "Claude is overloaded — try again shortly." };
    return { ok: false, status: 500, error: `Claude API returned ${res.status}` };
  }

  const body = await res.json();
  const answer = body.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
  return { ok: true, answer: answer || "No insight available." };
}

/**
 * Streaming Claude call. Proxies Anthropic's SSE stream back to the browser as
 * a simplified SSE stream of `data: {"type":"text","text":"..."}` events,
 * terminated with `data: [DONE]`. Thinking deltas are dropped — only visible
 * text reaches the client.
 */
export async function streamClaude(
  opts: ClaudeCallOptions,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey(),
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-beta": "interleaved-thinking-2025-05-14",
      "content-type": "application/json",
    },
    body: JSON.stringify(buildBody(opts, true)),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    console.error("Anthropic stream error:", res.status, text.slice(0, 500));
    const msg = res.status === 429 ? "Rate limited — try again in a moment." : `Claude API returned ${res.status}`;
    return new Response(JSON.stringify({ error: msg }), {
      status: res.status === 429 ? 429 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
          // SSE events are separated by a blank line
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const evt of events) {
            const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            const payload = dataLine.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
                emit({ type: "text", text: json.delta.text });
              } else if (json.type === "error") {
                emit({ type: "error", error: json.error?.message ?? "stream error" });
              }
            } catch {
              /* partial/keepalive line — ignore */
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
