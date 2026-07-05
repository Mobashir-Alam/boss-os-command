import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Zap, X, Send, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStartups } from "@/hooks/useStartups";
import { contextForRoute } from "@/lib/pageContext";

interface JarvisTurn {
  id: string;
  question: string;
  answer: string | null;
  error?: string;
  route?: string | null; // navigation action target, if any
}

const HIDDEN_ROUTES = ["/login", "/onboarding", "/verify", "/unsubscribe"];
const MAX_TURNS = 10;

// Global Jarvis assistant: floating ⚡ button (bottom-right) opening a
// slide-up panel — full-screen on mobile, 480px wide on desktop. Available on
// every page via App.tsx. Can navigate, explain the current page, and look up
// team members through the kai-jarvis edge function.
export default function JarvisKai() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { dbStartups } = useStartups();
  const startupId = dbStartups.find((s) => s.slug === "nasheedio")?.id ?? dbStartups[0]?.id;

  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<JarvisTurn[]>([]);
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending]);

  if (!user || HIDDEN_ROUTES.some((r) => location.pathname.startsWith(r))) return null;

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || pending || !startupId) return;
    const turn: JarvisTurn = { id: crypto.randomUUID(), question: trimmed, answer: null };
    setTurns((prev) => [...prev, turn].slice(-MAX_TURNS));
    setQuestion("");
    setPending(true);
    try {
      const resp = await supabase.functions.invoke("kai-jarvis", {
        body: {
          question: trimmed,
          mode: "general",
          currentRoute: location.pathname,
          pageContext: contextForRoute(location.pathname) ?? undefined,
          startupId,
        },
      });
      if (resp.error) throw resp.error;
      if (resp.data?.error) throw new Error(resp.data.error);
      const answer: string = resp.data?.answer ?? "No answer.";
      const route: string | null =
        resp.data?.action?.action === "navigate" ? (resp.data.action.route as string) : null;
      setTurns((prev) =>
        prev.map((t) => (t.id === turn.id ? { ...t, answer, route } : t))
      );
      // Auto-navigate when Jarvis decided the user wants a page
      if (route) navigate(route);
    } catch (e) {
      setTurns((prev) =>
        prev.map((t) => (t.id === turn.id ? { ...t, error: (e as Error).message } : t))
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Ask Jarvis (KAI)"
          className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        >
          <Zap className="h-5 w-5" />
        </button>
      )}

      {/* Slide-up panel */}
      {open && (
        <div
          className={cn(
            "fixed z-50 flex flex-col border shadow-2xl",
            "bg-[hsl(var(--card))] border-[hsl(var(--border))]",
            // Full-screen on mobile, 480px panel bottom-right on desktop
            "inset-0 sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[600px] sm:max-h-[80vh] sm:w-[480px] sm:rounded-2xl",
            "animate-in slide-in-from-bottom-4 fade-in-0 duration-200"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/15">
                <Zap className="h-4 w-4 text-amber-500" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-none">KAI · Jarvis Mode</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Navigate, explain pages, look up your team
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Conversation */}
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {turns.length === 0 && (
              <div className="space-y-2 pt-6 text-center">
                <p className="text-sm text-muted-foreground">Try:</p>
                {["Show me YouTube", "Explain this page", "What did the team ship this week?"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className="mx-auto block rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {turns.map((t) => (
              <div key={t.id} className="space-y-2">
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                    {t.question}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 px-3 py-2 text-sm">
                    {t.error ? (
                      <span className="text-red-500">{t.error}</span>
                    ) : t.answer === null ? (
                      // Typing indicator
                      <span className="flex items-center gap-1 py-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                      </span>
                    ) : (
                      <>
                        <span className="whitespace-pre-wrap leading-relaxed">{t.answer}</span>
                        {t.route && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 h-7 gap-1 text-xs"
                            onClick={() => navigate(t.route!)}
                          >
                            Navigate <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-[hsl(var(--border))] p-3">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(question)}
              placeholder='Ask anything — "open GitHub", "what did Omar do?"'
              disabled={pending}
              className="flex-1 rounded-lg border border-[hsl(var(--border))] bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => ask(question)}
              disabled={pending || !question.trim()}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
