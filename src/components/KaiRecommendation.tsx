import { Zap, ArrowRight } from "lucide-react";
import type { KaiRecommendationData } from "@/data/kai";

interface KaiRecommendationProps {
  recommendation: KaiRecommendationData;
  onAccept?: () => void;
}

const confidenceBadge: Record<string, string> = {
  High: "bg-emerald-500/10 text-emerald-600",
  Medium: "bg-amber-500/10 text-amber-600",
  Low: "bg-muted text-muted-foreground",
};

const KaiRecommendation = ({ recommendation, onAccept }: KaiRecommendationProps) => {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Zap className="h-3 w-3" />
          KAI Recommendation
        </p>
        <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${confidenceBadge[recommendation.confidence]}`}>
          {recommendation.confidence}
        </span>
      </div>
      <p className="text-sm font-semibold leading-snug mb-1">{recommendation.action}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{recommendation.why}</p>
      {onAccept && (
        <button
          onClick={onAccept}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Accept recommendation <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default KaiRecommendation;
