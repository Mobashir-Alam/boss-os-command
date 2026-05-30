// YouTube OAuth — Step 2 of 2: receive ?code=…&state=… from Google,
// validate state, exchange code for tokens, identify which channel was
// authorized, persist tokens in connector_youtube_oauth.
//
// At the end, redirects the user back to their return_path with a query
// string flag so the SocialMediaDashboard can show a success/failure toast.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APP_BASE = Deno.env.get("APP_BASE_URL") ?? "http://localhost:8080";

function redirect(path: string, params: Record<string, string>) {
  const url = new URL(APP_BASE);
  url.pathname = path;
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString() },
  });
}

Deno.serve(async (req) => {
  // OAuth flow uses GET (with query string from Google's redirect)
  // No CORS needed because this is hit from Google's redirect, then the
  // user is redirected to the app — neither involves cross-origin XHR.

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorParam = url.searchParams.get("error");

    if (errorParam) {
      return redirect("/team/social-media", { yt_oauth: "error", reason: errorParam });
    }
    if (!code || !state) {
      return redirect("/team/social-media", { yt_oauth: "error", reason: "missing_code_or_state" });
    }

    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
    const redirectUri = Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI");
    if (!clientId || !clientSecret || !redirectUri) {
      console.error("OAuth env vars missing");
      return redirect("/team/social-media", { yt_oauth: "error", reason: "env_misconfigured" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    // Validate state — must exist and not be expired
    const { data: stateRow, error: stateErr } = await admin
      .from("youtube_oauth_states")
      .select("state, startup_id, return_path, expires_at")
      .eq("state", state)
      .maybeSingle();
    if (stateErr) {
      console.error("State lookup failed:", stateErr.message);
      return redirect("/team/social-media", { yt_oauth: "error", reason: "state_lookup_failed" });
    }
    if (!stateRow) {
      return redirect("/team/social-media", { yt_oauth: "error", reason: "state_not_found" });
    }
    if (new Date(stateRow.expires_at as string).getTime() < Date.now()) {
      return redirect("/team/social-media", { yt_oauth: "error", reason: "state_expired" });
    }

    const returnPath = (stateRow.return_path as string) || "/team/social-media";
    const startupId = stateRow.startup_id as string;

    // One-time use — delete the state row
    void admin.from("youtube_oauth_states").delete().eq("state", state);

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("Token exchange failed:", tokenRes.status, errBody);
      return redirect(returnPath, { yt_oauth: "error", reason: "token_exchange_failed" });
    }
    const tokens = await tokenRes.json();
    // tokens = { access_token, expires_in, refresh_token?, scope, token_type, id_token? }
    if (!tokens.refresh_token) {
      // Google omits refresh_token when re-authorizing without prompt=consent
      // We force prompt=consent in the start function, so this should rarely
      // happen — but if it does, we can't persist a long-lived authorization.
      console.error("No refresh_token returned. User may need to revoke + re-authorize.");
      return redirect(returnPath, { yt_oauth: "error", reason: "no_refresh_token" });
    }

    const accessToken = tokens.access_token as string;
    const refreshToken = tokens.refresh_token as string;
    const expiresAt = new Date(Date.now() + (tokens.expires_in as number) * 1000).toISOString();
    const grantedScopes = (tokens.scope as string).split(" ");

    // Identify the channel this OAuth was for. Calling the YouTube Data API
    // with the new access token + mine=true returns the channel(s) owned by
    // the authorized account.
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=id,snippet,status&mine=true&maxResults=50",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!channelRes.ok) {
      const errBody = await channelRes.text();
      console.error("Channel identify failed:", channelRes.status, errBody);
      return redirect(returnPath, { yt_oauth: "error", reason: "channel_identify_failed" });
    }
    const channelData = await channelRes.json();
    const channels = (channelData.items ?? []) as any[];
    if (channels.length === 0) {
      return redirect(returnPath, { yt_oauth: "error", reason: "no_channels_for_account" });
    }

    // Persist tokens — one row per (startup_id, channel_id). If the
    // authorized account owns multiple channels, store one row per channel.
    const channelIds: string[] = [];
    for (const c of channels) {
      channelIds.push(c.id);
      await admin.from("connector_youtube_oauth").upsert(
        {
          startup_id: startupId,
          channel_id: c.id,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: expiresAt,
          scopes: grantedScopes,
          authorized_by: stateRow.initiated_by ?? null,
          authorized_at: new Date().toISOString(),
        } as any,
        { onConflict: "startup_id,channel_id" }
      );

      // Also upsert the channel into connector_data_youtube_channels so it
      // shows up in the dashboard even if it wasn't added via Tier 1 first.
      await admin.from("connector_data_youtube_channels").upsert(
        {
          startup_id: startupId,
          channel_id: c.id,
          title: c.snippet?.title ?? null,
          description: c.snippet?.description ?? null,
          custom_url: c.snippet?.customUrl ?? null,
          country: c.snippet?.country ?? null,
          thumbnail_url:
            c.snippet?.thumbnails?.medium?.url ??
            c.snippet?.thumbnails?.default?.url ??
            null,
          is_active: true,
          is_monetized: grantedScopes.some((s: string) =>
            s.includes("yt-analytics-monetary")
          ),
          raw_payload: c,
          last_synced_at: new Date().toISOString(),
        } as any,
        { onConflict: "startup_id,channel_id" }
      );
    }

    return redirect(returnPath, {
      yt_oauth: "success",
      channels: String(channelIds.length),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("youtube-oauth-callback error:", msg);
    return redirect("/team/social-media", { yt_oauth: "error", reason: "exception" });
  }
});
