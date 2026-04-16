import { useState } from "react";
import Navbar from "@/components/Navbar";
import { useStartups } from "@/hooks/useStartups";
import { usePeople } from "@/hooks/usePeople";
import { useTaskContext } from "@/contexts/TaskContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  weeklyBrief, founderPatterns, founderTimeAllocation,
  startupSignals, crossStartupInsights, capitalAllocations,
} from "@/data/kai";
import { statusConfig, criticalAlerts } from "@/data/startups";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown,
  Users, DollarSign, Shield, Rocket, Zap, Eye, Crosshair,
  ChevronRight, ListTodo, Target, Brain, ArrowRight, Gauge
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import SparkLine from "@/components/SparkLine";

type Mode = "founder" | "operator";

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
  const inProgressTasks = tasks.filter(t => t.status === "in-progress");

  const criticalStartups = startups.filter(s => s.status === "critical");
  const atRiskStartups = startups.filter(s => s.status === "at-risk");

  const statusColor = (status: string) => {
    const c = statusConfig[status as keyof typeof statusConfig];
    return c?.color ?? "hsl(var(--muted-foreground))";
  };

  const handleAcceptDecision = (d: string) => {
    toast.success("Decision accepted", { description: d });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">

        {/* Header + Mode Switch */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Command Center</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {criticalStartups.length > 0
                ? `${criticalStartups.length} critical, ${atRiskStartups.length} at risk`
                : "All systems operational"}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 p-0.5">
            <button
              onClick={() => setMode("founder")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                mode === "founder"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Crosshair className="h-3 w-3 inline mr-1" />Founder
            </button>
            <button
              onClick={() => setMode("operator")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                mode === "operator"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Gauge className="h-3 w-3 inline mr-1" />Operator
            </button>
          </div>
        </div>

        {/* CRITICAL SIGNALS */}
        {criticalAlerts.filter(a => a.severity === "critical").length > 0 && (
          <div className="mb-5 space-y-1.5">
            {criticalAlerts
              .filter(a => a.severity === "critical")
              .map(a => (
                <div key={a.id} className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5">
                  <span className="text-sm">{a.icon}</span>
                  <span className="text-sm font-medium text-destructive flex-1">{a.text}</span>
                  <Link to={`/startup/${a.startupId}`}>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive">
                      View <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </Link>
                </div>
              ))}
          </div>
        )}

        {/* KAI COMMAND CORE — Founder Mode */}
        {mode === "founder" && (
          <Card className="mb-5 border-primary/20 bg-primary/[0.02]">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">KAI Weekly Brief</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-3">
              <p className="text-sm text-foreground/80">{weeklyBrief.status}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
                  <span className="text-[10px] uppercase tracking-wider text-destructive/70 font-semibold">Biggest Risk</span>
                  <p className="text-xs mt-1 text-foreground/80">{weeklyBrief.biggestRisk}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-600/70 font-semibold">Biggest Opportunity</span>
                  <p className="text-xs mt-1 text-foreground/80">{weeklyBrief.biggestOpportunity}</p>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Top Decisions</span>
                <div className="mt-1.5 space-y-1">
                  {weeklyBrief.strategicDecisions.slice(0, 3).map((d, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-1.5">
                      <span className="text-xs text-foreground/80 flex-1">{d}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-2 text-[10px] text-primary"
                        onClick={() => handleAcceptDecision(d)}
                      >
                        Accept
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              {/* Founder Focus */}
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2">
                <Target className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/70">{founderTimeAllocation.insight}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PORTFOLIO HEALTH */}
        <div className="mb-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Portfolio Health</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {startups.map(s => {
              const signal = startupSignals[s.id];
              return (
                <Link key={s.id} to={`/startup/${s.id}`}>
                  <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{s.name}</span>
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: statusColor(s.status) }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>🕐 {s.runway}</span>
                        <span className={s.growthDirection === "up" ? "text-emerald-500" : "text-destructive"}>
                          {s.growthDirection === "up" ? "↑" : "↓"} {s.growth}
                        </span>
                      </div>
                      <div className="h-6">
                        <SparkLine data={s.sparkData} color={statusColor(s.status)} />
                      </div>
                      {signal && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            signal.signal === "double-down" && "border-emerald-500/40 text-emerald-500",
                            signal.signal === "maintain" && "border-amber-500/40 text-amber-500",
                            signal.signal === "kill" && "border-destructive/40 text-destructive"
                          )}
                        >
                          {signal.signal === "double-down" ? "Double Down" : signal.signal === "maintain" ? "Maintain" : "Kill"}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* EXECUTION + FINANCIAL + TEAM — Operator Mode gets more detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">

          {/* EXECUTION STATUS */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <ListTodo className="h-3.5 w-3.5 text-blue-500" />
                <CardTitle className="text-xs">Execution</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">In Progress</span>
                <span className="font-medium">{stats.inProgress}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium text-emerald-500">{stats.completed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Blocked</span>
                <span className="font-medium text-amber-500">{blockedTasks.length}</span>
              </div>
              {stats.overdue > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-destructive">Overdue</span>
                  <span className="font-semibold text-destructive">{stats.overdue}</span>
                </div>
              )}
              {mode === "operator" && blockedTasks.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Blocked</span>
                  {blockedTasks.slice(0, 3).map(t => (
                    <div key={t.id} className="text-xs text-foreground/70 truncate">• {t.title}</div>
                  ))}
                </div>
              )}
              <Link to="/my-work">
                <Button variant="ghost" size="sm" className="w-full h-7 text-xs mt-1">
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* FINANCIAL POSITION */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                <CardTitle className="text-xs">Financial Position</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {startups.map(s => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="font-medium">{s.runway}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-border/50 flex justify-between text-sm">
                <span className="text-muted-foreground">Salary Burn</span>
                <span className="font-medium">₹{(totalSalaryBurn / 100000).toFixed(1)}L/mo</span>
              </div>
            </CardContent>
          </Card>

          {/* TEAM SNAPSHOT */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-violet-500" />
                <CardTitle className="text-xs">Team</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Team Size</span>
                <span className="font-medium">{activePeople.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Salary Burn</span>
                <span className="font-medium">₹{(totalSalaryBurn / 100000).toFixed(1)}L/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Efficiency</span>
                <span className={cn("font-medium", avgEfficiency >= 70 ? "text-emerald-500" : avgEfficiency >= 50 ? "text-amber-500" : "text-destructive")}>
                  {avgEfficiency}%
                </span>
              </div>
              <Link to="/people">
                <Button variant="ghost" size="sm" className="w-full h-7 text-xs mt-1">
                  People OS <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* GROWTH + PRODUCT + OWNERSHIP SIGNALS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">

          {/* GROWTH SIGNALS */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <CardTitle className="text-xs">Growth Signals</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {startups.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className={cn("font-medium", s.growthDirection === "up" ? "text-emerald-500" : "text-destructive")}>
                    {s.growth}
                  </span>
                </div>
              ))}
              {crossStartupInsights.slice(0, 1).map(ci => (
                <div key={ci.id} className="mt-2 pt-2 border-t border-border/50">
                  <div className="flex items-start gap-1.5">
                    <Zap className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                    <p className="text-[11px] text-foreground/70">{ci.insight}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* PRODUCT SIGNALS */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <Rocket className="h-3.5 w-3.5 text-blue-500" />
                <CardTitle className="text-xs">Product Signals</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {startups.slice(0, 4).map(s => (
                <Link key={s.id} to={`/startup/${s.id}`} className="flex items-center justify-between text-sm hover:text-primary transition-colors">
                  <span className="text-muted-foreground">{s.name}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </Link>
              ))}
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="flex items-start gap-1.5">
                  <Zap className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                  <p className="text-[11px] text-foreground/70">View Product Engine per startup for feature impact & tech risks.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* OWNERSHIP SIGNALS */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-amber-500" />
                <CardTitle className="text-xs">Ownership Signals</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {startups.slice(0, 4).map(s => (
                <Link key={s.id} to={`/startup/${s.id}/ownership`} className="flex items-center justify-between text-sm hover:text-primary transition-colors">
                  <span className="text-muted-foreground">{s.name}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </Link>
              ))}
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="flex items-start gap-1.5">
                  <Shield className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-foreground/70">Check dilution & control risk per startup in Ownership Engine.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* OPERATOR MODE — Overdue & Blocked detail */}
        {mode === "operator" && overdueTasks.length > 0 && (
          <Card className="mb-5 border-destructive/20">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-destructive" />
                <CardTitle className="text-xs text-destructive">Overdue Tasks</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1.5">
              {overdueTasks.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between rounded-md bg-destructive/5 px-3 py-1.5">
                  <span className="text-xs text-foreground/80 truncate flex-1">{t.title}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{t.assignee}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* CAPITAL ALLOCATION — Founder mode */}
        {mode === "founder" && (
          <Card className="mb-5">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                <CardTitle className="text-xs">Capital Allocation</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1.5">
              {capitalAllocations.map((ca, i) => (
                <div key={i} className="flex items-center justify-between rounded-md bg-muted/20 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium">{ca.startup}</span>
                    <p className="text-[11px] text-muted-foreground truncate">{ca.action}</p>
                  </div>
                  <span className="text-[10px] text-emerald-500 font-medium ml-3 shrink-0">{ca.roi}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* FOUNDER PATTERNS — Founder mode */}
        {mode === "founder" && (
          <Card className="mb-5 border-amber-500/20">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-amber-500" />
                <CardTitle className="text-xs">Founder Patterns</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {founderPatterns.map((p, i) => (
                <div key={i} className="rounded-md bg-muted/20 px-3 py-2">
                  <p className="text-xs text-foreground/80">{p.pattern}</p>
                  <p className="text-[11px] text-primary mt-1">→ {p.suggestion}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
};

export default FounderCommandCenter;
