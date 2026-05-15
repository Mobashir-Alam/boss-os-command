import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldCheck, Mail, RotateCw } from "lucide-react";
import { toast } from "sonner";

const MFA_VERIFIED_KEY = "mfa_verified";

export default function Verify2FA() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  // Show the real OTP destination (notification_email if set, else login email).
  const { data: routedEmail } = useQuery({
    queryKey: ["verify-email-destination", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("notification_email")
        .eq("id", user!.id)
        .maybeSingle();
      return (data as any)?.notification_email || user?.email || "";
    },
  });
  const displayEmail = routedEmail || user?.email;

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sentOnce, setSentOnce] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  // Send the first code automatically when the page mounts.
  useEffect(() => {
    if (!user?.id || sentOnce) return;
    void send();
    setSentOnce(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const send = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-mfa-code");
      if (error) {
        // supabase-js wraps the response body in error.context.body for non-2xx.
        // Try to parse it so we can show the real underlying email error.
        const ctx: any = (error as any)?.context;
        let detail = error.message;
        if (ctx?.body) {
          try {
            const parsed = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
            if (parsed?.error) detail = parsed.error;
            if (parsed?.underlyingBody) {
              detail += ` — ${String(parsed.underlyingBody).slice(0, 200)}`;
            }
            if (parsed?.underlyingStatus) {
              detail += ` (status ${parsed.underlyingStatus})`;
            }
          } catch { /* response wasn't JSON */ }
        }
        throw new Error(detail);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Code sent to ${displayEmail ?? "your email"}`);
      setResendIn(30);
      // Focus first box
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } catch (e: any) {
      // Long detail — use toast.error with description so it's all visible.
      const msg = String(e?.message ?? "Couldn't send code");
      console.error("send-mfa-code error detail:", msg);
      toast.error(msg.length > 80 ? msg.slice(0, 80) + "…" : msg, {
        description: msg.length > 80 ? msg : undefined,
        duration: 10000,
      });
    } finally {
      setSending(false);
    }
  };

  const verify = async (code: string) => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-mfa-code", {
        body: { code },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      sessionStorage.setItem(MFA_VERIFIED_KEY, "true");
      toast.success("Verified");
      navigate(from, { replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Wrong code");
      setDigits(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleDigitChange = (idx: number, value: string) => {
    // Accept paste of full code
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, "").slice(0, 6).split("");
      if (cleaned.length === 0) return;
      const next = ["", "", "", "", "", ""];
      cleaned.forEach((d, i) => (next[i] = d));
      setDigits(next);
      if (cleaned.length === 6) verify(cleaned.join(""));
      else inputs.current[Math.min(cleaned.length, 5)]?.focus();
      return;
    }
    if (value && !/^\d$/.test(value)) return;
    const next = [...digits];
    next[idx] = value;
    setDigits(next);
    if (value && idx < 5) inputs.current[idx + 1]?.focus();
    if (next.every((d) => d) && next.join("").length === 6) verify(next.join(""));
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/50">
        <CardContent className="p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="rounded-full bg-primary/10 p-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Two-step verification</h1>
              <p className="text-sm text-muted-foreground mt-1">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-foreground">{displayEmail}</span>
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={6} // allow paste of full code
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={verifying}
                className="h-12 w-10 rounded-md border border-border bg-background text-center text-lg font-mono font-bold tabular-nums shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          {verifying && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Verifying…
            </p>
          )}

          <div className="space-y-2 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={send}
              disabled={sending || resendIn > 0 || verifying}
              className="gap-1.5"
            >
              {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </Button>
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
              <Mail className="h-3 w-3" />
              Code expires in 10 minutes
            </p>
          </div>

          <div className="border-t border-border/40 pt-4 text-center">
            <button
              type="button"
              onClick={() => { sessionStorage.removeItem(MFA_VERIFIED_KEY); signOut(); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Sign in as someone else
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
