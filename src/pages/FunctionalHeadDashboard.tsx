import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTaskContext } from "@/contexts/TaskContext";
import { useAuth } from "@/contexts/AuthContext";
import TaskCard from "@/components/TaskCard";
import {
  type Domain,
  domainConfigs,
  domainMetrics,
  domainIssues,
  domainDecisions,
  inferDomain,
} from "@/data/functionalHead";
import { startups } from "@/data/startups";
import { getDomainKaiInsights, type FunctionalDomain } from "@/data/kaiRoleInsights";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Brain,
  BookOpen,
  Filter,
  Sparkles,
} from "lucide-react";

/* ── Domain detection from user profile ──────────────── */

function detectDomain(profile: { full_name?: string | null; email?: string | null } | null): Domain {
  if (!profile) return "hr";
  const name = (profile.full_name || "").toLowerCase();
  const email = (profile.email || "").toLowerCase();
  const combined = `${name} ${email}`;

  if (combined.includes("cfo") || combined.includes("finance")) return "finance";
  if (combined.includes("cto") || combined.includes("tech") || combined.includes("product") || combined.includes("engineering")) return "product";
  if (combined.includes("cmo") || combined.includes("marketing") || combined.includes("growth")) return "marketing";
  if (combined.includes("chro") || combined.includes("hr") || combined.includes("people")) return "hr";

  return inferDomain(name);
}

/* ── KAI Domain Insights Component ──────────────────── */

const KaiDomainInsights = ({ domain }: { domain: Domain }) => {
  const insights = getDomainKaiInsights(domain as FunctionalDomain);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (insights.length === 0) return null;

  const severityStyles: Record<string, { border: string; dot: string }> = {
    critical: { border: "border-l-destructive", dot: "bg-destructive" },
    warning: { border: "border-l-amber-500", dot: "bg-amber-500" },
    info: { border: "border-l-blue-500", dot: "bg-blue-500" },
    positive: { border: "border-l-emerald-500", dot: "bg-emerald-500" },
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          KAI · {domainConfigs[domain].label} Intelligence
        </h3>
      </div>
      <div className="space-y-2">
        {insights.map((item) => {
          const s = severityStyles[item.severity] || severityStyles.info;
          const isOpen = expandedId === item.id;

          return (
            <Collapsible
              key={item.id}
              open={isOpen}
              onOpenChange={() => setExpandedId(isOpen ? null : item.id)}
            >
              <Card className={cn("border-l-2 border-border/40", s.border)}>
                <CollapsibleTrigger className="w-full">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0", s.dot)} />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 border-border/40 text-muted-foreground"
                          >
                            KAI · {item.label}
                          </Badge>
                          {item.metricValue && (
                            <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                              {item.metricValue}
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed">{item.insight}</p>
                      </div>
                      <div className="flex-shrink-0 mt-0.5">
                        {isOpen ? (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0">
                    <div className="rounded-lg bg-muted/30 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};

/* ── Main Dashboard ──────────────────────────────────── */

const FunctionalHeadDashboard = () => {
  const { profile } = useAuth();
  const domain = detectDomain(profile);

  const [selectedStartup, setSelectedStartup] = useState<string>("all");
  const [decisionsOpen, setDecisionsOpen] = useState(false);
  const { tasks } = useTaskContext();

  const config = domainConfigs[domain];
  const metrics = domainMetrics[domain];
  const issues = domainIssues[domain].filter(
    (i) => selectedStartup === "all" || i.startupId === selectedStartup
  );
  const decisions = domainDecisions[domain];

  // Startups referenced in this domain
  const domainStartupIds = [...new Set(domainIssues[domain].map((i) => i.startupId))];
  const domainStartups = startups.filter((s) => domainStartupIds.includes(s.id));

  // Tasks relevant to this domain only
  const domainTasks = tasks
    .filter((t) => {
      const a = t.assignee.toLowerCase();
      if (domain === "hr") return a.includes("hr") || a.includes("people");
      if (domain === "finance") return a.includes("cfo") || a.includes("finance");
      if (domain === "product") return a.includes("cto") || a.includes("product") || a.includes("tech") || a.includes("engineer");
      if (domain === "marketing") return a.includes("marketing") || a.includes("growth") || a.includes("cmo");
      return false;
    })
    .filter((t) => selectedStartup === "all" || t.linkedStartupId === selectedStartup);

  const changeIcon = (dir?: "up" | "down" | "neutral") => {
    if (dir === "up") return <ArrowUpRight className="h-3 w-3 text-amber-500" />;
    if (dir === "down") return <ArrowDownRight className="h-3 w-3 text-emerald-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const severityColor = (s: string) =>
    s === "Critical"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : "bg-amber-500/10 text-amber-500 border-amber-500/30";

  const statusColor = (s: string) => {
    if (s === "Implemented") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
    if (s === "In Progress") return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    return "bg-muted text-muted-foreground border-border/50";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{config.icon}</span>
              <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Your {config.label} domain across assigned startups
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Domain badge — locked to user's domain */}
            <Badge variant="outline" className="text-xs px-3 py-1.5 font-semibold">
              {config.icon} {config.label}
            </Badge>
            {/* Startup Filter */}
            {domainStartups.length > 1 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <select
                  value={selectedStartup}
                  onChange={(e) => setSelectedStartup(e.target.value)}
                  className="bg-transparent text-xs font-medium outline-none cursor-pointer"
                >
                  <option value="all">All Startups</option>
                  {domainStartups.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Domain KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {metrics.map((m) => (
            <Card key={m.label} className="border-border/40">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">{m.label}</p>
                <p className="text-2xl font-bold tracking-tight">{m.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {changeIcon(m.changeDirection)}
                  <span className="text-[11px] text-muted-foreground">{m.change}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column — Issues + Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Issues */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                {config.label} Issues
              </h2>
              {issues.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active issues in this view.</p>
              ) : (
                <div className="space-y-3">
                  {issues.map((issue) => (
                    <Card key={issue.id} className="border-border/40">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={severityColor(issue.severity)}>
                                {issue.severity}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{issue.startupName}</span>
                            </div>
                            <p className="text-sm font-medium">{issue.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{issue.impact}</p>
                          </div>
                        </div>
                        <div className="mt-2 rounded-lg bg-muted/30 border border-border/30 px-3 py-2">
                          <div className="flex items-start gap-1.5">
                            <Brain className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground leading-relaxed">{issue.kaiInsight}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Tasks & Deadlines */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                {config.label} Tasks
              </h2>
              {domainTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks assigned in {config.label}.</p>
              ) : (
                <div className="space-y-2">
                  {domainTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column — Decision Log + KAI */}
          <div className="space-y-4">
            {/* Decision Log */}
            <Collapsible open={decisionsOpen} onOpenChange={setDecisionsOpen}>
              <Card className="border-border/40">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="p-4 pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-semibold">{config.label} Decisions</CardTitle>
                      </div>
                      {decisionsOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-4 pt-3 space-y-3">
                    {decisions.map((d) => (
                      <div key={d.id} className="rounded-lg border border-border/30 p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium">{d.decision}</p>
                          <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${statusColor(d.status)}`}>
                            {d.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{d.context}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{d.date}</p>
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Domain-specific KAI Insights */}
            <KaiDomainInsights domain={domain} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default FunctionalHeadDashboard;
