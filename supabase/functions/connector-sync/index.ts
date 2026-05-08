import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── GitHub sync ──────────────────────────────────────────────────────────────

async function syncGitHub(
  supabase: ReturnType<typeof createClient>,
  startupId: string,
  credentials: { token: string; org: string }
): Promise<{ recordsUpserted: number; metricsWritten: number }> {
  const { token, org } = credentials;
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "BossOS-Connector/1.0",
  };

  let recordsUpserted = 0;

  // Fetch open PRs across the org
  const prsRes = await fetch(
    `https://api.github.com/search/issues?q=type:pr+org:${org}+state:open&per_page=50&sort=updated`,
    { headers }
  );
  if (!prsRes.ok) {
    const msg = await prsRes.text();
    throw new Error(`GitHub API ${prsRes.status}: ${msg}`);
  }
  const prsBody = await prsRes.json();
  const openPRs = prsBody.items ?? [];

  // Fetch recently merged PRs (last 7 days)
  const since7d = new Date(Date.now() - 7 * 864e5).toISOString();
  const mergedRes = await fetch(
    `https://api.github.com/search/issues?q=type:pr+org:${org}+state:closed+merged:>=${since7d.split("T")[0]}&per_page=50`,
    { headers }
  );
  const mergedBody = mergedRes.ok ? await mergedRes.json() : { items: [] };
  const mergedPRs = mergedBody.items ?? [];

  const allPRs = [...openPRs, ...mergedPRs];

  if (allPRs.length > 0) {
    const rows = allPRs.map((pr: any) => ({
      startup_id: startupId,
      record_type: "pull_request",
      external_id: String(pr.number),
      repo_name: pr.repository_url?.split("/").slice(-1)[0] ?? "unknown",
      author_login: pr.user?.login ?? null,
      title: pr.title,
      state: pr.pull_request?.merged_at ? "merged" : pr.state,
      body: pr.body ?? null,
      labels: (pr.labels ?? []).map((l: any) => l.name),
      created_at_source: pr.created_at ?? null,
      updated_at_source: pr.updated_at ?? null,
      closed_at_source: pr.closed_at ?? null,
      merged_at_source: pr.pull_request?.merged_at ?? null,
      raw_payload: pr,
    }));

    const { error } = await supabase
      .from("connector_data_github")
      .upsert(rows, { onConflict: "startup_id,record_type,external_id" });
    if (error) throw new Error(`DB upsert error: ${error.message}`);
    recordsUpserted += rows.length;
  }

  // Metrics
  const today = new Date().toISOString().split("T")[0];
  const metricRows = [
    {
      startup_id: startupId,
      connector_type: "github",
      department_key: "tech",
      metric_name: "open_prs",
      metric_value: openPRs.length,
      period_start: today,
      period_end: today,
      granularity: "daily",
    },
    {
      startup_id: startupId,
      connector_type: "github",
      department_key: "tech",
      metric_name: "merged_prs_7d",
      metric_value: mergedPRs.length,
      period_start: today,
      period_end: today,
      granularity: "daily",
    },
    {
      startup_id: startupId,
      connector_type: "github",
      department_key: "tech",
      metric_name: "active_contributors_7d",
      metric_value: new Set(mergedPRs.map((pr: any) => pr.user?.login).filter(Boolean)).size,
      period_start: today,
      period_end: today,
      granularity: "daily",
    },
  ];

  await supabase
    .from("metrics")
    .upsert(metricRows, { onConflict: "startup_id,connector_type,metric_name,period_start,granularity" });

  return { recordsUpserted, metricsWritten: metricRows.length };
}

// ─── Slack sync ───────────────────────────────────────────────────────────────

async function syncSlack(
  supabase: ReturnType<typeof createClient>,
  startupId: string,
  credentials: { token: string; channel_ids: string[] }
): Promise<{ recordsUpserted: number; metricsWritten: number }> {
  const { token, channel_ids } = credentials;
  const headers = { Authorization: `Bearer ${token}` };
  let recordsUpserted = 0;
  const oldest = String(Math.floor((Date.now() - 7 * 864e5) / 1000));

  for (const channelId of channel_ids) {
    // Get channel info
    const infoRes = await fetch(
      `https://slack.com/api/conversations.info?channel=${channelId}`,
      { headers }
    );
    const info = infoRes.ok ? await infoRes.json() : {};
    const channelName = info.channel?.name ?? channelId;

    // Get messages
    const histRes = await fetch(
      `https://slack.com/api/conversations.history?channel=${channelId}&oldest=${oldest}&limit=200`,
      { headers }
    );
    if (!histRes.ok) continue;
    const hist = await histRes.json();
    if (!hist.ok) continue;
    const messages = hist.messages ?? [];

    const rows = messages
      .filter((m: any) => m.type === "message" && !m.subtype)
      .map((m: any) => ({
        startup_id: startupId,
        channel_id: channelId,
        channel_name: channelName,
        message_ts: m.ts,
        user_id_source: m.user ?? null,
        text: m.text ?? null,
        thread_ts: m.thread_ts !== m.ts ? (m.thread_ts ?? null) : null,
        reaction_count: (m.reactions ?? []).reduce((acc: number, r: any) => acc + r.count, 0),
        reply_count: m.reply_count ?? 0,
        has_files: !!(m.files?.length),
        message_date: new Date(parseFloat(m.ts) * 1000).toISOString().split("T")[0],
        raw_payload: m,
      }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from("connector_data_slack")
        .upsert(rows, { onConflict: "startup_id,channel_id,message_ts" });
      if (!error) recordsUpserted += rows.length;
    }
  }

  // Metrics
  const today = new Date().toISOString().split("T")[0];
  await supabase.from("metrics").upsert(
    [
      {
        startup_id: startupId,
        connector_type: "slack",
        department_key: "tech",
        metric_name: "slack_messages_7d",
        metric_value: recordsUpserted,
        period_start: today,
        period_end: today,
        granularity: "daily",
      },
    ],
    { onConflict: "startup_id,connector_type,metric_name,period_start,granularity" }
  );

  return { recordsUpserted, metricsWritten: 1 };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { startup_id, connector_type } = await req.json();
    if (!startup_id || !connector_type) {
      return new Response(
        JSON.stringify({ error: "startup_id and connector_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load credentials from DB
    const { data: cred, error: credErr } = await supabase
      .from("connector_credentials")
      .select("credentials")
      .eq("startup_id", startup_id)
      .eq("connector_type", connector_type)
      .eq("is_active", true)
      .single();

    if (credErr || !cred) {
      return new Response(
        JSON.stringify({ error: "No active credentials found for this connector" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: { recordsUpserted: number; metricsWritten: number };

    if (connector_type === "github") {
      result = await syncGitHub(supabase, startup_id, cred.credentials as any);
    } else if (connector_type === "slack") {
      result = await syncSlack(supabase, startup_id, cred.credentials as any);
    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported connector: ${connector_type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update last_synced_at
    await supabase
      .from("connector_credentials")
      .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
      .eq("startup_id", startup_id)
      .eq("connector_type", connector_type);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("connector-sync error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
