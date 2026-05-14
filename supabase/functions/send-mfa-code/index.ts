import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SHA-256 hex hash (good enough for short-lived 6-digit codes)
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generate6DigitCode(): string {
  // Cryptographically secure 6-digit code (no leading zero stripping)
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const num = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  return String(Math.abs(num) % 1_000_000).padStart(6, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Identify the caller from their JWT
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
    if (!user.email) {
      return new Response(JSON.stringify({ error: "User has no email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for DB writes that bypass RLS
    const admin = createClient(supabaseUrl, serviceRole);

    // Rate-limit: at most 1 code request per 30 seconds
    const { data: recent } = await admin
      .from("mfa_codes")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const lastCreated = recent?.[0]?.created_at;
    if (lastCreated && Date.now() - new Date(lastCreated).getTime() < 30_000) {
      return new Response(
        JSON.stringify({ error: "Please wait a moment before requesting another code." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate, hash, store
    const code = generate6DigitCode();
    const codeHash = await sha256(`${user.id}:${code}`);
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

    const { error: insertErr } = await admin.from("mfa_codes").insert({
      user_id: user.id,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`);

    // Send via existing transactional-email function
    const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRole}`,
      },
      body: JSON.stringify({
        templateName: "mfa-code",
        recipientEmail: user.email,
        idempotencyKey: `mfa-${user.id}-${Date.now()}`,
        templateData: { code, expiresInMinutes: 10 },
      }),
    });

    if (!sendRes.ok) {
      const t = await sendRes.text();
      console.error("send-transactional-email failed:", sendRes.status, t);
      return new Response(JSON.stringify({ error: "Couldn't send email. Try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, expiresAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("send-mfa-code error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
