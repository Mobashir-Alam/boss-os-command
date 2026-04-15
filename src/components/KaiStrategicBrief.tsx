import { Zap, Clock, AlertTriangle, TrendingUp, Target } from "lucide-react";
import type { KaiWeeklyBrief, KaiFounderPattern } from "@/data/kai";

interface KaiStrategicBriefProps {
  brief: KaiWeeklyBrief;
  founderPatterns: KaiFounderPattern[];
  timeAllocation: { current: { startup: string; percent: number }[]; recommended: { startup: string; percent: number }[]; insight: string };
}

const KaiStrategicBrief = ({ brief, founderPatterns, timeAllocation }: KaiStrategicBriefProps) => {
  return (
    <div className="space-y-4">
      {/* Weekly brief */}
      <div className="rounded-xl border border-border/40 bg-card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
          <Zap className="h-3 w-3" />
          Weekly Strategic Brief
        </p>
        <p className="text-sm font-semibold mb-4">{brief.status}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase text-destructive/70 flex items-center gap-1 mb-1">
              <AlertTriangle className="h-3 w-3" /> Biggest Risk
            </p>
            <p className="text-sm font-medium">{brief.biggestRisk}</p>
          </div>
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase text-emerald-600/70 flex items-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3" /> Biggest Opportunity
            </p>
            <p className="text-sm font-medium">{brief.biggestOpportunity}</p>
          </div>
        </div>

        {/* Strategic decisions */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">Strategic Decisions</p>
          <div className="space-y-1.5">
            {brief.strategicDecisions.map((d, i) => (
              <p key={i} className="text-sm font-medium flex items-start gap-2">
                <span className="text-muted-foreground text-xs mt-0.5">{i + 1}.</span>
                {d}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Time allocation */}
      <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          Founder Time Allocation
        </p>
        <p className="text-sm font-medium mb-3">{timeAllocation.insight}</p>
        <div className="space-y-1.5">
          {timeAllocation.current.map((c, i) => {
            const rec = timeAllocation.recommended[i];
            const diff = rec.percent - c.percent;
            return (
              <div key={c.startup} className="flex items-center gap-3 text-sm">
                <span className="text-xs font-medium w-28 text-muted-foreground">{c.startup}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="h-1.5 rounded-full bg-muted" style={{ width: "100%" }}>
                    <div className="h-1.5 rounded-full bg-muted-foreground/30" style={{ width: `${c.percent}%` }} />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground w-8">{c.percent}%</span>
                  <span className="text-xs">→</span>
                  <div className="h-1.5 rounded-full bg-muted" style={{ width: "100%" }}>
                    <div className="h-1.5 rounded-full bg-foreground/40" style={{ width: `${rec.percent}%` }} />
                  </div>
                  <span className="text-xs tabular-nums font-medium w-8">{rec.percent}%</span>
                  {diff !== 0 && (
                    <span className={`text-[10px] font-medium ${diff > 0 ? "text-emerald-600" : "text-destructive/70"}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Founder patterns */}
      <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 flex items-center gap-1.5">
          <Target className="h-3 w-3" />
          Founder Patterns Detected
        </p>
        <div className="space-y-2.5">
          {founderPatterns.map((fp, i) => (
            <div key={i}>
              <p className="text-sm font-medium">{fp.pattern}</p>
              <p className="text-xs text-muted-foreground mt-0.5">→ {fp.suggestion}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KaiStrategicBrief;
