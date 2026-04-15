import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  decisionEntries,
  type DecisionEntry,
  type DecisionStatus,
  type DecisionOutcome,
  type DecisionOrigin,
} from "@/data/decisions";
import { useTaskContext } from "@/contexts/TaskContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Brain,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
  MessageSquarePlus,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  XCircle,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Config ──────────────────────────────────────────── */

const statusConfig: Record<DecisionStatus, { label: string; badge: string; dot: string }> = {
  pending: { label: "Pending", badge: "bg-amber-500/10 text-amber-500 border-amber-500/30", dot: "bg-amber-500" },
  "in-progress": { label: "In Progress", badge: "bg-blue-500/10 text-blue-500 border-blue-500/30", dot: "bg-blue-500" },
  resolved: { label: "Resolved", badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30", dot: "bg-emerald-500" },
  "re-evaluate": { label: "Re-evaluate", badge: "bg-destructive/10 text-destructive border-destructive/30", dot: "bg-destructive" },
};

const outcomeConfig: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  success: { label: "Success", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  failed: { label: "Failed", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
  neutral: { label: "Neutral", icon: Minus, color: "text-muted-foreground", bg: "bg-muted/30 border-border/30" },
};

const originConfig: Record<DecisionOrigin, { label: string; color: string }> = {
  kai: { label: "KAI Recommended", color: "text-primary" },
  founder: { label: "Founder Decision", color: "text-foreground" },
  "c-suite": { label: "C-Suite Decision", color: "text-foreground" },
};

const taskStatusDot: Record<string, string> = {
  pending: "bg-muted-foreground",
  "in-progress": "bg-blue-500",
  completed: "bg-emerald-500",
  blocked: "bg-amber-500",
};

const kaiStatusIcon: Record<string, { color: string; label: string }> = {
  watching: { color: "text-blue-500", label: "Watching" },
  resolved: { color: "text-emerald-500", label: "Resolved" },
  resurfaced: { color: "text-destructive", label: "Resurfaced" },
};

const verdictIcon: Record<string, { icon: typeof TrendingUp; color: string }> = {
  positive: { icon: TrendingUp, color: "text-emerald-500" },
  negative: { icon: TrendingDown, color: "text-destructive" },
  neutral: { icon: Minus, color: "text-muted-foreground" },
};

/* ── Component ───────────────────────────────────────── */

const DecisionLog = () => {
  const [filterStartup, setFilterStartup] = useState("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterOutcome, setFilterOutcome] = useState<string>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const { tasks } = useTaskContext();

  const startups = [...new Set(decisionEntries.map((d) => d.startupName))];

  // Auto-resolve: if all linked tasks are completed, mark decision resolved
  const enrichedDecisions = useMemo(() => {
    return decisionEntries.map((dec) => {
      const enrichedTasks = dec.linkedTasks.map((lt) => {
        const liveTask = tasks.find((t) => t.id === lt.taskId);
        return liveTask ? { ...lt, status: liveTask.status as typeof lt.status } : lt;
      });

      const allCompleted =
        enrichedTasks.length > 0 && enrichedTasks.every((t) => t.status === "completed");

      let autoStatus = dec.status;
      let autoOutcome = dec.outcome;
      if (allCompleted && dec.status !== "resolved" && dec.status !== "re-evaluate") {
        autoStatus = "resolved";
        if (!dec.outcome) autoOutcome = "success";
      }

      return { ...dec, linkedTasks: enrichedTasks, status: autoStatus, outcome: autoOutcome };
    });
  }, [tasks]);

  const filtered = enrichedDecisions.filter((d) => {
    if (filterStartup !== "all" && d.startupName !== filterStartup) return false;
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    if (filterOutcome !== "all") {
      if (filterOutcome === "pending" && d.outcome !== null) return false;
      if (filterOutcome !== "pending" && d.outcome !== filterOutcome) return false;
    }
    return true;
  });

  // Stats
  const totalResolved = enrichedDecisions.filter((d) => d.status === "resolved").length;
  const totalSuccess = enrichedDecisions.filter((d) => d.outcome === "success").length;
  const totalFailed = enrichedDecisions.filter((d) => d.outcome === "failed").length;
  const totalEvaluated = enrichedDecisions.filter((d) => d.kaiImpact.evaluated).length;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addNote = (decId: string) => {
    const text = noteInputs[decId]?.trim();
    if (!text) return;
    toast.success("Note added");
    setNoteInputs((prev) => ({ ...prev, [decId]: "" }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Decision Log & Feedback</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track decisions from acceptance to measurable outcome.
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-border/50 bg-muted/20 px-5 py-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold">{enrichedDecisions.length}</span>
            <span className="text-sm text-muted-foreground">decisions</span>
          </div>
          <div className="h-4 w-px bg-border/60" />
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-sm font-bold text-emerald-600">{totalResolved}</span>
            <span className="text-sm text-muted-foreground">resolved</span>
          </div>
          <div className="h-4 w-px bg-border/60" />
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-sm font-bold">{totalSuccess}</span>
            <span className="text-sm text-muted-foreground">succeeded</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            <span className="text-sm font-bold">{totalFailed}</span>
            <span className="text-sm text-muted-foreground">failed</span>
          </div>
          <div className="h-4 w-px bg-border/60" />
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-bold">{totalEvaluated}</span>
            <span className="text-sm text-muted-foreground">KAI evaluated</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <select
              value={filterStartup}
              onChange={(e) => setFilterStartup(e.target.value)}
              className="bg-transparent text-xs font-medium outline-none cursor-pointer"
            >
              <option value="all">All Startups</option>
              {startups.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs font-medium outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="re-evaluate">Re-evaluate</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5">
            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value)}
              className="bg-transparent text-xs font-medium outline-none cursor-pointer"
            >
              <option value="all">All Outcomes</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="neutral">Neutral</option>
              <option value="pending">Not yet evaluated</option>
            </select>
          </div>
        </div>

        {/* Decision Entries */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No decisions match current filters.</p>
          )}
          {filtered.map((dec) => {
            const isExpanded = expandedIds.has(dec.id);
            const sCfg = statusConfig[dec.status];
            const kCfg = kaiStatusIcon[dec.kaiResolution.status];
            const oCfg = dec.outcome ? outcomeConfig[dec.outcome] : null;
            const oOrigin = originConfig[dec.origin];
            const impact = dec.kaiImpact;
            const vCfg = impact.verdict ? verdictIcon[impact.verdict] : null;

            return (
              <Card key={dec.id} className="border-border/40">
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(dec.id)}>
                  {/* Compact row */}
                  <CollapsibleTrigger className="w-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-2 w-2 rounded-full flex-shrink-0", sCfg.dot)} />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium truncate">{dec.title}</p>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                            <span>{dec.startupName}</span>
                            <span className="flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />{dec.dateAccepted}
                            </span>
                            <span className={cn("font-medium", oOrigin.color)}>{oOrigin.label}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Outcome badge */}
                          {oCfg && (
                            <Badge variant="outline" className={cn("text-[10px] gap-0.5", oCfg.bg, oCfg.color)}>
                              <oCfg.icon className="h-2.5 w-2.5" />
                              {oCfg.label}
                            </Badge>
                          )}
                          <Badge variant="outline" className={cn("text-[10px]", sCfg.badge)}>
                            {sCfg.label}
                          </Badge>
                          {dec.linkedTasks.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {dec.linkedTasks.filter((t) => t.status === "completed").length}/{dec.linkedTasks.length} tasks
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  {/* Expanded detail */}
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4 border-t border-border/20 pt-3">
                      {/* Origin + Reasoning */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                          Reasoning · {oOrigin.label}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{dec.reasoning}</p>
                      </div>

                      {/* Linked Tasks */}
                      {dec.linkedTasks.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                            Linked Tasks
                          </p>
                          <div className="space-y-1">
                            {dec.linkedTasks.map((lt) => (
                              <div key={lt.taskId} className="flex items-center gap-2 text-xs">
                                <span className={cn("h-1.5 w-1.5 rounded-full", taskStatusDot[lt.status])} />
                                <span className="truncate">{lt.title}</span>
                                <span className="text-[10px] text-muted-foreground capitalize ml-auto flex-shrink-0">
                                  {lt.status}
                                </span>
                              </div>
                            ))}
                          </div>
                          {dec.linkedTasks.length > 0 &&
                            dec.linkedTasks.every((t) => t.status === "completed") && (
                              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                                <CheckCircle2 className="h-3 w-3" />
                                All linked tasks completed — decision auto-resolved
                              </div>
                            )}
                        </div>
                      )}

                      {/* Outcome */}
                      {oCfg && (
                        <div className={cn("rounded-lg border px-3 py-2.5", oCfg.bg)}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <oCfg.icon className={cn("h-3 w-3", oCfg.color)} />
                            <p className={cn("text-[10px] font-semibold uppercase tracking-widest", oCfg.color)}>
                              Outcome: {oCfg.label}
                            </p>
                          </div>
                          {dec.outcomeNote && (
                            <p className="text-xs text-foreground">{dec.outcomeNote}</p>
                          )}
                        </div>
                      )}

                      {/* KAI Impact Evaluation */}
                      {impact.evaluated ? (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Sparkles className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                              KAI Impact Evaluation
                            </span>
                            {vCfg && (
                              <div className="ml-auto flex items-center gap-1">
                                <vCfg.icon className={cn("h-3 w-3", vCfg.color)} />
                                {impact.delta && (
                                  <span className={cn("text-[10px] font-bold", vCfg.color)}>{impact.delta}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-foreground/80 leading-relaxed">{impact.summary}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Evaluated {impact.evaluatedDate} · {impact.daysElapsed} days after decision
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-border/30 bg-muted/20 px-3 py-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Brain className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              KAI Impact — Pending
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {impact.daysElapsed !== undefined && impact.daysElapsed < 7
                              ? `${7 - impact.daysElapsed} days until KAI evaluates impact. Minimum 7 days required.`
                              : "KAI will evaluate impact within the next review cycle."}
                          </p>
                        </div>
                      )}

                      {/* KAI Resolution (live tracking) */}
                      <div className="rounded-lg bg-muted/30 border border-border/30 px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Brain className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            KAI Live Tracking
                          </span>
                          <Badge variant="outline" className={cn("text-[9px] ml-auto", kCfg.color)}>
                            {dec.kaiResolution.status === "resurfaced" && <RefreshCw className="h-2.5 w-2.5 mr-0.5" />}
                            {kCfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{dec.kaiResolution.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Tracking: {dec.kaiResolution.metric} · Last checked {dec.kaiResolution.lastChecked}
                        </p>
                      </div>

                      {/* Notes */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                          Notes & Comments
                        </p>
                        {dec.notes.length > 0 ? (
                          <div className="space-y-1.5 mb-2">
                            {dec.notes.map((n) => (
                              <div key={n.id} className="flex items-start gap-2 text-xs">
                                <span className={cn("font-medium flex-shrink-0", n.author === "KAI" && "text-primary")}>
                                  {n.author}
                                </span>
                                <span className="text-muted-foreground flex-1">{n.text}</span>
                                <span className="text-[10px] text-muted-foreground flex-shrink-0">{n.timestamp}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mb-2">No notes yet.</p>
                        )}
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Add a note..."
                            className="h-7 text-xs flex-1"
                            value={noteInputs[dec.id] || ""}
                            onChange={(e) =>
                              setNoteInputs((prev) => ({ ...prev, [dec.id]: e.target.value }))
                            }
                            onKeyDown={(e) => e.key === "Enter" && addNote(dec.id)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => addNote(dec.id)}
                          >
                            <MessageSquarePlus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Quick Link */}
                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          to={`/startup/${dec.startupId}`}
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View {dec.startupName}
                        </Link>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default DecisionLog;
