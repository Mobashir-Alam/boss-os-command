// YouTube OAuth — Step 1 of 2: generate the Google consent URL.
//
// Caller flow:
//   1. POST to this function with { startup_id, return_path? }
//   2. Function generates a random state token, stores it in youtube_oauth_states,
//      returns the Google authorization URL
//   3. Frontend opens that URL (new window OR same-tab redirect)
//   4. User signs into Google, picks the channel/account, accepts scopes
//   5. Google redirects to /youtube-oauth-callback?code=…&state=…
//   6. Callback (separate function) exchanges code for tokens, persists them
//
// Requires Supabase secrets:
//   GOOGLE_OAUTH_CLIENT_ID
//   GOOGLE_OAUTH_CLIENT_SECRET (used by the callback, not here)
//   GOOGLE_OAUTH_REDIRECT_URI (must exactly match what's registered in
//     Google Cloud Console for this OAuth client)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Scopes — start broad. yt-analytics-monetary requires Partner Program
// monetization + (for non-internal apps) Google OAuth verification, but
// requesting it doesn't break for unmonetized channels — the data just
// comes back empty.
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
  "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
].join(" ");

function generateStateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const redirectUri = Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI");

    if (!clientId) {
      return new Response(
        JSON.stringify({
          error:
            "GOOGLE_OAUTH_CLIENT_ID is not set in Supabase secrets. Add it in Lovable → Secrets first.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!redirectUri) {
      return new Response(
        JSON.stringify({
          error:
            "GOOGLE_OAUTH_REDIRECT_URI is not set. It must exactly match the redirect URI registered in your Google OAuth client.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const startupId = body.startup_id as string | undefined;
    const returnPath = (body.return_path as string | undefined) ?? "/team/social-media";
    const initiatedBy = body.initiated_by as string | undefined; // optional, caller may pass auth user id

    if (!startupId) {
      return new Response(
        JSON.stringify({ error: "startup_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    // Save state for CSRF validation in the callback
    const state = generateStateToken();
    const { error: insertErr } = await admin.from("youtube_oauth_states").insert({
      state,
      startup_id: startupId,
      initiated_by: initiatedBy ?? null,
      return_path: returnPath,
    } as any);
    if (insertErr) throw new Error(`Failed to persist OAuth state: ${insertErr.message}`);

    // Cleanup any stale state rows (best effort; non-blocking)
    void admin
      .from("youtube_oauth_states")
      .delete()
      .lt("expires_at", new Date().toISOString());

    // Build the Google authorization URL
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent"); // always re-prompt → guarantees refresh_token
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", state);

    return new Response(
      JSON.stringify({ authorization_url: url.toString(), state }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("youtube-oauth-start error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
