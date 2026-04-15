import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Brain,
  TrendingDown,
  TrendingUp,
  Clock,
  Loader2,
  AlertTriangle,
  Shield,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Prediction {
  prediction: string;
  timeframe: string;
  confidence: "High" | "Medium" | "Low";
  scenario: "no_action" | "with_action";
}

interface PredictiveResult {
  predictions: Prediction[];
  riskLevel: "critical" | "high" | "medium" | "low";
  recommendedAction: string;
}

interface KaiPredictiveIntelProps {
  issueTitle: string;
  startupName?: string;
  kpiData?: string;
  className?: string;
}

const riskConfig = {
  critical: { label: "Critical", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", icon: AlertTriangle },
  high: { label: "High Risk", color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: AlertTriangle },
  medium: { label: "Medium", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: Shield },
  low: { label: "Low", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: Shield },
};

const confidenceDot: Record<string, string> = {
  High: "bg-destructive",
  Medium: "bg-amber-500",
  Low: "bg-muted-foreground/50",
};

const KaiPredictiveIntel = ({ issueTitle, startupName, kpiData, className }: KaiPredictiveIntelProps) => {
  const { role } = useAuth();
  const [result, setResult] = useState<PredictiveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const resp = await supabase.functions.invoke("kai-predict", {
        body: {
          issueTitle,
          startupName: startupName || "",
          kpiData: kpiData || "",
          role: role || "founder",
        },
      });

      if (resp.error) throw resp.error;

      if (resp.data?.error) {
        toast.error(resp.data.error);
        return;
      }

      setResult(resp.data);
      setExpanded(true);
    } catch (e) {
      console.error("KAI predict error:", e);
      toast.error("KAI couldn't generate predictions");
    } finally {
      setLoading(false);
    }
  };

  if (!result && !loading) {
    return (
      <button
        onClick={fetchPredictions}
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors",
          className
        )}
      >
        <Brain className="h-3 w-3" />
        Predict Impact
      </button>
    );
  }

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span className="text-xs text-primary font-medium">KAI analyzing trends…</span>
      </div>
    );
  }

  if (!result) return null;

  const risk = riskConfig[result.riskLevel];
  const RiskIcon = risk.icon;
  const noActionPredictions = result.predictions.filter((p) => p.scenario === "no_action");
  const withActionPredictions = result.predictions.filter((p) => p.scenario === "with_action");

  return (
    <Card className={cn("border-border/40 overflow-hidden", className)}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                KAI Predictive Intel
              </span>
              <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", risk.color, risk.bg, risk.border)}>
                <RiskIcon className="h-2.5 w-2.5 mr-0.5" />
                {risk.label}
              </Badge>
            </div>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>

          {/* Compact summary when collapsed */}
          {!expanded && noActionPredictions[0] && (
            <p className="text-xs text-foreground/80 mt-1.5 line-clamp-1">
              ⚠ {noActionPredictions[0].prediction}
            </p>
          )}
        </CardContent>
      </button>

      {/* Expanded predictions */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* No Action Scenario */}
          {noActionPredictions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown className="h-3 w-3 text-destructive" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive">
                  If No Action Taken
                </span>
              </div>
              <div className="space-y-1.5">
                {noActionPredictions.map((p, i) => (
                  <PredictionRow key={i} prediction={p} />
                ))}
              </div>
            </div>
          )}

          {/* With Action Scenario */}
          {withActionPredictions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                  With Intervention
                </span>
              </div>
              <div className="space-y-1.5">
                {withActionPredictions.map((p, i) => (
                  <PredictionRow key={i} prediction={p} positive />
                ))}
              </div>
            </div>
          )}

          {/* Recommended Action */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
            <div className="flex items-start gap-1.5">
              <Brain className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  Recommended Action
                </span>
                <p className="text-xs font-medium text-foreground/90 mt-0.5 leading-relaxed">
                  {result.recommendedAction}
                </p>
              </div>
            </div>
          </div>

          {/* Refresh */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                fetchPredictions();
              }}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Brain className="h-3 w-3 mr-1" />}
              Re-analyze
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

const PredictionRow = ({ prediction, positive }: { prediction: Prediction; positive?: boolean }) => (
  <div className={cn(
    "rounded-lg border px-3 py-2",
    positive ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/30 bg-muted/20"
  )}>
    <p className="text-xs font-medium leading-snug">{prediction.prediction}</p>
    <div className="flex items-center gap-3 mt-1">
      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
        <Clock className="h-2.5 w-2.5" />
        {prediction.timeframe}
      </span>
      <span className="text-[10px] flex items-center gap-1">
        <span className={cn("h-1.5 w-1.5 rounded-full", confidenceDot[prediction.confidence])} />
        <span className="text-muted-foreground">{prediction.confidence} confidence</span>
      </span>
    </div>
  </div>
);

export default KaiPredictiveIntel;
