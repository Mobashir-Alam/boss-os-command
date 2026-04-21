import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Crosshair,
  Flame,
  Gauge,
  Brain,
  Lightbulb,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useFounderOverview } from "@/hooks/useFounderOverview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusConfig } from "@/data/startups";
import { toast } from "sonner";

type Mode = "founder" | "operator";

const statusToTone = (status: string): "positive" | "warning" | "critical" | "neutral" => {
  if (status === "critical") return "critical";
  if (status === "at-risk") return "warning";
  if (status === "healthy") return "positive";
  return "neutral";
};

const toneDot: Record<string, string> = {
  positive: "bg-signal-positive",
  warning: "bg-signal-warning",
  critical: "bg-signal-critical",
  neutral: "bg-muted-foreground",
};

const FounderCommandCenter = () => {
  const [mode, setMode] = useState<Mode>("founder");
  const overview = useFounderOverview();

  const handleAcceptDecision = (decision: string) => {
    toast.success("Decision captured", { description: decision });
  };

  const criticalCount = overview.companies.filter((c) => c.signal === "stabilize").length;
  const atRiskCount = overview.companies.filter((c) => c.signal === "maintain").length;

  const alertItems = overview.alerts
    .filter((a) => a.severity === "critical" || a.severity === "warning")
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              Command Center
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {criticalCount} critical, {atRiskCount} at risk
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
            <button
              onClick={() => setMode("founder")}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-all",
                mode === "founder"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Crosshair className="h-3.5 w-3.5" />
              Founder
            </button>
            <button
              onClick={() => setMode("operator")}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-all",
                mode === "operator"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Gauge className="h-3.5 w-3.5" />
              Operator
            </button>
          </div>
        </header>

        {/* Alert strips */}
        {alertItems.length > 0 && (
          <section className="space-y-3">
            {alertItems.map((alert) => {
              const isCritical = alert.severity === "critical";
              return (
                <Link
                  key={alert.id}
                  to={`/startup/${alert.startupSlug}`}
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-md border px-5 py-4 transition-colors group",
                    isCritical
                      ? "border-signal-critical/30 bg-signal-critical-soft hover:bg-signal-critical-soft/80"
                      : "border-signal-warning/30 bg-signal-warning-soft hover:bg-signal-warning-soft/80",
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isCritical ? (
                      <Flame className="h-4 w-4 text-signal-critical" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-signal-warning" />
                    )}
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isCritical ? "text-signal-critical" : "text-signal-warning",
                      )}
                    >
                      {alert.text}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    View
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              );
            })}
          </section>
        )}

        {/* KAI Weekly Brief */}
        <section className="paper-card-elevated p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-4 w-4" />
            <h2 className="text-sm font-semibold">KAI Weekly Brief</h2>
          </div>

          <p className="text-base text-foreground/90 mb-6">
            {overview.strategicBrief.status}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="rounded-md border border-signal-critical/20 bg-signal-critical-soft px-4 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-signal-critical">
                Biggest Risk
              </span>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                {overview.strategicBrief.biggestRisk}
              </p>
            </div>
            <div className="rounded-md border border-signal-positive/20 bg-signal-positive-soft px-4 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-signal-positive">
                Biggest Opportunity
              </span>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                {overview.strategicBrief.biggestOpportunity}
              </p>
            </div>
          </div>

          <div className="mb-5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Top Decisions
            </span>
            <ul className="mt-2 divide-y divide-border">
              {overview.strategicBrief.topDecisions.length > 0 ? (
                overview.strategicBrief.topDecisions.map((decision) => (
                  <li
                    key={decision.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <span className="flex-1 text-sm text-foreground/85">
                      {decision.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-3 text-xs font-medium text-accent hover:bg-accent-soft"
                      onClick={() => handleAcceptDecision(decision.text)}
                    >
                      Accept
                    </Button>
                  </li>
                ))
              ) : (
                <li className="py-3 text-sm text-muted-foreground">
                  No decisions awaiting input.
                </li>
              )}
            </ul>
          </div>

          {overview.strategicBrief.patternSignals.length > 0 && (
            <div className="rounded-md border border-signal-warning/20 bg-signal-warning-soft/60 px-4 py-3 flex items-start gap-3">
              <Lightbulb className="h-4 w-4 text-signal-warning shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80 leading-relaxed">
                {overview.strategicBrief.patternSignals[0].pattern}
              </p>
            </div>
          )}
        </section>

        {/* Portfolio Health */}
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Portfolio Health
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {overview.companies.map((company) => {
              const tone = statusToTone(company.status);
              const config = statusConfig[company.status];
              const trendUp = (company.growthPercent ?? 0) >= 0;
              return (
                <Link
                  key={company.startupSlug}
                  to={`/startup/${company.startupSlug}`}
                  className="paper-card p-4 transition-colors hover:bg-paper group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-display text-lg font-semibold leading-tight group-hover:text-accent transition-colors">
                      {company.name}
                    </h3>
                    <span className={cn("h-2 w-2 rounded-full mt-2", toneDot[tone])} aria-label={config?.label ?? company.status} />
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Gauge className="h-3.5 w-3.5" />
                      <span>{company.runwayLabel}</span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        trendUp ? "text-signal-positive" : "text-signal-critical",
                      )}
                    >
                      {trendUp ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                      <span className="font-medium">{company.growthLabel}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default FounderCommandCenter;
