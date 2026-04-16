import { useState, useMemo } from "react";
import { useProductOutcomes, useProductInitiatives, useProductFeatures, useTechHealth } from "@/hooks/useProductEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Target, Layers, Package, Bug, Brain, Plus, X, Loader2,
  TrendingUp, TrendingDown, Zap, Clock, AlertTriangle,
  CheckCircle2, ChevronDown, ChevronRight, Rocket, BarChart3, Gauge
} from "lucide-react";
import { cn } from "@/lib/utils";

const OUTCOME_ICONS: Record<string, typeof Target> = { retention: Target, conversion: TrendingUp, growth: Rocket, default: Target };
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "text-emerald-400" },
  planned: { label: "Planned", color: "text-muted-foreground" },
  "in-progress": { label: "In Progress", color: "text-blue-400" },
  in_progress: { label: "In Progress", color: "text-blue-400" },
  completed: { label: "Done", color: "text-emerald-400" },
  done: { label: "Done", color: "text-emerald-400" },
  backlog: { label: "Backlog", color: "text-muted-foreground" },
  building: { label: "Building", color: "text-blue-400" },
  released: { label: "Released", color: "text-emerald-400" },
  open: { label: "Open", color: "text-red-400" },
  resolved: { label: "Resolved", color: "text-emerald-400" },
};
const PRIORITY_COLORS: Record<string, string> = { high: "text-red-400 border-red-500/20", medium: "text-amber-400 border-amber-500/20", low: "text-muted-foreground border-border" };
const SEVERITY_COLORS: Record<string, string> = { critical: "text-red-400", high: "text-amber-400", medium: "text-muted-foreground", low: "text-muted-foreground" };
const FEATURE_STATUSES = ["backlog", "building", "released"];
const TECH_CATEGORIES = [
  { value: "bug", label: "Bug", icon: Bug },
  { value: "tech_debt", label: "Tech Debt", icon: AlertTriangle },
  { value: "performance", label: "Performance", icon: Gauge },
];

type View = "roadmap" | "delivery" | "tech" | "impact";

interface Props { startupId: string }

export default function ProductEngine({ startupId }: Props) {
  const outcomes = useProductOutcomes(startupId);
  const initiatives = useProductInitiatives(startupId);
  const features = useProductFeatures(startupId);
  const techHealth = useTechHealth(startupId);

  const [view, setView] = useState<View>("roadmap");
  const [addModal, setAddModal] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [expandedOutcomes, setExpandedOutcomes] = useState<Set<string>>(new Set());

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Aggregates
  const totalFeatures = features.data.length;
  const released = features.data.filter((f: any) => f.status === "released");
  const building = features.data.filter((f: any) => f.status === "building");
  const avgCycleTime = released.length ? Math.round(released.reduce((s: number, f: any) => s + (f.cycle_time_days || 0), 0) / released.length) : 0;
  const openBugs = techHealth.data.filter((t: any) => t.status === "open" && t.category === "bug").length;
  const openDebt = techHealth.data.filter((t: any) => t.status === "open" && t.category === "tech_debt").length;
  const openPerf = techHealth.data.filter((t: any) => t.status === "open" && t.category === "performance").length;

  // KAI Insights
  const kaiInsights = useMemo(() => {
    const ins: { text: string; type: "warning" | "success" | "info" }[] = [];
    const lowImpact = released.filter((f: any) => f.impact_score > 0 && f.impact_score < 3);
    if (lowImpact.length > 0) ins.push({ text: `${lowImpact.length} released feature${lowImpact.length > 1 ? "s" : ""} with low impact — review if they moved the needle`, type: "warning" });
    const highImpact = released.filter((f: any) => f.impact_score >= 7);
    if (highImpact.length > 0) ins.push({ text: `${highImpact.length} high-impact feature${highImpact.length > 1 ? "s" : ""} shipped — doubling down on what works`, type: "success" });
    if (openBugs >= 5) ins.push({ text: `${openBugs} open bugs — product quality at risk`, type: "warning" });
    if (openDebt >= 3) ins.push({ text: `Tech debt rising (${openDebt} items) — allocate sprint capacity`, type: "warning" });
    if (avgCycleTime > 14) ins.push({ text: `Avg cycle time ${avgCycleTime} days — delivery speed needs improvement`, type: "warning" });
    if (avgCycleTime > 0 && avgCycleTime <= 7) ins.push({ text: `Fast delivery at ${avgCycleTime} day avg cycle time`, type: "success" });
    if (building.length > 5) ins.push({ text: `${building.length} features in progress — consider focusing on fewer items`, type: "info" });
    const outcomesMissing = outcomes.data.filter((o: any) => o.current_value < o.target_value * 0.5 && o.status === "active");
    if (outcomesMissing.length > 0) ins.push({ text: `${outcomesMissing.map((o: any) => o.name).join(", ")} below target — focus product effort here`, type: "warning" });
    if (ins.length === 0) ins.push({ text: "Add outcomes, features, and tech health data to unlock insights", type: "info" });
    return ins;
  }, [released, openBugs, openDebt, avgCycleTime, building, outcomes.data]);

  const toggleOutcome = (id: string) => {
    setExpandedOutcomes((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleAdd = () => {
    if (addModal === "outcome") outcomes.add.mutate(form, { onSuccess: () => { setAddModal(null); setForm({}); } });
    else if (addModal === "initiative") initiatives.add.mutate(form, { onSuccess: () => { setAddModal(null); setForm({}); } });
    else if (addModal === "feature") features.add.mutate(form, { onSuccess: () => { setAddModal(null); setForm({}); } });
    else if (addModal === "tech") techHealth.add.mutate(form, { onSuccess: () => { setAddModal(null); setForm({}); } });
  };

  const nextStatus = (current: string, statuses: string[]) => {
    const i = statuses.indexOf(current);
    return statuses[(i + 1) % statuses.length];
  };

  const views: { id: View; label: string; icon: typeof Target }[] = [
    { id: "roadmap", label: "Roadmap", icon: Layers },
    { id: "delivery", label: "Delivery", icon: Package },
    { id: "tech", label: "Tech Health", icon: Bug },
    { id: "impact", label: "Impact", icon: BarChart3 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Rocket className="h-4 w-4" /> Product & Tech Engine
        </h3>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Outcomes", value: outcomes.data.length.toString(), icon: Target },
          { label: "Features", value: `${released.length}/${totalFeatures}`, sub: "shipped", icon: Package },
          { label: "Cycle Time", value: avgCycleTime ? `${avgCycleTime}d` : "—", icon: Clock },
          { label: "Open Bugs", value: openBugs.toString(), icon: Bug },
          { label: "Tech Debt", value: openDebt.toString(), icon: AlertTriangle },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-xl border border-border/60 bg-card p-3.5">
              <div className="flex items-center gap-1.5 mb-1"><Icon className="h-3 w-3 text-muted-foreground" /><p className="text-[10px] text-muted-foreground uppercase">{c.label}</p></div>
              <p className="text-lg font-bold">{c.value}</p>
            </div>
          );
        })}
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-1 border-b border-border/40 pb-px">
        {views.map((v) => {
          const Icon = v.icon;
          return (
            <button key={v.id} onClick={() => setView(v.id)}
              className={cn("flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors rounded-t-lg",
                view === v.id ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              )}><Icon className="h-3 w-3" />{v.label}</button>
          );
        })}
      </div>

      {/* ROADMAP VIEW */}
      {view === "roadmap" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Outcomes → Initiatives → Features</p>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => { setForm({}); setAddModal("outcome"); }}><Plus className="h-3 w-3" />Outcome</Button>
              <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => { setForm({}); setAddModal("initiative"); }}><Plus className="h-3 w-3" />Initiative</Button>
              <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => { setForm({}); setAddModal("feature"); }}><Plus className="h-3 w-3" />Feature</Button>
            </div>
          </div>

          {outcomes.data.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/50 bg-card/50 p-8 text-center">
              <Target className="h-6 w-6 mx-auto mb-2 opacity-30" />
              <p className="text-xs text-muted-foreground">Define outcomes like Retention, Conversion, Growth to get started</p>
            </div>
          ) : (
            outcomes.data.map((o: any) => {
              const oInitiatives = initiatives.data.filter((i: any) => i.outcome_id === o.id);
              const expanded = expandedOutcomes.has(o.id);
              const pct = o.target_value > 0 ? Math.round((o.current_value / o.target_value) * 100) : 0;
              return (
                <div key={o.id} className="rounded-xl border border-border/60 bg-card">
                  <button onClick={() => toggleOutcome(o.id)} className="w-full p-4 flex items-center justify-between text-left">
                    <div className="flex items-center gap-2">
                      {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{o.name}</span>
                      <Badge variant="outline" className={cn("text-[9px] px-1 py-0 border-current", STATUS_MAP[o.status]?.color)}>{STATUS_MAP[o.status]?.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24"><Progress value={pct} className="h-1.5" /></div>
                      <span className="text-[10px] tabular-nums text-muted-foreground">{o.current_value}/{o.target_value}</span>
                      <button onClick={(e) => { e.stopPropagation(); outcomes.remove.mutate(o.id); }} className="p-1 hover:bg-destructive/10 rounded opacity-0 group-hover:opacity-100"><X className="h-3 w-3 text-destructive/70" /></button>
                    </div>
                  </button>
                  {expanded && (
                    <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
                      {oInitiatives.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground pl-6">No initiatives yet</p>
                      ) : oInitiatives.map((ini: any) => {
                        const iniFeatures = features.data.filter((f: any) => f.initiative_id === ini.id);
                        return (
                          <div key={ini.id} className="pl-6">
                            <div className="flex items-center justify-between py-1">
                              <div className="flex items-center gap-2">
                                <Layers className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs font-medium">{ini.name}</span>
                                <Badge variant="outline" className={cn("text-[9px] px-1 py-0 border-current", PRIORITY_COLORS[ini.priority])}>{ini.priority}</Badge>
                                <button onClick={() => initiatives.update.mutate({ id: ini.id, status: nextStatus(ini.status, ["planned", "in-progress", "completed"]) })}
                                  className={cn("text-[9px] font-medium", STATUS_MAP[ini.status]?.color)}>{STATUS_MAP[ini.status]?.label}</button>
                              </div>
                              <button onClick={() => initiatives.remove.mutate(ini.id)} className="p-0.5 hover:bg-destructive/10 rounded"><X className="h-3 w-3 text-destructive/70" /></button>
                            </div>
                            {iniFeatures.length > 0 && (
                              <div className="pl-5 space-y-1 mt-1">
                                {iniFeatures.map((f: any) => (
                                  <div key={f.id} className="flex items-center justify-between py-0.5 group">
                                    <div className="flex items-center gap-2">
                                      <Package className="h-2.5 w-2.5 text-muted-foreground" />
                                      <span className="text-[11px]">{f.name}</span>
                                      <span className="text-[9px] text-muted-foreground capitalize">{f.feature_type}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => features.update.mutate({ id: f.id, status: nextStatus(f.status, FEATURE_STATUSES) })}
                                        className={cn("text-[9px] font-medium", STATUS_MAP[f.status]?.color)}>{STATUS_MAP[f.status]?.label}</button>
                                      <button onClick={() => features.remove.mutate(f.id)} className="p-0.5 hover:bg-destructive/10 rounded opacity-0 group-hover:opacity-100"><X className="h-2.5 w-2.5 text-destructive/70" /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* DELIVERY VIEW */}
      {view === "delivery" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Delivery Pipeline</p>
            <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => { setForm({}); setAddModal("feature"); }}><Plus className="h-3 w-3" />Feature</Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {FEATURE_STATUSES.map((status) => {
              const items = features.data.filter((f: any) => f.status === status);
              const st = STATUS_MAP[status];
              return (
                <div key={status} className="rounded-xl border border-border/60 bg-card p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn("text-[10px] font-semibold uppercase", st?.color)}>{st?.label}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{items.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {items.map((f: any) => (
                      <div key={f.id} className="rounded-lg border border-border/40 p-2.5 group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{f.name}</span>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => features.update.mutate({ id: f.id, status: nextStatus(f.status, FEATURE_STATUSES) })} className="p-0.5 hover:bg-muted rounded">
                              <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                            </button>
                            <button onClick={() => features.remove.mutate(f.id)} className="p-0.5 hover:bg-destructive/10 rounded"><X className="h-3 w-3 text-destructive/70" /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                          <span className="capitalize">{f.feature_type}</span>
                          {f.cycle_time_days > 0 && <span>{f.cycle_time_days}d cycle</span>}
                          {f.impact_score > 0 && <span>Impact: {f.impact_score}/10</span>}
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-4">Empty</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TECH HEALTH VIEW */}
      {view === "tech" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Tech Health</p>
            <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => { setForm({ category: "bug", severity: "medium" }); setAddModal("tech"); }}><Plus className="h-3 w-3" />Add</Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {TECH_CATEGORIES.map((cat) => {
              const items = techHealth.data.filter((t: any) => t.category === cat.value);
              const openCount = items.filter((t: any) => t.status === "open").length;
              const Icon = cat.icon;
              return (
                <div key={cat.value} className="rounded-xl border border-border/60 bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold">{cat.label}</span>
                    {openCount > 0 && <Badge variant="outline" className="text-[9px] px-1 py-0 text-red-400 border-red-500/20">{openCount} open</Badge>}
                  </div>
                  <div className="space-y-1.5">
                    {items.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between py-1 border-b border-border/20 last:border-0 group">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", t.status === "open" ? "bg-red-400" : "bg-emerald-400")} />
                          <span className="text-[11px] truncate">{t.title}</span>
                          <span className={cn("text-[9px] capitalize", SEVERITY_COLORS[t.severity])}>{t.severity}</span>
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                          <button onClick={() => techHealth.update.mutate({ id: t.id, status: t.status === "open" ? "resolved" : "open" })} className="p-0.5 hover:bg-muted rounded">
                            <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button onClick={() => techHealth.remove.mutate(t.id)} className="p-0.5 hover:bg-destructive/10 rounded"><X className="h-3 w-3 text-destructive/70" /></button>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-3">None tracked</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* IMPACT VIEW */}
      {view === "impact" && (
        <div className="space-y-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Feature → Growth Impact</p>
          {released.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/50 bg-card/50 p-8 text-center">
              <BarChart3 className="h-6 w-6 mx-auto mb-2 opacity-30" />
              <p className="text-xs text-muted-foreground">Ship features and set impact scores to see product→growth links</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2.5">
              {released.sort((a: any, b: any) => (b.impact_score || 0) - (a.impact_score || 0)).map((f: any) => {
                const initiative = initiatives.data.find((i: any) => i.id === f.initiative_id);
                const outcome = initiative ? outcomes.data.find((o: any) => o.id === initiative.outcome_id) : null;
                return (
                  <div key={f.id} className="flex items-center gap-3">
                    <div className="w-36 shrink-0">
                      <p className="text-xs font-medium truncate">{f.name}</p>
                      {outcome && <p className="text-[9px] text-muted-foreground">→ {outcome.name}</p>}
                    </div>
                    <div className="flex-1 relative h-5 bg-muted/20 rounded overflow-hidden">
                      <div className="absolute inset-y-0 left-0 rounded" style={{
                        width: `${(f.impact_score || 0) * 10}%`,
                        background: f.impact_score >= 7 ? "hsl(var(--primary) / 0.35)" : f.impact_score >= 4 ? "hsl(45 100% 50% / 0.2)" : "hsl(0 80% 50% / 0.15)"
                      }} />
                      <div className="absolute inset-0 flex items-center px-2 text-[9px] text-muted-foreground">
                        Impact: {f.impact_score}/10 {f.cycle_time_days > 0 && `· ${f.cycle_time_days}d cycle`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* KAI Insights */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">KAI Product Insights</p>
        </div>
        <div className="space-y-2">
          {kaiInsights.map((ins, i) => (
            <div key={i} className={cn("flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs",
              ins.type === "warning" ? "bg-amber-500/5 text-amber-300" : ins.type === "success" ? "bg-emerald-500/5 text-emerald-300" : "bg-blue-500/5 text-blue-300"
            )}>
              <Brain className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{ins.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Modal */}
      <Dialog open={!!addModal} onOpenChange={(v) => !v && setAddModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base">
            Add {addModal === "outcome" ? "Outcome" : addModal === "initiative" ? "Initiative" : addModal === "feature" ? "Feature" : "Tech Issue"}
          </DialogTitle></DialogHeader>
          <div className="space-y-3">
            {addModal === "outcome" && (
              <>
                <div><Label className="text-xs text-muted-foreground">Name (e.g. Retention, Conversion)</Label><Input className="h-9 text-sm" onChange={(e) => set("name", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs text-muted-foreground">Target</Label><Input type="number" className="h-9 text-sm" onChange={(e) => set("target_value", +e.target.value)} /></div>
                  <div><Label className="text-xs text-muted-foreground">Current</Label><Input type="number" className="h-9 text-sm" onChange={(e) => set("current_value", +e.target.value)} /></div>
                </div>
              </>
            )}
            {addModal === "initiative" && (
              <>
                <div><Label className="text-xs text-muted-foreground">Name</Label><Input className="h-9 text-sm" onChange={(e) => set("name", e.target.value)} /></div>
                <div>
                  <Label className="text-xs text-muted-foreground">Linked Outcome</Label>
                  <Select onValueChange={(v) => set("outcome_id", v)}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{outcomes.data.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <Select onValueChange={(v) => set("priority", v)} defaultValue="medium"><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                  </Select>
                </div>
              </>
            )}
            {addModal === "feature" && (
              <>
                <div><Label className="text-xs text-muted-foreground">Name</Label><Input className="h-9 text-sm" onChange={(e) => set("name", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <Select onValueChange={(v) => set("feature_type", v)} defaultValue="feature"><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="feature">Feature</SelectItem><SelectItem value="task">Task</SelectItem><SelectItem value="ticket">Ticket</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Initiative</Label>
                    <Select onValueChange={(v) => set("initiative_id", v)}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>{initiatives.data.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs text-muted-foreground">Cycle Time (days)</Label><Input type="number" className="h-9 text-sm" onChange={(e) => set("cycle_time_days", +e.target.value)} /></div>
                  <div><Label className="text-xs text-muted-foreground">Impact Score (0-10)</Label><Input type="number" className="h-9 text-sm" min={0} max={10} onChange={(e) => set("impact_score", +e.target.value)} /></div>
                </div>
              </>
            )}
            {addModal === "tech" && (
              <>
                <div><Label className="text-xs text-muted-foreground">Title</Label><Input className="h-9 text-sm" onChange={(e) => set("title", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <Select onValueChange={(v) => set("category", v)} defaultValue="bug"><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{TECH_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Severity</Label>
                    <Select onValueChange={(v) => set("severity", v)} defaultValue="medium"><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setAddModal(null)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={!form.name && !form.title}>
                {(outcomes.add.isPending || initiatives.add.isPending || features.add.isPending || techHealth.add.isPending) && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
