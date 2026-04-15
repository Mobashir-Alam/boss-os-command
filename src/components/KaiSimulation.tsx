import { GitBranch } from "lucide-react";
import type { KaiSimulationData } from "@/data/kai";

interface KaiSimulationProps {
  simulations: KaiSimulationData[];
}

const KaiSimulation = ({ simulations }: KaiSimulationProps) => {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 flex items-center gap-1.5">
        <GitBranch className="h-3 w-3" />
        Impact Simulation
      </p>
      <div className="space-y-2.5">
        {simulations.map((s, i) => (
          <div key={i} className="text-sm">
            <p className="text-xs text-muted-foreground font-medium">If: {s.condition}</p>
            <p className="font-medium leading-snug mt-0.5">→ {s.outcome}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KaiSimulation;
