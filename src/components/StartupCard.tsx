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
  index?: number;
}

const StartupCard = ({ startup, onFix, index = 0 }: StartupCardProps) => {
  const navigate = useNavigate();
  const config = statusConfig[startup.status];

  return (
    <div
      className="group relative rounded-2xl border border-border/40 bg-card p-7 transition-all duration-200 ease-out hover:-translate-y-1 hover:border-border/80"
      style={{
        borderTopColor: config.color,
        borderTopWidth: "3px",
        boxShadow: "0 1px 3px hsl(0 0% 0% / 0.04), 0 4px 12px hsl(0 0% 0% / 0.03)",
        animationDelay: `${index * 80}ms`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px hsl(0 0% 0% / 0.08), ${config.glow}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px hsl(0 0% 0% / 0.04), 0 4px 12px hsl(0 0% 0% / 0.03)";
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold tracking-tight">{startup.name}</h3>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: config.bg, color: config.color }}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${startup.status === "critical" ? "animate-pulse" : ""}`}
            style={{ backgroundColor: config.color }}
          />
          {config.label}
        </span>
      </div>

      {/* Insight — THE HERO */}
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="text-[13px] font-medium leading-relaxed text-foreground/90 mb-5 cursor-default transition-colors duration-150 hover:text-foreground line-clamp-2">
            {startup.insight}
          </p>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[280px] p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <SparkLine data={startup.sparkData} color={config.color} />
            <span className="text-[11px] font-medium" style={{ color: config.color }}>
              {startup.insightTrend}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-popover-foreground/80">{startup.insightDetail}</p>
          <p className="text-[10px] text-muted-foreground">{startup.insightLastUpdated}</p>
        </TooltipContent>
      </Tooltip>

      {/* Metrics */}
      <div className="flex gap-6 mb-6">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Runway</p>
          <p className="text-sm font-semibold tabular-nums">{startup.runway}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Growth</p>
          <div className="flex items-center gap-1">
            <p className="text-sm font-semibold tabular-nums">{startup.growth}</p>
            {startup.growthDirection === "up" ? (
              <TrendingUp className="h-3.5 w-3.5" style={{ color: "hsl(142 71% 45%)" }} />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" style={{ color: "hsl(0 84% 60%)" }} />
            )}
          </div>
        </div>
      </div>

      {/* Actions — Fix is PRIMARY */}
      <div className="flex gap-2.5">
        <Button
          size="sm"
          variant="default"
          className="flex-1 font-semibold active:scale-[0.97] transition-transform duration-100"
          onClick={() => onFix(startup)}
        >
          Fix
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 text-muted-foreground hover:text-foreground active:scale-[0.97] transition-transform duration-100"
          onClick={() => navigate(`/startup/${startup.id}`)}
        >
          View
        </Button>
      </div>
    </div>
  );
};

export default StartupCard;
