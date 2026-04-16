import { useMemo } from "react";
import { usePeople, Person } from "@/hooks/usePeople";
import { useBurnCategories, useFinancialEntries } from "@/hooks/useFinancialData";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain, DollarSign, TrendingUp, TrendingDown, Users, Zap,
  AlertTriangle, UserPlus, ArrowDown, ArrowUp, Gauge, Target,
  Minus, BarChart3, Shuffle
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  founder: "Founder", mfo: "MFO", functional_head: "Func Head",
  project_manager: "PM", team_member: "Team",
};

interface Props { startupId: string; runway?: string }

export default function TeamEfficiencyEngine({ startupId, runway }: Props) {
  const { people: allPeople, isLoading } = usePeople();
  const { data: burnCats } = useBurnCategories(startupId);
  const { data: finEntries } = useFinancialEntries(startupId);

  const people = useMemo(() => allPeople.filter((p) => p.linked_startups?.includes(startupId)), [allPeople, startupId]);

  // ─── Aggregates ───
  const totalSalary = people.reduce((s, p) => s + (p.salary || 0), 0);
  const totalCtc = people.reduce((s, p) => s + (p.cost_to_company || 0), 0);
  const totalBurn = (burnCats || []).reduce((s, b) => s + (b.monthly_amount || 0), 0);
  const salaryPctOfBurn = totalBurn > 0 ? Math.round((totalSalary / totalBurn) * 100) : 0;

  const avgKpi = people.length ? Math.round(people.reduce((s, p) => s + (p.kpi_score || 0), 0) / people.length) : 0;
  const avgProductivity = people.length ? Math.round(people.reduce((s, p) => s + (p.productivity_score || 0), 0) / people.length) : 0;
  const totalTasksAssigned = people.reduce((s, p) => s + (p.tasks_assigned || 0), 0);
  const totalTasksCompleted = people.reduce((s, p) => s + (p.tasks_completed || 0), 0);
  const taskCompletionRate = totalTasksAssigned ? Math.round((totalTasksCompleted / totalTasksAssigned) * 100) : 0;
  const totalHoursCommitted = people.reduce((s, p) => s + (p.hours_committed || 0), 0);
  const totalHoursDelivered = people.reduce((s, p) => s + (p.hours_delivered || 0), 0);

  // Team Efficiency Score: weighted blend of KPI, productivity, task rate
  const efficiencyScore = Math.round((avgKpi * 0.4) + (avgProductivity * 0.3) + (taskCompletionRate * 0.3));

  // Department breakdown
  const departments = useMemo(() => {
    const depts: Record<string, Person[]> = {};
    people.forEach((p) => { const d = p.department || "Unassigned"; (depts[d] = depts[d] || []).push(p); });
    return Object.entries(depts).map(([name, members]) => ({
      name, count: members.length,
      salary: members.reduce((s, p) => s + (p.salary || 0), 0),
      avgKpi: Math.round(members.reduce((s, p) => s + (p.kpi_score || 0), 0) / members.length),
      avgProd: Math.round(members.reduce((s, p) => s + (p.productivity_score || 0), 0) / members.length),
      tasksTotal: members.reduce((s, p) => s + (p.tasks_assigned || 0), 0),
      tasksDone: members.reduce((s, p) => s + (p.tasks_completed || 0), 0),
    })).sort((a, b) => b.salary - a.salary);
  }, [people]);

  // Per-person cost efficiency
  const personEfficiency = useMemo(() =>
    people.map((p) => {
      const output = (p.kpi_score * 0.4 + p.productivity_score * 0.3 + (p.tasks_assigned ? (p.tasks_completed / p.tasks_assigned) * 100 : 0) * 0.3);
      const costPerLakh = p.salary ? p.salary / 100000 : 0;
      const efficiency = costPerLakh > 0 ? Math.round(output / costPerLakh * 10) / 10 : 0;
      return { ...p, output: Math.round(output), efficiency };
    }).sort((a, b) => b.efficiency - a.efficiency),
    [people]
  );

  // Runway simulation
  const runwayMonths = runway ? parseFloat(runway) || 0 : 0;
  const monthlyBurnNet = totalBurn || totalSalary;
  const simHire = monthlyBurnNet > 0 ? Math.round((runwayMonths * monthlyBurnNet) / (monthlyBurnNet + 80000) * 10) / 10 : 0;
  const simDownsize = monthlyBurnNet > 0 && people.length > 0 ? Math.round((runwayMonths * monthlyBurnNet) / (monthlyBurnNet - (totalSalary / people.length)) * 10) / 10 : 0;

  // Team Load
  const overloaded = departments.filter((d) => d.tasksTotal > 0 && d.tasksDone / d.tasksTotal < 0.4);
  const underutilized = departments.filter((d) => d.avgProd < 40 && d.count > 1);

  // ─── KAI Insights ───
  const kaiInsights = useMemo(() => {
    const ins: { icon: typeof AlertTriangle; text: string; type: "warning" | "success" | "info" }[] = [];
    if (efficiencyScore < 50) ins.push({ icon: TrendingDown, text: `Team efficiency at ${efficiencyScore}% — cost is high relative to output`, type: "warning" });
    if (efficiencyScore >= 75) ins.push({ icon: TrendingUp, text: `Strong team efficiency at ${efficiencyScore}%`, type: "success" });
    if (salaryPctOfBurn > 70) ins.push({ icon: DollarSign, text: `Salary burn is ${salaryPctOfBurn}% of total — consider optimizing team structure`, type: "warning" });
    if (simHire > 0 && simHire < runwayMonths * 0.7) ins.push({ icon: UserPlus, text: `Hiring now would reduce runway from ${runwayMonths} to ~${simHire} months — delay if possible`, type: "warning" });
    if (simHire > 0 && simHire >= runwayMonths * 0.7) ins.push({ icon: UserPlus, text: `Safe to hire — runway impact is manageable (~${simHire} months)`, type: "success" });
    if (overloaded.length > 0) ins.push({ icon: AlertTriangle, text: `${overloaded.map((d) => d.name).join(", ")} ${overloaded.length > 1 ? "are" : "is"} overloaded — consider hiring or redistributing`, type: "warning" });
    if (underutilized.length > 0) ins.push({ icon: Shuffle, text: `${underutilized.map((d) => d.name).join(", ")} underutilized — reassign or restructure`, type: "info" });
    const highCostLowOutput = personEfficiency.filter((p) => p.salary > 100000 && p.output < 40);
    if (highCostLowOutput.length > 0) ins.push({ icon: AlertTriangle, text: `${highCostLowOutput.length} high-cost role${highCostLowOutput.length > 1 ? "s" : ""} with low output — review ${highCostLowOutput.map((p) => p.full_name).join(", ")}`, type: "warning" });
    if (avgProductivity > 0 && totalSalary > 0 && avgProductivity < 50) ins.push({ icon: Shuffle, text: "Reassigning team across departments can improve efficiency", type: "info" });
    if (ins.length === 0) ins.push({ icon: Zap, text: "Team cost and output are well balanced", type: "success" });
    return ins;
  }, [efficiencyScore, salaryPctOfBurn, simHire, runwayMonths, overloaded, underutilized, personEfficiency, avgProductivity, totalSalary]);

  if (isLoading) return <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>;
  if (people.length === 0) return (
    <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
      <Gauge className="h-6 w-6 mx-auto mb-2 opacity-30" />
      <p className="text-sm text-muted-foreground">Add team members in the People tab to power the Efficiency Engine</p>
    </div>
  );

  const effColor = efficiencyScore >= 75 ? "text-emerald-400" : efficiencyScore >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Gauge className="h-4 w-4" /> Team Efficiency Engine
      </h3>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Salary Burn", value: `₹${(totalSalary / 100000).toFixed(1)}L`, sub: `${salaryPctOfBurn}% of burn`, icon: DollarSign },
          { label: "Efficiency", value: `${efficiencyScore}%`, sub: efficiencyScore >= 75 ? "Strong" : efficiencyScore >= 50 ? "Average" : "Low", icon: Gauge },
          { label: "Avg KPI", value: `${avgKpi}%`, sub: `${totalTasksCompleted}/${totalTasksAssigned} tasks`, icon: Target },
          { label: "Productivity", value: `${avgProductivity}%`, sub: `${totalHoursDelivered}/${totalHoursCommitted}h`, icon: BarChart3 },
          { label: "Team Size", value: people.length.toString(), sub: `${departments.length} depts`, icon: Users },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-xl border border-border/60 bg-card p-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.label}</p>
              </div>
              <p className="text-lg font-bold">{c.value}</p>
              <p className="text-[10px] text-muted-foreground">{c.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Output vs Cost — per person */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 font-semibold">Output vs Cost</p>
        <div className="space-y-2.5">
          {personEfficiency.map((p) => {
            const salaryBar = totalSalary ? ((p.salary || 0) / totalSalary) * 100 : 0;
            return (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-28 shrink-0">
                  <p className="text-xs font-medium truncate">{p.full_name}</p>
                  <p className="text-[9px] text-muted-foreground">{ROLE_LABELS[p.role]}</p>
                </div>
                <div className="flex-1 relative h-6 bg-muted/20 rounded overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-primary/15 rounded" style={{ width: `${salaryBar}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded" style={{
                    width: `${p.output}%`,
                    background: p.output >= 70 ? "hsl(var(--primary) / 0.35)" : p.output >= 40 ? "hsl(45 100% 50% / 0.2)" : "hsl(0 80% 50% / 0.2)"
                  }} />
                  <div className="absolute inset-0 flex items-center justify-between px-2 text-[9px]">
                    <span className="text-muted-foreground">₹{((p.salary || 0) / 1000).toFixed(0)}K</span>
                    <span className="font-medium">{p.output}% output</span>
                  </div>
                </div>
                <span className={cn("text-[10px] tabular-nums w-16 text-right font-medium",
                  p.efficiency >= 10 ? "text-emerald-400" : p.efficiency >= 5 ? "text-amber-400" : "text-red-400"
                )}>{p.efficiency} pts/L</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Department Cost Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 font-semibold">Department Cost</p>
          <div className="space-y-2">
            {departments.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="text-xs font-medium w-20 truncate">{d.name}</span>
                <div className="flex-1"><Progress value={totalSalary ? (d.salary / totalSalary) * 100 : 0} className="h-1.5" /></div>
                <div className="text-right w-24">
                  <span className="text-[10px] tabular-nums">₹{(d.salary / 100000).toFixed(1)}L</span>
                  <span className="text-[9px] text-muted-foreground ml-1">· {d.avgKpi}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Load */}
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 font-semibold">Team Load</p>
          <div className="space-y-2">
            {departments.map((d) => {
              const taskRate = d.tasksTotal ? Math.round((d.tasksDone / d.tasksTotal) * 100) : 0;
              const status = taskRate < 40 ? "overloaded" : d.avgProd < 40 ? "underutilized" : "balanced";
              const statusColor = status === "overloaded" ? "text-red-400" : status === "underutilized" ? "text-amber-400" : "text-emerald-400";
              return (
                <div key={d.name} className="flex items-center justify-between py-1 border-b border-border/20 last:border-0">
                  <div>
                    <span className="text-xs font-medium">{d.name}</span>
                    <span className="text-[9px] text-muted-foreground ml-2">{d.count} people</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] tabular-nums text-muted-foreground">{d.tasksDone}/{d.tasksTotal} tasks</span>
                    <Badge variant="outline" className={cn("text-[9px] px-1 py-0 border-current", statusColor)}>
                      {status === "overloaded" ? "Overloaded" : status === "underutilized" ? "Low util" : "Balanced"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Runway Impact Simulation */}
      {runwayMonths > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 font-semibold">Runway Impact</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[9px] text-muted-foreground uppercase mb-1">Current Team</p>
              <p className="text-xl font-bold">{runwayMonths}<span className="text-xs text-muted-foreground ml-0.5">mo</span></p>
              <Minus className="h-3 w-3 mx-auto text-muted-foreground mt-1" />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground uppercase mb-1">+1 Hire (₹80K)</p>
              <p className={cn("text-xl font-bold", simHire < runwayMonths * 0.7 ? "text-red-400" : "text-emerald-400")}>{simHire}<span className="text-xs text-muted-foreground ml-0.5">mo</span></p>
              <ArrowDown className="h-3 w-3 mx-auto text-red-400 mt-1" />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground uppercase mb-1">-1 (avg salary)</p>
              <p className="text-xl font-bold text-emerald-400">{simDownsize > 99 ? "99+" : simDownsize}<span className="text-xs text-muted-foreground ml-0.5">mo</span></p>
              <ArrowUp className="h-3 w-3 mx-auto text-emerald-400 mt-1" />
            </div>
          </div>
        </div>
      )}

      {/* KAI Insights */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">KAI Efficiency Insights</p>
        </div>
        <div className="space-y-2">
          {kaiInsights.map((ins, i) => {
            const Icon = ins.icon;
            return (
              <div key={i} className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs",
                ins.type === "warning" ? "bg-amber-500/5 text-amber-300" :
                ins.type === "success" ? "bg-emerald-500/5 text-emerald-300" :
                "bg-blue-500/5 text-blue-300"
              )}>
                <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{ins.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
