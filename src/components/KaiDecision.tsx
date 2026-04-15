import { Zap, Clock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { KaiDecisionData } from "@/data/kai";

interface KaiDecisionProps {
  decision: KaiDecisionData;
}

const confidenceBadge: Record<string, string> = {
  High: "bg-emerald-500/10 text-emerald-600",
  Medium: "bg-amber-500/10 text-amber-600",
  Low: "bg-muted text-muted-foreground",
};

const KaiDecision = ({ decision }: KaiDecisionProps) => {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center h-5 w-5 rounded-md bg-foreground/5">
          <Zap className="h-3 w-3 text-foreground/60" />
        </div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">KAI Decision</h3>
      </div>

      <p className="text-lg font-semibold tracking-tight mb-2">{decision.action}</p>
      <p className="text-sm text-muted-foreground mb-3">{decision.impact}</p>

      <div className="flex items-center gap-4 mb-5 text-xs">
        <span className={`font-medium rounded-full px-2 py-0.5 ${confidenceBadge[decision.confidence]}`}>
          {decision.confidence} confidence
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          Impact in {decision.timeToImpact}
        </span>
      </div>

      <div className="flex gap-2.5">
        <Button size="sm" onClick={() => toast.success("Decision accepted", { description: decision.action })}>
          Accept Decision
        </Button>
        <Button size="sm" variant="outline" onClick={() => toast.info("Opening data review...")}>
          <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
          Review Data
        </Button>
      </div>
    </div>
  );
};

export default KaiDecision;
