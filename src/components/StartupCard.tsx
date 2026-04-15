import { TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import SparkLine from "./SparkLine";
import type { Startup } from "@/data/startups";
import { statusConfig } from "@/data/startups";

interface StartupCardProps {
  startup: Startup;
  onFix: (startup: Startup) => void;
}

const StartupCard = ({ startup, onFix }: StartupCardProps) => {
  const navigate = useNavigate();
  const config = statusConfig[startup.status];

  return (
    <div
      className="group relative rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-border"
      style={{ borderTopColor: config.color, borderTopWidth: "2px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">{startup.name}</h3>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: config.bg, color: config.color }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.color }} />
          {config.label}
        </span>
      </div>

      {/* Metrics */}
      <div className="flex gap-6 mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Runway</p>
          <p className="text-sm font-semibold">{startup.runway}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Growth</p>
          <div className="flex items-center gap-1">
            <p className="text-sm font-semibold">{startup.growth}</p>
            {startup.growthDirection === "up" ? (
              <TrendingUp className="h-3.5 w-3.5" style={{ color: "hsl(142 71% 45%)" }} />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" style={{ color: "hsl(0 84% 60%)" }} />
            )}
          </div>
        </div>
      </div>

      {/* Insight */}
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5 cursor-default hover:text-foreground transition-colors line-clamp-2">
            {startup.insight}
          </p>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-3">
          <div className="mb-2">
            <SparkLine data={startup.sparkData} color={config.color} />
          </div>
          <p className="text-xs leading-relaxed">{startup.insightDetail}</p>
        </TooltipContent>
      </Tooltip>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="default" className="flex-1" onClick={() => navigate(`/startup/${startup.id}`)}>
          View
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => onFix(startup)}>
          Fix
        </Button>
      </div>
    </div>
  );
};

export default StartupCard;
