import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [status, setStatus] = useState<Status>("loading");
  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } })
      .then(r => r.json())
      .then(d => {
        if (d.valid === false && d.reason === "already_unsubscribed") setStatus("already");
        else if (d.valid) setStatus("valid");
        else setStatus("invalid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleUnsubscribe = async () => {
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      setStatus(data?.success ? "success" : "error");
    } catch { setStatus("error"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="h-10 w-10 rounded-lg bg-foreground flex items-center justify-center mx-auto">
          <span className="text-background text-sm font-bold">F</span>
        </div>
        {status === "loading" && <p className="text-muted-foreground">Verifying…</p>}
        {status === "valid" && (
          <>
            <h1 className="text-xl font-semibold">Unsubscribe</h1>
            <p className="text-muted-foreground text-sm">Are you sure you want to unsubscribe from Founder OS emails?</p>
            <button onClick={handleUnsubscribe} className="px-6 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition">
              Confirm Unsubscribe
            </button>
          </>
        )}
        {status === "already" && <p className="text-muted-foreground">You've already been unsubscribed.</p>}
        {status === "invalid" && <p className="text-destructive">Invalid or expired link.</p>}
        {status === "success" && <p className="text-green-600 font-medium">You've been unsubscribed successfully.</p>}
        {status === "error" && <p className="text-destructive">Something went wrong. Please try again.</p>}
      </div>
    </div>
  );
};

export default Unsubscribe;
