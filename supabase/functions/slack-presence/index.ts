// Slack live presence
//
// Body: { startup_id: string }
// Reads the synced (non-bot) roster, calls users.getPresence for each, and
// returns a live online/away map. Presence is noisy ("active" = a connected,
// non-idle Slack client, not "working"), so the UI treats this as a garnish
// on top of the real check-in signal — hence on-demand, not stored.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SLACK_API = "https://slack.com/api";
const PRESENCE_CONCURRENCY = 8;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getPresence(
  token: string,
  userId: string
): Promise<"active" | "away" | "unknown"> {
  try {
    const url = new URL(`${SLACK_API}/users.getPresence`);
    url.searchParams.set("user", userId);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { ok?: boolean; presence?: string };
    if (!data.ok) return "unknown";
    return data.presence === "active" ? "active" : "away";
  } catch {
    return "unknown";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("SLACK_BOT_TOKEN");
    if (!token) throw new Error("SLACK_BOT_TOKEN secret not set");

    const { startup_id } = (await req.json()) as { startup_id: string };
    if (!startup_id) throw new Error("startup_id required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: users } = await admin
      .from("connector_data_slack_users")
      .select("user_id_source")
      .eq("startup_id", startup_id)
      .eq("is_bot", false);

    const ids = (users ?? []).map((u) => u.user_id_source as string);
    const presence: Record<string, string> = {};

    // Process in small concurrent batches — users.getPresence is rate-limited.
    for (let i = 0; i < ids.length; i += PRESENCE_CONCURRENCY) {
      const batch = ids.slice(i, i + PRESENCE_CONCURRENCY);
      const results = await Promise.all(
        batch.map((id) => getPresence(token, id))
      );
      batch.forEach((id, j) => {
        presence[id] = results[j];
      });
      if (i + PRESENCE_CONCURRENCY < ids.length) await sleep(300);
    }

    const active_count = Object.values(presence).filter((p) => p === "active").length;

    return new Response(
      JSON.stringify({ ok: true, presence, active_count, checked_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
