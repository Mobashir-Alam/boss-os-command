import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTaskContext } from "@/contexts/TaskContext";
import TaskCard from "@/components/TaskCard";
import {
  type Domain,
  domainConfigs,
  domainMetrics,
  domainIssues,
  domainDecisions,
} from "@/data/functionalHead";
import { startups } from "@/data/startups";
import KaiRoleInsights from "@/components/KaiRoleInsights";
import {
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Brain,
  BookOpen,
  Filter,
} from "lucide-react";

const FunctionalHeadDashboard = () => {
  const [domain, setDomain] = useState<Domain>("hr");
  const [selectedStartup, setSelectedStartup] = useState<string>("all");
  const [decisionsOpen, setDecisionsOpen] = useState(false);
  const { tasks } = useTaskContext();

  const config = domainConfigs[domain];
  const metrics = domainMetrics[domain];
  const issues = domainIssues[domain].filter(
    (i) => selectedStartup === "all" || i.startupId === selectedStartup
  );
  const decisions = domainDecisions[domain];
  const kaiInsights = domainKaiInsights[domain];

  // Get startups referenced in this domain's issues
  const domainStartupIds = [...new Set(domainIssues[domain].map((i) => i.startupId))];
  const domainStartups = startups.filter((s) => domainStartupIds.includes(s.id));

  // Filter tasks relevant to this domain
  const domainTasks = tasks.filter((t) => {
    const a = t.assignee.toLowerCase();
    if (domain === "hr") return a.includes("hr");
    if (domain === "finance") return a.includes("cfo");
    if (domain === "product") return a.includes("cto") || a.includes("product");
    if (domain === "marketing") return a.includes("marketing") || a.includes("growth");
    return false;
  }).filter((t) => selectedStartup === "all" || t.linkedStartupId === selectedStartup);

  const changeIcon = (dir?: "up" | "down" | "neutral") => {
    if (dir === "up") return <ArrowUpRight className="h-3 w-3 text-amber-500" />;
    if (dir === "down") return <ArrowDownRight className="h-3 w-3 text-emerald-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const severityColor = (s: string) =>
    s === "Critical"
      ? "bg-red-500/10 text-red-500 border-red-500/30"
      : "bg-amber-500/10 text-amber-500 border-amber-500/30";

  const statusColor = (s: string) => {
    if (s === "Implemented") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
    if (s === "In Progress") return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    return "bg-muted text-muted-foreground border-border/50";
  };

  const insightSeverityColor = (s: string) =>
    s === "critical" ? "border-l-red-500" : s === "warning" ? "border-l-amber-500" : "border-l-blue-500";

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
              Focused view of your domain across assigned startups
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Domain Switcher */}
            <div className="flex items-center gap-1 rounded-full border border-border/50 p-0.5 bg-muted/30">
              {(Object.keys(domainConfigs) as Domain[]).map((d) => (
                <button
                  key={d}
                  onClick={() => { setDomain(d); setSelectedStartup("all"); }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                    domain === d
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {domainConfigs[d].label}
                </button>
              ))}
            </div>
            {/* Startup Filter */}
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
          </div>
        </div>

        {/* Snapshot Metrics */}
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
                Active Issues
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
                Tasks & Deadlines
              </h2>
              {domainTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks assigned in this domain.</p>
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
                        <CardTitle className="text-sm font-semibold">Decision Log</CardTitle>
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

            {/* KAI Role Insights */}
            <KaiRoleInsights role="functional_head" compact />
          </div>
        </div>
      </main>
    </div>
  );
};

export default FunctionalHeadDashboard;
