// Streaming client for the KAI edge functions.
//
// supabase.functions.invoke() buffers the whole response, so for streaming we
// fetch the function URL directly and read the SSE body incrementally. Every
// KAI function emits normalized events:  data: {"type":"text","text":"..."}
// terminated by  data: [DONE]  (see supabase/functions/_shared/kai-ai.ts).
//
// If the function replies with plain JSON (e.g. provider doesn't stream, or an
// error), we fall back to parsing it in one shot — callers always get the full
// answer string back.

import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export async function streamKaiFunction(
  fnName: string,
  body: Record<string, unknown>,
  onDelta: (fullTextSoFar: string, delta: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? SUPABASE_ANON_KEY;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ...body, stream: true }),
    signal,
  });

  const contentType = res.headers.get("content-type") ?? "";

  // Non-streaming reply (error payloads, or provider returned JSON)
  if (!contentType.includes("text/event-stream")) {
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      /* fall through */
    }
    if (!res.ok || json?.error) {
      throw new Error(json?.error ?? `KAI returned ${res.status}`);
    }
    const answer: string = json?.answer ?? "";
    if (answer) onDelta(answer, answer);
    return answer;
  }

  if (!res.body) throw new Error("KAI stream had no body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const evt of events) {
        const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        const payload = dataLine.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let json: any = null;
        try {
          json = JSON.parse(payload);
        } catch {
          continue; // partial/keepalive line
        }
        if (json.type === "text" && typeof json.text === "string") {
          full += json.text;
          onDelta(full, json.text);
        } else if (json.type === "error") {
          throw new Error(json.error ?? "KAI stream error");
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return full;
}
