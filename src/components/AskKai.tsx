import { useState } from "react";
import { Sparkles, Send, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "founder" | "mfo" | "functional_head" | "project_manager" | "team_member";

const roleSuggestedPrompts: Record<AppRole, string[]> = {
  founder: [
    "What's the biggest risk right now?",
    "Where should I allocate capital?",
    "Which startup needs my attention?",
    "Predict next month's portfolio trajectory",
  ],
  mfo: [
    "Which tasks are at risk of delay?",
    "Where are the coordination gaps?",
    "What blockers should I escalate?",
    "Who's overloaded this week?",
  ],
  functional_head: [
    "What's the top issue in my domain?",
    "Where should I focus this week?",
    "Are there cross-startup patterns?",
    "What's trending in my KPIs?",
  ],
  project_manager: [
    "Which tasks are falling behind?",
    "What should I prioritize today?",
    "Are there team bottlenecks?",
    "What's blocking delivery?",
  ],
  team_member: [
    "What should I do next?",
    "Which task is most urgent?",
    "Am I on track this week?",
    "What's blocking my work?",
  ],
};

const rolePlaceholders: Record<AppRole, string> = {
  founder: "Ask KAI about strategy, risk, or capital allocation...",
  mfo: "Ask KAI about execution, blockers, or coordination...",
  functional_head: "Ask KAI about your domain performance...",
  project_manager: "Ask KAI about task risks or team bottlenecks...",
  team_member: "Ask KAI what to focus on next...",
};

interface AskKaiProps {
  startupContext?: string;
}

const AskKai = ({ startupContext }: AskKaiProps) => {
  const { role } = useAuth();
  const currentRole: AppRole = role || "founder";

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const prompts = roleSuggestedPrompts[currentRole];
  const placeholder = rolePlaceholders[currentRole];

  const ask = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    setQuestion(trimmed);
    setAnswer("");
    setLoading(true);

    try {
      const resp = await supabase.functions.invoke("kai-ask", {
        body: { question: trimmed, context: startupContext || "", role: currentRole },
      });

      if (resp.error) throw resp.error;
      setAnswer(resp.data?.answer || "No insight available.");
    } catch (e) {
      console.error("KAI error:", e);
      toast.error("KAI couldn't respond right now");
      setAnswer("");
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = () => {
    toast.success("KAI insight converted to task");
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center h-5 w-5 rounded-md bg-primary/10">
          <Sparkles className="h-3 w-3 text-primary" />
        </div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ask KAI</h3>
      </div>

      {/* Role-specific suggested prompts */}
      <div className="flex flex-wrap gap-2 mb-4">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => ask(prompt)}
            disabled={loading}
            className="rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border/70 transition-all duration-150 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(question)}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={loading}
        />
        <Button size="sm" onClick={() => ask(question)} disabled={loading || !question.trim()} className="px-3">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Answer */}
      {(answer || loading) && (
        <div className="mt-4 rounded-lg bg-muted/20 border border-border/30 px-4 py-3 animate-in fade-in-0 duration-200">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">KAI</p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analyzing...
            </div>
          ) : (
            <>
              <p className="text-sm font-medium leading-relaxed">{answer}</p>
              <button
                onClick={handleConvert}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Convert to task <ArrowRight className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AskKai;
