// Auto-sync orchestrator.
//
// Invoked two ways:
//   1. POST { startup_id: string, sources: ("youtube"|"slack"|"github")[] }
//      → syncs the given sources for that one startup.
//   2. POST with no/empty body (pg_cron every 3 hours)
//      → syncs ALL startups, ALL sources.
//
// Each connector sync is invoked SEQUENTIALLY (Supabase limits concurrent
// function invocations) and a row is written to sync_log after each one.
// "youtube" fans out into youtube-sync + youtube-analytics-sync, logged as
// two separate sources ("youtube", "youtube_analytics").

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Source = "youtube" | "slack" | "github";
const ALL_SOURCES: Source[] = ["github", "slack", "youtube"];

// Per-function wall-clock guard so one hung connector doesn't eat the whole run.
const PER_SYNC_TIMEOUT_MS = 150_000;

interface SyncOutcome {
  startup_id: string;
  source: string;
  status: "success" | "error";
  rows_touched: number;
  error: string | null;
}

// Best-effort extraction of "how many rows did this sync touch" from each
// connector's (differently shaped) response body.
function countRows(source: string, body: any): number {
  if (!body || typeof body !== "object") return 0;
  switch (source) {
    case "github":
      return (body.daily_rows ?? 0) + (body.records_upserted ?? 0);
    case "slack":
      return (
        (body.channel_stat_rows ?? 0) +
        (body.user_stat_rows ?? 0) +
        (body.message_rows ?? 0) +
        (body.attendance_rows ?? 0)
      );
    case "youtube": {
      const results = (body.results ?? []) as Array<{ videos_synced?: number }>;
      return results.reduce((acc, r) => acc + (r.videos_synced ?? 0), 0);
    }
    case "youtube_analytics": {
      const results = (body.results ?? []) as Array<Record<string, unknown>>;
      return results.reduce((acc, r) => {
        let n = 0;
        for (const [k, v] of Object.entries(r)) {
          if (k.endsWith("_upserted") && typeof v === "number") n += v;
        }
        return acc + n;
      }, 0);
    }
    default:
      return 0;
  }
}

async function invokeFn(
  supabaseUrl: string,
  serviceKey: string,
  fnName: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; body: any; error: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_SYNC_TIMEOUT_MS);
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      /* non-JSON body */
    }
    if (!res.ok || json?.ok === false || json?.error) {
      const msg = json?.error ?? `${fnName} returned ${res.status}`;
      return { ok: false, body: json, error: String(msg).slice(0, 500) };
    }
    return { ok: true, body: json, error: null };
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "AbortError" ? "timed out" : e.message) : "unknown";
    return { ok: false, body: null, error: msg.slice(0, 500) };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Body is optional — cron calls with {} or nothing.
    let requestedStartup: string | null = null;
    let requestedSources: Source[] | null = null;
    try {
      const body = await req.json();
      if (body?.startup_id) requestedStartup = String(body.startup_id);
      if (Array.isArray(body?.sources) && body.sources.length > 0) {
        requestedSources = body.sources.filter((s: string) =>
          ALL_SOURCES.includes(s as Source)
        ) as Source[];
      }
    } catch {
      /* empty body → full run */
    }

    // Resolve startups in scope
    let startupIds: string[];
    if (requestedStartup) {
      startupIds = [requestedStartup];
    } else {
      const { data: startups, error } = await admin.from("startups").select("id, status");
      if (error) throw new Error(`startups read failed: ${error.message}`);
      // "Active" = anything not archived/inactive; the status column is a
      // free-form health string (healthy/at-risk/critical), so exclude only
      // explicitly disabled values.
      startupIds = (startups ?? [])
        .filter((s) => !["archived", "inactive", "disabled"].includes(String(s.status)))
        .map((s) => s.id as string);
    }

    const sources = requestedSources ?? ALL_SOURCES;
    const synced: SyncOutcome[] = [];
    const errors: SyncOutcome[] = [];

    for (const startupId of startupIds) {
      // (source label, edge function name) pairs — youtube fans out into two.
      const jobs: Array<[string, string]> = [];
      for (const s of sources) {
        if (s === "github") jobs.push(["github", "github-sync"]);
        if (s === "slack") jobs.push(["slack", "slack-sync"]);
        if (s === "youtube") {
          jobs.push(["youtube", "youtube-sync"]);
          jobs.push(["youtube_analytics", "youtube-analytics-sync"]);
        }
      }

      for (const [source, fnName] of jobs) {
        const startedAt = new Date().toISOString();
        const result = await invokeFn(supabaseUrl, serviceKey, fnName, {
          startup_id: startupId,
        });
        const finishedAt = new Date().toISOString();

        const outcome: SyncOutcome = {
          startup_id: startupId,
          source,
          status: result.ok ? "success" : "error",
          rows_touched: countRows(source, result.body),
          error: result.error,
        };
        (result.ok ? synced : errors).push(outcome);

        const { error: logErr } = await admin.from("sync_log").insert({
          startup_id: startupId,
          source,
          started_at: startedAt,
          finished_at: finishedAt,
          status: outcome.status,
          rows_touched: outcome.rows_touched,
          error: outcome.error,
        });
        if (logErr) console.error("sync_log insert failed:", logErr.message);
      }
    }

    return new Response(JSON.stringify({ ok: true, synced, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
