import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { decisionEntries, type DecisionEntry, type DecisionStatus } from "@/data/decisions";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Brain,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
  MessageSquarePlus,
  RefreshCw,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<DecisionStatus, { label: string; badge: string; dot: string }> = {
  pending: { label: "Pending", badge: "bg-amber-500/10 text-amber-500 border-amber-500/30", dot: "bg-amber-500" },
  "in-progress": { label: "In Progress", badge: "bg-blue-500/10 text-blue-500 border-blue-500/30", dot: "bg-blue-500" },
  resolved: { label: "Resolved", badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30", dot: "bg-emerald-500" },
  "re-evaluate": { label: "Re-evaluate", badge: "bg-red-500/10 text-red-500 border-red-500/30", dot: "bg-red-500" },
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
  resurfaced: { color: "text-red-500", label: "Resurfaced" },
};

const DecisionLog = () => {
  const [filterStartup, setFilterStartup] = useState("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const startups = [...new Set(decisionEntries.map((d) => d.startupName))];
  const owners = [...new Set(decisionEntries.map((d) => d.owner))];

  const filtered = decisionEntries.filter((d) => {
    if (filterStartup !== "all" && d.startupName !== filterStartup) return false;
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    if (filterOwner !== "all" && d.owner !== filterOwner) return false;
    return true;
  });

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
              Track strategic decisions from acceptance to resolution.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
              <User className="h-3 w-3 text-muted-foreground" />
              <select
                value={filterOwner}
                onChange={(e) => setFilterOwner(e.target.value)}
                className="bg-transparent text-xs font-medium outline-none cursor-pointer"
              >
                <option value="all">All Owners</option>
                {owners.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
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
                            <span>{dec.owner}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
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
                      {/* Reasoning */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                          Reasoning / KAI Recommendation
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
                        </div>
                      )}

                      {/* Outcome */}
                      {dec.status === "resolved" && dec.outcome && (
                        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 mb-0.5">
                            Outcome
                          </p>
                          <p className="text-xs text-foreground">{dec.outcome}</p>
                        </div>
                      )}

                      {/* KAI Resolution Insight */}
                      <div className="rounded-lg bg-muted/30 border border-border/30 px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Brain className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            KAI Resolution
                          </span>
                          <Badge variant="outline" className={cn("text-[9px] ml-auto", kCfg.color)}>
                            {dec.kaiResolution.status === "resurfaced" && <RefreshCw className="h-2.5 w-2.5 mr-0.5" />}
                            {kCfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{dec.kaiResolution.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Metric: {dec.kaiResolution.metric} · Checked {dec.kaiResolution.lastChecked}
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
                                <span className="font-medium flex-shrink-0">{n.author}</span>
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
