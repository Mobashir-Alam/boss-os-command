import { Zap, ArrowRightLeft, DollarSign, Lightbulb, Users } from "lucide-react";
import { toast } from "sonner";
import type { KaiCrossInsight } from "@/data/kai";

interface KaiPortfolioIntelProps {
  crossInsights: KaiCrossInsight[];
  capitalAllocations: { startup: string; action: string; roi: string }[];
}

const typeConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  synergy: { icon: <ArrowRightLeft className="h-3 w-3" />, label: "Synergy" },
  capital: { icon: <DollarSign className="h-3 w-3" />, label: "Capital" },
  resource: { icon: <Users className="h-3 w-3" />, label: "Resource" },
  opportunity: { icon: <Lightbulb className="h-3 w-3" />, label: "Opportunity" },
};

const KaiPortfolioIntel = ({ crossInsights, capitalAllocations }: KaiPortfolioIntelProps) => {
  return (
    <div className="space-y-4">
      {/* Cross-startup insights */}
      <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
          <Zap className="h-3 w-3" />
          Cross-Startup Intelligence
        </p>
        <div className="space-y-2.5">
          {crossInsights.map((ci) => {
            const cfg = typeConfig[ci.type];
            return (
              <div key={ci.id} className="flex items-start gap-2.5">
                <div className="flex items-center justify-center h-5 w-5 rounded-md bg-foreground/5 flex-shrink-0 mt-0.5">
                  {cfg.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-snug">{ci.insight}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">{cfg.label}</span>
                    <button
                      onClick={() => toast.success("Converted to task", { description: ci.insight })}
                      className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      → Convert to task
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Capital allocation */}
      <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
          <DollarSign className="h-3 w-3" />
          Capital Allocation
        </p>
        <div className="space-y-2">
          {capitalAllocations.map((ca, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm">
              <span className="text-xs font-semibold text-muted-foreground w-24 flex-shrink-0 mt-0.5">{ca.startup}</span>
              <div>
                <p className="font-medium leading-snug">{ca.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ca.roi}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KaiPortfolioIntel;
