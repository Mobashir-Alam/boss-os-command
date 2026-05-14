import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, serviceRole, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const { code } = await req.json();
    if (!code || typeof code !== "string" || code.length !== 6) {
      return new Response(JSON.stringify({ error: "Invalid code format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRole);

    // Fetch most recent unused, non-expired code for this user
    const { data: rows, error: fetchErr } = await admin
      .from("mfa_codes")
      .select("id, code_hash, expires_at, attempts, used_at")
      .eq("user_id", user.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchErr) throw new Error(`DB read failed: ${fetchErr.message}`);
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: "Code expired or not found. Request a new one." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const row = rows[0];
    if (row.attempts >= MAX_ATTEMPTS) {
      return new Response(JSON.stringify({ error: "Too many attempts. Request a new code." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const submittedHash = await sha256(`${user.id}:${code}`);
    const matches = submittedHash === row.code_hash;

    if (!matches) {
      await admin
        .from("mfa_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      return new Response(JSON.stringify({ error: "Wrong code", attemptsLeft: MAX_ATTEMPTS - row.attempts - 1 }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark used + stamp profiles.last_mfa_verified_at
    await Promise.all([
      admin.from("mfa_codes").update({ used_at: new Date().toISOString() }).eq("id", row.id),
      admin.from("profiles").update({ last_mfa_verified_at: new Date().toISOString() }).eq("id", user.id),
    ]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("verify-mfa-code error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
