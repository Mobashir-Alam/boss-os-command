import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { useStartups } from "@/hooks/useStartups";
import { usePeople } from "@/hooks/usePeople";
import { useTaskContext } from "@/contexts/TaskContext";
import {
  weeklyBrief, founderPatterns, founderTimeAllocation,
  startupSignals, crossStartupInsights, capitalAllocations,
} from "@/data/kai";
import { statusConfig, criticalAlerts } from "@/data/startups";
import { startupDepartmentCatalog } from "@/hooks/useStartupHub";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  AlertTriangle, ArrowUpRight, ArrowDownRight, Crosshair, Gauge,
  ChevronRight, ArrowRight, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SparkLine from "@/components/SparkLine";

type Mode = "founder" | "operator";

const todayLabel = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const statusToTone = (status: string): "positive" | "warning" | "critical" | "neutral" => {
  if (status === "critical") return "critical";
  if (status === "at-risk") return "warning";
  if (status === "healthy") return "positive";
  return "neutral";
};

const toneStyles: Record<string, { dot: string; chip: string; text: string }> = {
  positive: {
    dot: "bg-signal-positive",
    chip: "bg-signal-positive-soft text-signal-positive border-signal-positive/20",
    text: "text-signal-positive",
  },
  warning: {
    dot: "bg-signal-warning",
    chip: "bg-signal-warning-soft text-signal-warning border-signal-warning/20",
    text: "text-signal-warning",
  },
  critical: {
    dot: "bg-signal-critical",
    chip: "bg-signal-critical-soft text-signal-critical border-signal-critical/20",
    text: "text-signal-critical",
  },
  neutral: {
    dot: "bg-muted-foreground",
    chip: "bg-muted text-muted-foreground border-border",
    text: "text-muted-foreground",
  },
};

const FounderCommandCenter = () => {
  const [mode, setMode] = useState<Mode>("founder");
  const { startups } = useStartups();
  const { people } = usePeople();
  const { getTaskStats, getOverdueTasks, tasks } = useTaskContext();
  const stats = getTaskStats();
  const overdueTasks = getOverdueTasks();

  const activePeople = people.filter(p => p.status === "active");
  const totalSalaryBurn = activePeople.reduce((s, p) => s + p.salary, 0);
  const avgEfficiency = activePeople.length
    ? Math.round(activePeople.reduce((s, p) => s + p.productivity_score, 0) / activePeople.length)
    : 0;

  const blockedTasks = tasks.filter(t => t.status === "blocked");

  const criticalStartups = startups.filter(s => s.status === "critical");
  const atRiskStartups = startups.filter(s => s.status === "at-risk");
  const healthyStartups = startups.filter(s => s.status === "healthy");

  // Department-aware cross-portfolio synthesis (heuristic from people.department)
  const departmentIntel = useMemo(() => {
    return startupDepartmentCatalog.map(({ key, name }) => {
      const matchers = key.split("_");
      const matched = activePeople.filter((p) =>
        matchers.some((m) => p.department?.toLowerCase().includes(m))
      );
      const headcount = matched.length;
      const avgScore = matched.length
        ? Math.round(matched.reduce((s, p) => s + p.productivity_score, 0) / matched.length)
        : 0;
      const tone: "positive" | "warning" | "critical" | "neutral" =
        headcount === 0 ? "neutral"
        : avgScore >= 70 ? "positive"
        : avgScore >= 50 ? "warning"
        : "critical";
      return { key, name, headcount, avgScore, tone };
    });
  }, [activePeople]);

  const portfolioStatusLine = criticalStartups.length > 0
    ? `${criticalStartups.length} critical · ${atRiskStartups.length} at risk · ${healthyStartups.length} healthy`
    : `All ${startups.length} companies operational`;

  const handleAcceptDecision = (d: string) => {
    toast.success("Decision accepted", { description: d });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* EXECUTIVE BAR */}
      <header className="border-b border-border-strong/40 bg-paper">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-baseline gap-4">
              <span className="eyebrow">Founder Edition · {todayLabel}</span>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
              <button
                onClick={() => setMode("founder")}
                className={cn(
                  "px-3 py-1 rounded-sm text-[11px] font-semibold uppercase tracking-wider transition-all",
                  mode === "founder"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Crosshair className="h-3 w-3 inline mr-1.5" />Strategic
              </button>
              <button
                onClick={() => setMode("operator")}
                className={cn(
                  "px-3 py-1 rounded-sm text-[11px] font-semibold uppercase tracking-wider transition-all",
                  mode === "operator"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Gauge className="h-3 w-3 inline mr-1.5" />Operator
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h1 className="font-display text-5xl font-semibold leading-none tracking-tight">
                The Command Brief
              </h1>
              <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
                {portfolioStatusLine}. Synthesised across {startups.length} portfolio companies and {activePeople.length} active operators.
              </p>
            </div>
            <dl className="flex items-end gap-8 text-right">
              <Stat label="Companies" value={startups.length.toString()} />
              <Stat label="Headcount" value={activePeople.length.toString()} />
              <Stat label="Salary / mo" value={`₹${(totalSalaryBurn / 100000).toFixed(1)}L`} />
              <Stat label="Avg Efficiency" value={`${avgEfficiency}%`} tone={avgEfficiency >= 70 ? "positive" : avgEfficiency >= 50 ? "warning" : "critical"} />
            </dl>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-10">

        {/* CRITICAL TICKER */}
        {criticalAlerts.filter(a => a.severity === "critical").length > 0 && (
          <section className="border-y border-signal-critical/30 bg-signal-critical-soft -mx-6 px-6 py-3">
            <div className="mx-auto max-w-7xl flex items-center gap-4 flex-wrap">
              <span className="eyebrow text-signal-critical">Live · Critical</span>
              <div className="flex items-center gap-6 flex-wrap text-sm">
                {criticalAlerts.filter(a => a.severity === "critical").map(a => (
                  <Link key={a.id} to={`/startup/${a.startupId}`} className="group flex items-center gap-2 text-signal-critical hover:underline underline-offset-4">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="font-medium">{a.text}</span>
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* KAI STRATEGIC BRIEF — Hero */}
        {mode === "founder" && (
          <section className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 paper-card-elevated p-8">
              <div className="flex items-center justify-between mb-5">
                <span className="eyebrow">KAI Strategic Brief</span>
                <span className="text-[10px] text-muted-foreground font-mono">UPDATED 06:00</span>
              </div>

              <p className="font-display text-2xl leading-snug text-foreground/90 mb-6">
                {weeklyBrief.status}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border mb-6">
                <div className="bg-card p-5">
                  <span className="eyebrow text-signal-critical">Biggest Risk</span>
                  <p className="mt-2 text-sm text-foreground/85 leading-relaxed">{weeklyBrief.biggestRisk}</p>
                </div>
                <div className="bg-card p-5">
                  <span className="eyebrow text-signal-positive">Biggest Opportunity</span>
                  <p className="mt-2 text-sm text-foreground/85 leading-relaxed">{weeklyBrief.biggestOpportunity}</p>
                </div>
              </div>

              <div>
                <span className="eyebrow mb-2 block">Top Decisions Awaiting You</span>
                <ul className="divide-y divide-border">
                  {weeklyBrief.strategicDecisions.slice(0, 3).map((d, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-sm text-foreground/85 flex-1">
                        <span className="font-mono text-[10px] text-muted-foreground mr-2">{String(i + 1).padStart(2, "0")}</span>
                        {d}
                      </span>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-[11px] font-semibold uppercase tracking-wider text-accent hover:bg-accent-soft"
                        onClick={() => handleAcceptDecision(d)}
                      >
                        Accept →
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Founder Focus sidebar */}
            <aside className="col-span-12 lg:col-span-4 paper-card p-6 bg-paper">
              <span className="eyebrow text-accent">Founder Focus</span>
              <p className="font-display text-xl leading-snug mt-3 mb-5">
                Where your hours are going this week.
              </p>
              <p className="text-sm text-foreground/75 leading-relaxed border-l-2 border-accent pl-4">
                {founderTimeAllocation.insight}
              </p>
              <div className="editorial-rule my-5" />
              <span className="eyebrow mb-2 block">Pattern Watch</span>
              <ul className="space-y-3">
                {founderPatterns.slice(0, 2).map((p, i) => (
                  <li key={i} className="text-xs text-foreground/75 leading-relaxed">
                    <span className="font-display italic text-foreground/60">{p.pattern}</span>
                    <span className="block mt-1 text-accent font-medium">→ {p.suggestion}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </section>
        )}

        {/* PORTFOLIO HEALTH GRID */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <span className="eyebrow">Portfolio Health</span>
              <h2 className="font-display text-2xl mt-1">{startups.length} Companies, One Console</h2>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">Tap any card →</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
            {startups.map(s => {
              const signal = startupSignals[s.id];
              const tone = statusToTone(s.status);
              const ts = toneStyles[tone];
              const cfg = statusConfig[s.status as keyof typeof statusConfig];
              const trendUp = s.growthDirection === "up";
              return (
                <Link key={s.id} to={`/startup/${s.id}`} className="group bg-card p-5 hover:bg-paper transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("h-1.5 w-1.5 rounded-full", ts.dot)} />
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                          {cfg?.label ?? s.status}
                        </span>
                      </div>
                      <h3 className="font-display text-xl mt-1.5 leading-tight group-hover:text-accent transition-colors">
                        {s.name}
                      </h3>
                    </div>
                    {signal && (
                      <span className={cn(
                        "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border",
                        signal.signal === "double-down" && "border-signal-positive/30 text-signal-positive bg-signal-positive-soft",
                        signal.signal === "maintain" && "border-signal-warning/30 text-signal-warning bg-signal-warning-soft",
                        signal.signal === "kill" && "border-signal-critical/30 text-signal-critical bg-signal-critical-soft",
                      )}>
                        {signal.signal === "double-down" ? "2×" : signal.signal === "maintain" ? "Hold" : "Kill"}
                      </span>
                    )}
                  </div>

                  <div className="my-4 h-8 -mx-1">
                    <SparkLine data={s.sparkData} color={`hsl(var(--signal-${tone === "neutral" ? "warning" : tone}))`} width={200} height={32} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/60">
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Runway</span>
                      <span className="numeric text-base mt-0.5 block">{s.runway}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Growth</span>
                      <span className={cn("numeric text-base mt-0.5 flex items-center gap-1", trendUp ? "text-signal-positive" : "text-signal-critical")}>
                        {trendUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        {s.growth}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {s.insight}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* DEPARTMENT-AWARE INTELLIGENCE */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <span className="eyebrow">Cross-Portfolio Departments</span>
              <h2 className="font-display text-2xl mt-1">Departmental health, at a glance</h2>
            </div>
          </div>
          <div className="paper-card overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 divide-x divide-y divide-border">
              {departmentIntel.map((d) => {
                const ts = toneStyles[d.tone];
                return (
                  <div key={d.key} className="p-4 flex items-start justify-between gap-3 bg-card">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-1 w-1 rounded-full", ts.dot)} />
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground truncate">
                          {d.name}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="numeric text-2xl">{d.headcount}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">people</span>
                      </div>
                    </div>
                    {d.headcount > 0 && (
                      <div className="text-right">
                        <span className={cn("numeric text-sm", ts.text)}>{d.avgScore}%</span>
                        <span className="block text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Output</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CAPITAL ALLOCATION + PATTERN SIGNALS — Founder mode */}
        {mode === "founder" && (
          <section className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-7 paper-card p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="eyebrow">Capital Allocation Signals</span>
                <span className="text-[10px] text-muted-foreground font-mono">ROI EST.</span>
              </div>
              <div className="divide-y divide-border">
                {capitalAllocations.map((ca, i) => (
                  <div key={i} className="flex items-center justify-between py-3 gap-4">
                    <div className="flex items-baseline gap-3 min-w-0">
                      <span className="font-mono text-[10px] text-muted-foreground w-6">{String(i + 1).padStart(2, "0")}</span>
                      <div className="min-w-0">
                        <p className="font-display text-base leading-tight">{ca.startup}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{ca.action}</p>
                      </div>
                    </div>
                    <span className="numeric text-base text-signal-positive shrink-0">{ca.roi}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5 paper-card p-6 bg-paper">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="h-3.5 w-3.5 text-accent" />
                <span className="eyebrow text-accent">Cross-Portfolio Patterns</span>
              </div>
              <ul className="space-y-4">
                {crossStartupInsights.slice(0, 3).map((ci) => (
                  <li key={ci.id} className="border-l-2 border-accent pl-4">
                    <p className="text-sm text-foreground/85 leading-snug">{ci.insight}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* OPERATOR DETAIL */}
        {mode === "operator" && (
          <section className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 paper-card p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="eyebrow">Execution Ledger</span>
                <Link to="/my-work" className="text-[11px] text-accent hover:underline underline-offset-2 font-semibold uppercase tracking-wider">
                  Open My Work →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
                <LedgerStat label="In Progress" value={stats.inProgress} />
                <LedgerStat label="Completed" value={stats.completed} tone="positive" />
                <LedgerStat label="Blocked" value={blockedTasks.length} tone="warning" />
                <LedgerStat label="Overdue" value={stats.overdue} tone={stats.overdue > 0 ? "critical" : "neutral"} />
              </div>

              {overdueTasks.length > 0 && (
                <div className="mt-5">
                  <span className="eyebrow text-signal-critical mb-2 block">Overdue items</span>
                  <ul className="divide-y divide-border">
                    {overdueTasks.slice(0, 5).map(t => (
                      <li key={t.id} className="py-2 flex items-center justify-between gap-3">
                        <span className="text-sm text-foreground/85 truncate">{t.title}</span>
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">{t.assignee}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="col-span-12 lg:col-span-4 paper-card p-6 bg-paper">
              <span className="eyebrow">Runway By Company</span>
              <ul className="mt-4 divide-y divide-border">
                {startups.map(s => (
                  <li key={s.id} className="py-2.5 flex items-center justify-between">
                    <Link to={`/startup/${s.id}`} className="text-sm hover:text-accent transition-colors">{s.name}</Link>
                    <span className="numeric text-sm">{s.runway}</span>
                  </li>
                ))}
              </ul>
              <div className="editorial-rule my-4" />
              <Link to="/people" className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold text-accent hover:underline underline-offset-2">
                People OS <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </section>
        )}

      </main>
    </div>
  );
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: "positive" | "warning" | "critical" }) {
  const ts = tone ? toneStyles[tone] : null;
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</dt>
      <dd className={cn("numeric text-2xl mt-0.5", ts?.text)}>{value}</dd>
    </div>
  );
}

function LedgerStat({
  label, value, tone = "neutral",
}: { label: string; value: number; tone?: "positive" | "warning" | "critical" | "neutral" }) {
  const ts = toneStyles[tone];
  return (
    <div className="bg-card p-4">
      <span className="eyebrow">{label}</span>
      <p className={cn("numeric text-3xl mt-1", ts.text)}>{value}</p>
    </div>
  );
}

export default FounderCommandCenter;
