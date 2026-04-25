import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import AskKai from "@/components/AskKai";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Crosshair,
  Eye,
  Gauge,
  Layers,
  Calendar,
  Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SparkLine from "@/components/SparkLine";
import { useFounderOverview } from "@/hooks/useFounderOverview";
import { useMyProjects, type Project } from "@/hooks/useEmployeeProjects";
import CreateProjectModal from "@/components/project/CreateProjectModal";
import { Plus } from "lucide-react";
import { useStartups } from "@/hooks/useStartups";
import { useTaskContext } from "@/contexts/TaskContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusConfig } from "@/data/startups";
import { toast } from "sonner";

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

const signalLabel: Record<string, string> = {
  "double-down": "Double Down",
  maintain: "Maintain",
  stabilize: "Stabilize",
};

const PROJECT_STATUS_COLOR: Record<string, string> = {
  active:    "text-emerald-700 bg-emerald-500/10 border-emerald-500/20",
  paused:    "text-amber-700 bg-amber-500/10 border-amber-500/20",
  completed: "text-blue-700 bg-blue-500/10 border-blue-500/20",
  cancelled: "text-muted-foreground bg-muted/40 border-border/40",
};

function projectDeadlineLabel(deadline: string | null): { text: string; urgent: boolean } | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, urgent: true };
  if (diff === 0) return { text: "Due today", urgent: true };
  if (diff <= 3) return { text: `${diff}d left`, urgent: true };
  if (diff <= 7) return { text: `${diff}d left`, urgent: false };
  return { text: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), urgent: false };
}

const FounderCommandCenter = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("founder");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const { getTaskStats, getOverdueTasks, tasks } = useTaskContext();
  const overview = useFounderOverview();
  const { data: allProjects = [], isLoading: projectsLoading } = useMyProjects();
  const { dbStartups } = useStartups();
  const stats = getTaskStats();
  const overdueTasks = getOverdueTasks();
  const blockedTasks = tasks.filter((task) => task.status === "blocked");

  const filteredProjects = useMemo(() => {
    if (projectFilter === "all") return allProjects;
    return allProjects.filter((p: Project) => p.startup_id === projectFilter);
  }, [allProjects, projectFilter]);

  const activeProjectCount = allProjects.filter((p: Project) => p.status === "active").length;
  const blockedProjectCount = allProjects.filter((p: Project) =>
    p.members?.some((m) => m.status === "blocked") ||
    (p.my_member_row && (p as any).overall_completion < 100 && p.status === "active")
  ).length;

  const handleAcceptDecision = (decision: string) => {
    toast.success("Decision captured", { description: decision });
  };

  const portfolioContext = useMemo(() => {
    if (!overview || overview.loading) return "";
    const companyLines = overview.companies?.map((c: any) =>
      `${c.name}: ${c.headcount ?? 0} people, runway=${c.runwayLabel}, growth=${c.growthLabel}, burn=${c.monthlyBurn}, signal=${c.signal}`
    ) ?? [];
    const parts = [
      `Portfolio: ${overview.totalCompanies} companies, ${overview.totalHeadcount} total active people`,
      overview.portfolioStatusLine,
      overview.executiveSummaries?.finance
        ? `Finance: ${overview.executiveSummaries.finance.primary} burn, ${overview.executiveSummaries.finance.secondary}`
        : null,
      overview.strategicBrief?.biggestRisk ? `Biggest risk: ${overview.strategicBrief.biggestRisk}` : null,
      overview.strategicBrief?.biggestOpportunity ? `Biggest opportunity: ${overview.strategicBrief.biggestOpportunity}` : null,
      companyLines.length > 0 ? `Companies — ${companyLines.join(" | ")}` : null,
      stats.overdue > 0 ? `${stats.overdue} overdue tasks across portfolio` : null,
      blockedTasks.length > 0 ? `${blockedTasks.length} blocked tasks need founder decision` : null,
    ].filter(Boolean).join(". ");
    return parts;
  }, [overview, stats, blockedTasks]);

  return (
    <div className="min-h-screen bg-white text-foreground">
      <Navbar />

      <header className="border-b border-border/60 bg-white">
        <div className="mx-auto max-w-7xl px-6 pt-8 pb-6">
          {/* eyebrow row removed for cleaner heading */}
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-baseline gap-4">
              <span className="eyebrow">Founder Edition / {todayLabel}</span>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
              <button
                onClick={() => setMode("founder")}
                className={cn(
                  "rounded-sm px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-all",
                  mode === "founder"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Crosshair className="mr-1.5 inline h-3 w-3" />
                Strategic
              </button>
              <button
                onClick={() => setMode("operator")}
                className={cn(
                  "rounded-sm px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-all",
                  mode === "operator"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Gauge className="mr-1.5 inline h-3 w-3" />
                Operator
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
                Command Center
              </h1>
              {(() => {
                const crit = overview.alerts.filter((a) => a.severity === "critical").length;
                const warn = overview.alerts.filter((a) => a.severity === "warning").length;
                const parts = [
                  crit > 0 ? `${crit} critical` : null,
                  warn > 0 ? `${warn} at risk` : null,
                ].filter(Boolean);
                return (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {parts.length > 0
                      ? parts.join(", ")
                      : `${overview.totalCompanies} companies in view`}
                  </p>
                );
              })()}
            </div>
            <dl className="flex items-end gap-8 text-right">
              <Stat label="Companies" value={overview.totalCompanies.toString()} />
              <Stat label="Headcount" value={overview.totalHeadcount.toString()} />
              <Stat label="Salary / mo" value={formatSalary(overview.totalSalaryBurn)} />
              <Stat
                label="Avg Efficiency"
                value={`${overview.avgEfficiency}%`}
                tone={
                  overview.avgEfficiency >= 70
                    ? "positive"
                    : overview.avgEfficiency >= 50
                      ? "warning"
                      : "critical"
                }
              />
            </dl>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-6 py-8">
        {overview.alerts.filter((alert) => alert.severity === "critical" || alert.severity === "warning").length > 0 && (
          <section className="space-y-2">
            {overview.alerts
              .filter((alert) => alert.severity === "critical" || alert.severity === "warning")
              .slice(0, 4)
              .map((alert) => {
                const isCritical = alert.severity === "critical";
                return (
                  <Link
                    key={alert.id}
                    to={`/startup/${alert.startupSlug}`}
                    className={cn(
                      "group flex items-center justify-between gap-3 rounded-md border px-4 py-3 transition-colors",
                      isCritical
                        ? "border-signal-critical/30 bg-signal-critical-soft hover:bg-signal-critical-soft/80"
                        : "border-signal-warning/30 bg-signal-warning-soft hover:bg-signal-warning-soft/80",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base leading-none">{isCritical ? "🔥" : "⚠️"}</span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isCritical ? "text-signal-critical" : "text-signal-warning",
                        )}
                      >
                        {alert.text}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium",
                        isCritical ? "text-signal-critical" : "text-signal-warning",
                      )}
                    >
                      View <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                );
              })}
          </section>
        )}

        {mode === "founder" && (
          <>
            <section className="grid grid-cols-12 gap-6">
              <div className="paper-card-elevated col-span-12 p-6 lg:col-span-8 lg:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🧠</span>
                    <h2 className="text-base font-semibold tracking-tight">KAI Weekly Brief</h2>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {overview.loading ? "UPDATING" : "LIVE PORTFOLIO"}
                  </span>
                </div>

                <p className="mb-6 text-base leading-relaxed text-foreground/85">
                  {overview.strategicBrief.status}
                </p>

                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-signal-critical/20 bg-signal-critical-soft p-4">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-signal-critical">
                      Biggest Risk
                    </span>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                      {overview.strategicBrief.biggestRisk}
                    </p>
                  </div>
                  <div className="rounded-md border border-signal-positive/20 bg-signal-positive-soft p-4">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-signal-positive">
                      Biggest Opportunity
                    </span>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                      {overview.strategicBrief.biggestOpportunity}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2 block">Top Decisions</span>
                  <ul className="divide-y divide-border">
                    {overview.strategicBrief.topDecisions.length > 0 ? (
                      overview.strategicBrief.topDecisions.map((decision, index) => (
                        <li key={decision.id} className="flex items-center justify-between gap-3 py-2.5">
                          <span className="flex-1 text-sm text-foreground/85">
                            <span className="mr-2 font-mono text-[10px] text-muted-foreground">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            {decision.text}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] font-semibold uppercase tracking-wider text-accent hover:bg-accent-soft"
                            onClick={() => handleAcceptDecision(decision.text)}
                          >
                            Accept -
                          </Button>
                        </li>
                      ))
                    ) : (
                      <li className="py-3 text-sm text-muted-foreground">
                        Add startups, departments, and finance data to generate founder decisions.
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <aside className="paper-card col-span-12 bg-paper p-6 lg:col-span-4">
                <span className="eyebrow text-accent">Founder Focus</span>
                <p className="mt-3 font-display text-xl leading-snug">
                  Where your attention creates the most leverage this cycle.
                </p>
                <p className="mt-5 border-l-2 border-accent pl-4 text-sm leading-relaxed text-foreground/75">
                  {overview.strategicBrief.founderFocus}
                </p>
                <div className="editorial-rule my-5" />
                <span className="eyebrow mb-2 block">Pattern Watch</span>
                <ul className="space-y-3">
                  {overview.strategicBrief.patternSignals.slice(0, 2).map((pattern) => (
                    <li key={pattern.id} className="text-xs leading-relaxed text-foreground/75">
                      <span className="font-display italic text-foreground/60">{pattern.pattern}</span>
                      <span className="mt-1 block font-medium text-accent">- {pattern.suggestion}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            </section>

            <section>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <span className="eyebrow">Portfolio Health</span>
                  <h2 className="mt-1 font-display text-2xl">
                    {overview.totalCompanies} Companies, One Console
                  </h2>
                </div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Open any company -
                </span>
              </div>
              <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
                {overview.companies.map((company) => {
                  const tone = statusToTone(company.status);
                  const toneStyle = toneStyles[tone];
                  const config = statusConfig[company.status as keyof typeof statusConfig];
                  const trendUp = (company.growthPercent ?? 0) >= 0;
                  return (
                    <Link
                      key={company.startupSlug}
                      to={`/startup/${company.startupSlug}`}
                      className="group bg-card p-5 transition-colors hover:bg-paper"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn("h-1.5 w-1.5 rounded-full", toneStyle.dot)} />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {config?.label ?? company.status}
                            </span>
                          </div>
                          <h3 className="mt-1.5 font-display text-xl leading-tight transition-colors group-hover:text-accent">
                            {company.name}
                          </h3>
                        </div>
                        <span className={cn("rounded-sm border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", toneStyles[company.signalTone].chip)}>
                          {signalLabel[company.signal]}
                        </span>
                      </div>

                      <div className="my-4 -mx-1 h-8">
                        <SparkLine
                          data={company.sparkData}
                          color={`hsl(var(--signal-${tone === "neutral" ? "warning" : tone}))`}
                          width={200}
                          height={32}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                        <div>
                          <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">
                            Runway
                          </span>
                          <span className="numeric mt-0.5 block text-base">{company.runwayLabel}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">
                            Growth
                          </span>
                          <span
                            className={cn(
                              "numeric mt-0.5 flex items-center gap-1 text-base",
                              trendUp ? "text-signal-positive" : "text-signal-critical",
                            )}
                          >
                            {trendUp ? (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            )}
                            {company.growthLabel}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Top Risk</span>
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-foreground/80">
                            {company.topRisk}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            Opportunity
                          </span>
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                            {company.topOpportunity}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <span className="eyebrow">Cross-Portfolio Departments</span>
                  <h2 className="mt-1 font-display text-2xl">Departmental health, at a glance</h2>
                </div>
              </div>
              <div className="paper-card overflow-hidden">
                <div className="grid grid-cols-1 divide-border bg-border md:grid-cols-2 lg:grid-cols-3">
                  {overview.departmentIntel.map((department) => {
                    const toneStyle = toneStyles[department.tone];
                    return (
                      <div
                        key={department.key}
                        className="flex items-start justify-between gap-3 border-b border-r border-border bg-card p-4 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn("h-1 w-1 rounded-full", toneStyle.dot)} />
                            <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {department.name}
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="numeric text-2xl">{department.headcount}</span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              people
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                            {department.summary}
                          </p>
                        </div>
                        {department.headcount > 0 && (
                          <div className="text-right">
                            <span className={cn("numeric text-sm", toneStyle.text)}>
                              {department.avgScore}%
                            </span>
                            <span className="mt-0.5 block text-[9px] uppercase tracking-wider text-muted-foreground">
                              output
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ── Portfolio Projects ── */}
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="eyebrow">Portfolio Projects</span>
                  <h2 className="mt-1 font-display text-2xl">
                    {activeProjectCount} Active{allProjects.length > activeProjectCount ? `, ${allProjects.length - activeProjectCount} Other` : ""}
                  </h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setProjectFilter("all")}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all",
                      projectFilter === "all"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                    )}
                  >
                    All Companies
                  </button>
                  {(dbStartups ?? []).map((s: any) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setProjectFilter(s.id)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all",
                        projectFilter === s.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                  <Link
                    to="/employee"
                    className="text-[11px] font-semibold uppercase tracking-wider text-accent hover:underline underline-offset-2 ml-2"
                  >
                    Full View -
                  </Link>
                  <Button
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    className="ml-2 h-7 gap-1.5 text-[11px] uppercase tracking-wider"
                  >
                    <Plus className="h-3 w-3" />
                    New Project
                  </Button>
                </div>
              </div>

              {projectsLoading ? (
                <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-card p-5 h-32 animate-pulse" />
                  ))}
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="paper-card p-8 text-center">
                  <Layers className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No projects{projectFilter !== "all" ? " for this company" : " yet"}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProjects.map((project: Project) => {
                    const dl = projectDeadlineLabel(project.deadline);
                    const memberCount = (project as any).member_count ?? 0;
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => navigate(`/project/${project.id}`)}
                        className="group bg-card p-5 text-left transition-colors hover:bg-paper w-full"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge
                                variant="outline"
                                className={cn("text-[9px] px-1.5 py-0 capitalize flex-shrink-0", PROJECT_STATUS_COLOR[project.status])}
                              >
                                {project.status}
                              </Badge>
                              {projectFilter === "all" && project.startup_name && (
                                <span className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">
                                  {project.startup_name}
                                </span>
                              )}
                            </div>
                            <h3 className="font-display text-base leading-snug group-hover:text-accent transition-colors line-clamp-2">
                              {project.title}
                            </h3>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 mt-1" />
                        </div>

                        {project.department_key && (
                          <div className="flex items-center gap-1 mb-3">
                            <Layers className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {project.department_key.replace(/_/g, " ")}
                            </span>
                          </div>
                        )}

                        <div className="space-y-1 mb-3">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>Progress</span>
                            <span className="font-semibold tabular-nums">{project.overall_completion}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                project.overall_completion === 100 ? "bg-emerald-500" :
                                project.overall_completion >= 60 ? "bg-blue-500" : "bg-primary"
                              )}
                              style={{ width: `${project.overall_completion}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          {dl ? (
                            <span className={cn("flex items-center gap-1", dl.urgent && "text-signal-critical font-semibold")}>
                              <Calendar className="h-2.5 w-2.5" />
                              {dl.text}
                            </span>
                          ) : <span />}
                          {project.members && (
                            <span className="flex items-center gap-1">
                              <Users className="h-2.5 w-2.5" />
                              {project.members.length} member{project.members.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ExecutiveSummaryCard
                eyebrow="Finance Summary"
                title={overview.executiveSummaries.finance.primary}
                subtitle={overview.executiveSummaries.finance.secondary}
                insight={overview.executiveSummaries.finance.insight}
              />
              <ExecutiveSummaryCard
                eyebrow="People Summary"
                title={overview.executiveSummaries.people.primary}
                subtitle={overview.executiveSummaries.people.secondary}
                insight={overview.executiveSummaries.people.insight}
              />
              <ExecutiveSummaryCard
                eyebrow="Ownership Summary"
                title={overview.executiveSummaries.ownership.primary}
                subtitle={overview.executiveSummaries.ownership.secondary}
                insight={overview.executiveSummaries.ownership.insight}
              />
            </section>

            <section className="grid grid-cols-12 gap-6">
              <div className="paper-card col-span-12 p-6 lg:col-span-7">
                <div className="mb-4 flex items-center justify-between">
                  <span className="eyebrow">Capital Allocation Signals</span>
                  <span className="font-mono text-[10px] text-muted-foreground">LIVE METRICS</span>
                </div>
                <div className="divide-y divide-border">
                  {overview.capitalSignals.map((signal, index) => (
                    <div key={signal.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="flex min-w-0 items-baseline gap-3">
                        <span className="w-6 font-mono text-[10px] text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="font-display text-base leading-tight">{signal.startupName}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{signal.action}</p>
                        </div>
                      </div>
                      <span className="numeric shrink-0 text-base text-signal-positive">
                        {signal.metric}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="paper-card col-span-12 bg-paper p-6 lg:col-span-5">
                <div className="mb-4 flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-accent" />
                  <span className="eyebrow text-accent">Cross-Portfolio Patterns</span>
                </div>
                <ul className="space-y-4">
                  {overview.strategicBrief.patternSignals.map((pattern) => (
                    <li key={pattern.id} className="border-l-2 border-accent pl-4">
                      <p className="text-sm leading-snug text-foreground/85">{pattern.pattern}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {pattern.suggestion}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </>
        )}

        {mode === "operator" && (
          <section className="grid grid-cols-12 gap-6">
            <div className="paper-card col-span-12 p-6 lg:col-span-8">
              <div className="mb-4 flex items-center justify-between">
                <span className="eyebrow">Execution Ledger</span>
                <Link
                  to="/my-work"
                  className="text-[11px] font-semibold uppercase tracking-wider text-accent hover:underline underline-offset-2"
                >
                  Open My Work -
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
                <LedgerStat label="In Progress" value={stats.inProgress} />
                <LedgerStat label="Completed" value={stats.completed} tone="positive" />
                <LedgerStat label="Blocked" value={blockedTasks.length} tone="warning" />
                <LedgerStat
                  label="Overdue"
                  value={stats.overdue}
                  tone={stats.overdue > 0 ? "critical" : "neutral"}
                />
              </div>

              {overdueTasks.length > 0 && (
                <div className="mt-5">
                  <span className="eyebrow mb-2 block text-signal-critical">Overdue items</span>
                  <ul className="divide-y divide-border">
                    {overdueTasks.slice(0, 5).map((task) => (
                      <li key={task.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="truncate text-sm text-foreground/85">{task.title}</span>
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">
                          {task.assignee}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="paper-card col-span-12 bg-paper p-6 lg:col-span-4">
              <span className="eyebrow">Runway By Company</span>
              <ul className="mt-4 divide-y divide-border">
                {overview.companies.map((company) => (
                  <li key={company.startupSlug} className="flex items-center justify-between py-2.5">
                    <Link
                      to={`/startup/${company.startupSlug}`}
                      className="text-sm transition-colors hover:text-accent"
                    >
                      {company.name}
                    </Link>
                    <span className="numeric text-sm">{company.runwayLabel}</span>
                  </li>
                ))}
              </ul>
              <div className="editorial-rule my-4" />
              <Link
                to="/people"
                className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-accent hover:underline underline-offset-2"
              >
                People OS <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </section>
        )}

        {/* KAI Portfolio Intelligence */}
        <section className="mb-10">
          <h2 className="eyebrow mb-4">Ask KAI</h2>
          <AskKai startupContext={portfolioContext} />
        </section>
      </main>

      <CreateProjectModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(projectId) => navigate(`/project/${projectId}`)}
      />
    </div>
  );
};

function formatSalary(amount: number) {
  if (!Number.isFinite(amount)) return "INR 0";
  if (Math.abs(amount) >= 1e7) return `INR ${(amount / 1e7).toFixed(1)}Cr`;
  if (Math.abs(amount) >= 1e5) return `INR ${(amount / 1e5).toFixed(1)}L`;
  return `INR ${amount.toLocaleString("en-IN")}`;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "warning" | "critical";
}) {
  const toneStyle = tone ? toneStyles[tone] : null;
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("numeric mt-0.5 text-2xl", toneStyle?.text)}>{value}</dd>
    </div>
  );
}

function ExecutiveSummaryCard({
  eyebrow,
  title,
  subtitle,
  insight,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  insight: string;
}) {
  return (
    <article className="paper-card p-5">
      <span className="eyebrow">{eyebrow}</span>
      <h3 className="mt-2 font-display text-2xl leading-tight">{title}</h3>
      <p className="mt-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
        {subtitle}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-foreground/75">{insight}</p>
    </article>
  );
}

function LedgerStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "positive" | "warning" | "critical" | "neutral";
}) {
  const toneStyle = toneStyles[tone];
  return (
    <div className="bg-card p-4">
      <span className="eyebrow">{label}</span>
      <p className={cn("numeric mt-1 text-3xl", toneStyle.text)}>{value}</p>
    </div>
  );
}

export default FounderCommandCenter;
