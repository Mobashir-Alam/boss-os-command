import { Zap, TrendingUp, Clock } from "lucide-react";
import type { KaiPredictionData } from "@/data/kai";

interface KaiPredictionProps {
  predictions: KaiPredictionData[];
}

const confidenceColor: Record<string, string> = {
  High: "text-foreground/80",
  Medium: "text-muted-foreground",
  Low: "text-muted-foreground/60",
};

const KaiPrediction = ({ predictions }: KaiPredictionProps) => {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 flex items-center gap-1.5">
        <TrendingUp className="h-3 w-3" />
        KAI Predictions
      </p>
      <div className="space-y-2">
        {predictions.map((p, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <Clock className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium leading-snug ${confidenceColor[p.confidence]}`}>{p.prediction}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">⏱ {p.timeframe}</span>
                <span className={`text-[10px] font-medium ${p.confidence === "High" ? "text-destructive/70" : "text-muted-foreground"}`}>
                  {p.confidence} confidence
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KaiPrediction;
