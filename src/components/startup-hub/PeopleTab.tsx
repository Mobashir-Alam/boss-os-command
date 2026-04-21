import { useState, useMemo } from "react";
import { usePeople, Person } from "@/hooks/usePeople";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Users, Plus, Search, TrendingUp, TrendingDown, DollarSign, Brain,
  Pencil, Trash2, ChevronDown, ChevronRight, BarChart3,
  AlertTriangle, UserPlus, UserMinus, Zap
} from "lucide-react";
import AddPersonModal from "@/components/people/AddPersonModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  founder: "Founder", mfo: "MFO", functional_head: "Functional Head",
  project_manager: "Project Manager", team_member: "Team Member", cfo: "CFO",
};
const ROLE_HIERARCHY: Record<string, number> = {
  founder: 0, cfo: 1, mfo: 1, functional_head: 2, project_manager: 3, team_member: 4,
};
const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  at_risk: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  top_performer: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  inactive: "bg-muted text-muted-foreground border-border",
};
const STATUS_LABELS: Record<string, string> = {
  active: "Active", at_risk: "At Risk", top_performer: "Top Performer", inactive: "Inactive",
};
const EMP_LABELS: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract",
};

type ViewMode = "overview" | "structure" | "profiles" | "productivity" | "cost";

export default function PeopleTab({ startupId, startupSlug }: { startupId: string; startupSlug?: string }) {
  const { people: allPeople, isLoading, addPerson, updatePerson, deletePerson } = usePeople();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("overview");
  const [modalOpen, setModalOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  // Filter people linked to this startup
  const people = useMemo(() =>
    allPeople.filter((p) =>
      p.linked_startups?.includes(startupId) ||
      (startupSlug && p.linked_startups?.includes(startupSlug))
    ),
    [allPeople, startupId, startupSlug]
  );

  const filtered = useMemo(() => {
    if (!search) return people;
    const q = search.toLowerCase();
    return people.filter((p) => p.full_name.toLowerCase().includes(q) || p.department.toLowerCase().includes(q));
  }, [people, search]);

  // Aggregates
  const totalSalary = people.reduce((s, p) => s + (p.salary || 0), 0);
  const totalCtc = people.reduce((s, p) => s + (p.cost_to_company || 0), 0);
  const avgKpi = people.length ? Math.round(people.reduce((s, p) => s + (p.kpi_score || 0), 0) / people.length) : 0;
  const avgProductivity = people.length ? Math.round(people.reduce((s, p) => s + (p.productivity_score || 0), 0) / people.length) : 0;
  const departments = [...new Set(people.map((p) => p.department || "Unassigned"))];

  const deptBreakdown = departments.map((d) => {
    const dp = people.filter((p) => (p.department || "Unassigned") === d);
    return { name: d, count: dp.length, salary: dp.reduce((s, p) => s + (p.salary || 0), 0), avgKpi: dp.length ? Math.round(dp.reduce((s, p) => s + (p.kpi_score || 0), 0) / dp.length) : 0 };
  }).sort((a, b) => b.count - a.count);

  // KAI Insights
  const kaiInsights = useMemo(() => {
    const insights: { icon: typeof AlertTriangle; text: string; type: "warning" | "info" | "success" }[] = [];
    if (avgProductivity < 60) insights.push({ icon: TrendingDown, text: "Team productivity below 60% — review workload distribution", type: "warning" });
    if (avgProductivity >= 80) insights.push({ icon: TrendingUp, text: "Strong team productivity at " + avgProductivity + "%", type: "success" });
    const atRisk = people.filter((p) => p.status === "at_risk");
    if (atRisk.length > 0) insights.push({ icon: AlertTriangle, text: `${atRisk.length} team member${atRisk.length > 1 ? "s" : ""} at risk — review performance`, type: "warning" });
    const overloaded = people.filter((p) => p.tasks_assigned > 10 && p.tasks_completed / (p.tasks_assigned || 1) < 0.5);
    if (overloaded.length > 0) insights.push({ icon: UserPlus, text: `${overloaded.length} member${overloaded.length > 1 ? "s" : ""} overloaded — consider hiring`, type: "warning" });
    const lowPerf = people.filter((p) => p.kpi_score < 40 && p.status === "active");
    if (lowPerf.length > 0) insights.push({ icon: UserMinus, text: `Low performance detected in ${lowPerf.length} member${lowPerf.length > 1 ? "s" : ""}`, type: "warning" });
    if (totalSalary > 0 && avgKpi < 50) insights.push({ icon: DollarSign, text: "Cost increasing faster than output — consider restructuring", type: "warning" });
    if (insights.length === 0) insights.push({ icon: Zap, text: "Team looks healthy — no action needed", type: "success" });
    return insights;
  }, [people, avgProductivity, avgKpi, totalSalary]);

  // Org tree
  const orgTree = useMemo(() => {
    const roots = people.filter((p) => !p.reporting_manager_id || !people.find((m) => m.id === p.reporting_manager_id));
    const getChildren = (id: string): Person[] => people.filter((p) => p.reporting_manager_id === id);
    return { roots, getChildren };
  }, [people]);

  const handleAdd = (p: Partial<Person>) => {
    addPerson.mutate({ ...p, linked_startups: [startupId] }, {
      onSuccess: () => { setModalOpen(false); toast.success("Person added"); },
      onError: (e) => toast.error(e.message),
    });
  };
  const handleEdit = (p: Partial<Person>) => {
    if (!editPerson) return;
    updatePerson.mutate({ id: editPerson.id, ...p } as any, {
      onSuccess: () => { setEditPerson(null); toast.success("Updated"); },
      onError: (e) => toast.error(e.message),
    });
  };
  const handleDelete = (id: string) => {
    deletePerson.mutate(id, { onSuccess: () => toast.success("Removed"), onError: (e) => toast.error(e.message) });
  };

  const managerName = (id: string | null) => people.find((p) => p.id === id)?.full_name || "—";

  const viewTabs: { id: ViewMode; label: string; icon: typeof Users }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "structure", label: "Structure", icon: Users },
    { id: "profiles", label: "Profiles", icon: Users },
    { id: "productivity", label: "Productivity", icon: TrendingUp },
    { id: "cost", label: "Cost vs Perf", icon: DollarSign },
  ];

  const toggleDept = (d: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  };

  const renderOrgNode = (person: Person, depth: number) => {
    const children = orgTree.getChildren(person.id);
    return (
      <div key={person.id} style={{ marginLeft: depth * 24 }} className="py-1">
        <div className="flex items-center gap-2 group">
          {children.length > 0 ? (
            <button onClick={() => toggleDept(person.id)} className="p-0.5">
              {expandedDepts.has(person.id) ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </button>
          ) : <span className="w-4" />}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
              {person.full_name.charAt(0)}
            </div>
            <span className="text-sm font-medium truncate">{person.full_name}</span>
            <span className="text-[10px] text-muted-foreground">{ROLE_LABELS[person.role] || person.role}</span>
            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${STATUS_COLORS[person.status] || ""}`}>
              {STATUS_LABELS[person.status] || person.status}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{person.kpi_score}% KPI</span>
        </div>
        {expandedDepts.has(person.id) && children
          .sort((a, b) => (ROLE_HIERARCHY[a.role] || 5) - (ROLE_HIERARCHY[b.role] || 5))
          .map((c) => renderOrgNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">People & Performance</h3>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setModalOpen(true)}>
          <Plus className="h-3 w-3" /> Add Person
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Team Size", value: people.length.toString(), sub: `${departments.length} depts` },
          { label: "Salary Burn", value: `₹${(totalSalary / 100000).toFixed(1)}L`, sub: `CTC ₹${(totalCtc / 100000).toFixed(1)}L` },
          { label: "Avg KPI", value: `${avgKpi}%`, sub: avgKpi >= 70 ? "Healthy" : avgKpi >= 50 ? "Average" : "Low" },
          { label: "Productivity", value: `${avgProductivity}%`, sub: avgProductivity >= 70 ? "Strong" : "Needs attention" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{c.label}</p>
            <p className="text-xl font-bold">{c.value}</p>
            <p className="text-[10px] text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Department Breakdown */}
      {deptBreakdown.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Department Breakdown</p>
          <div className="space-y-2">
            {deptBreakdown.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="text-xs font-medium w-24 truncate">{d.name}</span>
                <div className="flex-1"><Progress value={(d.count / (people.length || 1)) * 100} className="h-1.5" /></div>
                <span className="text-[10px] text-muted-foreground tabular-nums w-16 text-right">{d.count} · {d.avgKpi}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KAI Insights */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">KAI People Insights</p>
        </div>
        <div className="space-y-2">
          {kaiInsights.map((ins, i) => {
            const Icon = ins.icon;
            return (
              <div key={i} className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
                ins.type === "warning" ? "bg-amber-500/5 text-amber-300" : ins.type === "success" ? "bg-emerald-500/5 text-emerald-300" : "bg-blue-500/5 text-blue-300"
              )}>
                <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{ins.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-1 border-b border-border/40 pb-px">
        {viewTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setView(t.id)}
              className={cn("flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors rounded-t-lg",
                view === t.id ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              )}>
              <Icon className="h-3 w-3" />{t.label}
            </button>
          );
        })}
        <div className="ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-7 text-xs w-40" />
          </div>
        </div>
      </div>

      {/* View Content */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>
      ) : people.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
          <Users className="h-6 w-6 mx-auto mb-2 opacity-30" />
          <p className="text-sm text-muted-foreground">No team members yet</p>
          <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => setModalOpen(true)}>Add first member</Button>
        </div>
      ) : (
        <>
          {/* Structure View */}
          {view === "structure" && (
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Org Structure</p>
              <div className="space-y-0.5">
                {orgTree.roots
                  .sort((a, b) => (ROLE_HIERARCHY[a.role] || 5) - (ROLE_HIERARCHY[b.role] || 5))
                  .map((p) => renderOrgNode(p, 0))}
              </div>
            </div>
          )}

          {/* Profiles / Overview Table */}
          {(view === "profiles" || view === "overview") && (
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="text-[10px] font-semibold">Name</TableHead>
                    <TableHead className="text-[10px] font-semibold">Role</TableHead>
                    <TableHead className="text-[10px] font-semibold">Dept</TableHead>
                    <TableHead className="text-[10px] font-semibold">Status</TableHead>
                    <TableHead className="text-[10px] font-semibold">Manager</TableHead>
                    <TableHead className="text-[10px] font-semibold text-right">KPI</TableHead>
                    <TableHead className="text-[10px] font-semibold text-right">Tasks</TableHead>
                    <TableHead className="text-[10px] font-semibold text-right">Salary</TableHead>
                    <TableHead className="text-[10px] font-semibold w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id} className="group">
                      <TableCell className="text-sm font-medium py-2.5">{p.full_name}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">{ROLE_LABELS[p.role] || p.role}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">{p.department || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-[9px] px-1 py-0 ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</Badge></TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">{managerName(p.reporting_manager_id)}</TableCell>
                      <TableCell className="text-right text-[11px] tabular-nums">{p.kpi_score}%</TableCell>
                      <TableCell className="text-right text-[11px] tabular-nums text-muted-foreground">{p.tasks_completed}/{p.tasks_assigned}</TableCell>
                      <TableCell className="text-right text-[11px] tabular-nums">₹{(p.salary || 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditPerson(p)} className="p-1 rounded hover:bg-muted"><Pencil className="h-3 w-3 text-muted-foreground" /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="h-3 w-3 text-destructive/70" /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Productivity View */}
          {view === "productivity" && (
            <div className="space-y-3">
              {filtered.map((p) => {
                const efficiency = p.hours_committed ? (p.weekly_output_score / p.hours_committed).toFixed(2) : "—";
                const taskRate = p.tasks_assigned ? Math.round((p.tasks_completed / p.tasks_assigned) * 100) : 0;
                return (
                  <div key={p.id} className="rounded-xl border border-border/60 bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{p.full_name.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-medium">{p.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[p.role]} · {p.department || "—"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                      {[
                        { label: "KPI Score", value: `${p.kpi_score}%` },
                        { label: "Productivity", value: `${p.productivity_score}%` },
                        { label: "Task Rate", value: `${taskRate}%` },
                        { label: "Hours", value: `${p.hours_delivered}/${p.hours_committed}` },
                        { label: "Efficiency", value: efficiency },
                      ].map((m) => (
                        <div key={m.label}>
                          <p className="text-[9px] text-muted-foreground uppercase">{m.label}</p>
                          <p className="text-sm font-semibold tabular-nums">{m.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground w-12">KPI</span>
                        <Progress value={p.kpi_score} className="h-1.5 flex-1" />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-muted-foreground w-12">Output</span>
                        <Progress value={p.productivity_score} className="h-1.5 flex-1" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cost vs Performance View */}
          {view === "cost" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Salary vs Output</p>
                <div className="space-y-2">
                  {filtered.sort((a, b) => (b.salary || 0) - (a.salary || 0)).map((p) => {
                    const costEfficiency = p.salary ? Math.round((p.kpi_score / (p.salary / 100000)) * 10) / 10 : 0;
                    const bar = totalSalary ? ((p.salary || 0) / totalSalary) * 100 : 0;
                    return (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="text-xs font-medium w-28 truncate">{p.full_name}</span>
                        <div className="flex-1 relative h-5 bg-muted/30 rounded overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-primary/20 rounded" style={{ width: `${bar}%` }} />
                          <div className="absolute inset-y-0 left-0 bg-emerald-500/30 rounded" style={{ width: `${p.kpi_score}%` }} />
                          <div className="absolute inset-0 flex items-center px-2 text-[9px] text-muted-foreground">
                            ₹{((p.salary || 0) / 1000).toFixed(0)}K → {p.kpi_score}% KPI
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums w-20 text-right">
                          {costEfficiency} pts/L
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">By Department</p>
                  {deptBreakdown.map((d) => (
                    <div key={d.name} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                      <span className="text-xs">{d.name}</span>
                      <div className="text-right">
                        <span className="text-xs tabular-nums">₹{(d.salary / 100000).toFixed(1)}L</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{d.avgKpi}% KPI</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">By Employment Type</p>
                  {["full_time", "part_time", "contract"].map((t) => {
                    const tp = people.filter((p) => p.employment_type === t);
                    if (!tp.length) return null;
                    return (
                      <div key={t} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                        <span className="text-xs">{EMP_LABELS[t]}</span>
                        <div className="text-right">
                          <span className="text-xs tabular-nums">{tp.length} people</span>
                          <span className="text-[10px] text-muted-foreground ml-2">₹{(tp.reduce((s, p) => s + (p.salary || 0), 0) / 100000).toFixed(1)}L</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <AddPersonModal open={modalOpen} onOpenChange={setModalOpen} onSubmit={handleAdd}
          isPending={addPerson.isPending} startups={[]} people={allPeople} />
      )}
      {editPerson && (
        <AddPersonModal open={!!editPerson} onOpenChange={(v) => !v && setEditPerson(null)} onSubmit={handleEdit}
          isPending={updatePerson.isPending} startups={[]} people={allPeople} editPerson={editPerson} />
      )}
    </div>
  );
}
