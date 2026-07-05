import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { usePeople, Person } from "@/hooks/usePeople";
import { useStartups } from "@/hooks/useStartups";
import { usePersonProjects } from "@/hooks/useEmployeeProjects";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ArrowUpDown, Trash2, Pencil, Users, ChevronDown, ChevronRight, Layers, Calendar, Link2, Activity } from "lucide-react";
import AddPersonModal from "@/components/people/AddPersonModal";
import EditLinksModal from "@/components/people/EditLinksModal";
import PersonActivityRow from "@/components/people/PersonActivityRow";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  founder: "Founder", mfo: "MFO", functional_head: "Functional Head",
  project_manager: "Project Manager", team_member: "Team Member", cfo: "CFO",
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

type SortKey = "full_name" | "role" | "department" | "status" | "kpi_score" | "salary";

const PROJECT_STATUS_DOT: Record<string, string> = {
  not_started: "bg-muted-foreground",
  in_progress:  "bg-blue-500",
  done:         "bg-emerald-500",
  blocked:      "bg-amber-500",
};
const PROJECT_STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress:  "In progress",
  done:         "Done",
  blocked:      "Blocked",
};

function PersonProjectsRow({ personId, colSpan }: { personId: string; colSpan: number }) {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = usePersonProjects(personId);

  return (
    <TableRow className="bg-muted/20 hover:bg-muted/20">
      <TableCell colSpan={colSpan} className="py-3 px-6">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No projects assigned</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => {
              const member = project.my_member_row;
              const status = member?.status ?? "not_started";
              const dl = project.deadline
                ? (() => {
                    const d = new Date(project.deadline);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? "Due today" : `${diff}d left`;
                  })()
                : null;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-2 text-left hover:border-border hover:shadow-sm transition-all"
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", PROJECT_STATUS_DOT[status])} />
                  <span className="text-xs font-medium max-w-[160px] truncate">{project.title}</span>
                  {project.department_key && (
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      · {project.department_key.replace(/_/g, " ")}
                    </span>
                  )}
                  {member && (
                    <span className="text-[10px] tabular-nums text-muted-foreground">{member.completion_percentage}%</span>
                  )}
                  {dl && (
                    <span className="text-[10px] text-muted-foreground hidden md:inline">· {dl}</span>
                  )}
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function PeopleOS() {
  const { people, isLoading, addPerson, updatePerson, deletePerson } = usePeople();
  const { dbStartups } = useStartups();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);
  const [activityPersonId, setActivityPersonId] = useState<string | null>(null);
  const [linksPerson, setLinksPerson] = useState<Person | null>(null);

  // Connector data (Slack/GitHub) is scoped to the nasheedio startup
  const connectorStartupId =
    dbStartups?.find((s) => s.slug === "nasheedio")?.id ?? dbStartups?.[0]?.id;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let list = [...people];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.full_name.toLowerCase().includes(q) || p.department.toLowerCase().includes(q));
    }
    if (filterRole !== "all") list = list.filter((p) => p.role === filterRole);
    if (filterStatus !== "all") list = list.filter((p) => p.status === filterStatus);
    list.sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [people, search, filterRole, filterStatus, sortKey, sortDir]);

  const handleAdd = (p: Partial<Person>) => {
    addPerson.mutate(p, {
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
    deletePerson.mutate(id, {
      onSuccess: () => toast.success("Removed"),
      onError: (e) => toast.error(e.message),
    });
  };

  const managerName = (id: string | null) => {
    if (!id) return "—";
    return people.find((p) => p.id === id)?.full_name || "—";
  };

  const SortBtn = ({ label, col }: { label: string; col: SortKey }) => (
    <button type="button" onClick={() => toggleSort(col)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className="h-3 w-3 opacity-40" />
    </button>
  );

  const startupList = dbStartups?.map((s) => ({ id: s.id, name: s.name })) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">People OS</h1>
              <p className="text-xs text-muted-foreground">{people.length} people across all startups</p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Person
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search name or department..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold w-[200px]"><SortBtn label="Name" col="full_name" /></TableHead>
                <TableHead className="text-xs font-semibold"><SortBtn label="Role" col="role" /></TableHead>
                <TableHead className="text-xs font-semibold"><SortBtn label="Dept" col="department" /></TableHead>
                <TableHead className="text-xs font-semibold"><SortBtn label="Status" col="status" /></TableHead>
                <TableHead className="text-xs font-semibold">Type</TableHead>
                <TableHead className="text-xs font-semibold">Manager</TableHead>
                <TableHead className="text-xs font-semibold text-right"><SortBtn label="KPI %" col="kpi_score" /></TableHead>
                <TableHead className="text-xs font-semibold text-right">Tasks</TableHead>
                <TableHead className="text-xs font-semibold text-right">Hours</TableHead>
                <TableHead className="text-xs font-semibold text-right"><SortBtn label="Salary" col="salary" /></TableHead>
                <TableHead className="text-xs font-semibold w-[100px]">Projects</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-12">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-12">No people found</TableCell></TableRow>
              ) : (
                filtered.map((p) => {
                  const isExpanded = expandedPersonId === p.id;
                  return (
                    <>
                      <TableRow key={p.id} className="group">
                        <TableCell className="font-medium text-sm">
                          <button
                            type="button"
                            onClick={() => setExpandedPersonId(isExpanded ? null : p.id)}
                            className="flex items-center gap-1.5 text-left hover:text-primary transition-colors"
                            title={`${isExpanded ? "Hide" : "Show"} projects for ${p.full_name}`}
                          >
                            {isExpanded
                              ? <ChevronDown className="h-3 w-3 text-primary flex-shrink-0" />
                              : <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            }
                            {p.full_name}
                          </button>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ROLE_LABELS[p.role] || p.role}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.department || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[p.status] || ""}`}>
                            {STATUS_LABELS[p.status] || p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{EMP_LABELS[p.employment_type] || p.employment_type}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{managerName(p.reporting_manager_id)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{p.kpi_score}%</TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{p.tasks_completed}/{p.tasks_assigned}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{p.hours_delivered}/{p.hours_committed}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">₹{(p.salary || 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              title={`View projects for ${p.full_name}`}
                              onClick={() => setExpandedPersonId(isExpanded ? null : p.id)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Layers className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title={`Edit Slack/GitHub links for ${p.full_name}`}
                              onClick={() => setLinksPerson(p)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Link2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title={`View 7-day activity for ${p.full_name}`}
                              onClick={() =>
                                setActivityPersonId(activityPersonId === p.id ? null : p.id)
                              }
                              className={cn(
                                "p-1 rounded hover:bg-muted transition-colors",
                                activityPersonId === p.id
                                  ? "text-primary"
                                  : "text-muted-foreground hover:text-primary"
                              )}
                            >
                              <Activity className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title={`Edit ${p.full_name}`}
                              onClick={() => setEditPerson(p)}
                              className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button
                              type="button"
                              title={`Remove ${p.full_name}`}
                              onClick={() => handleDelete(p.id)}
                              className="p-1 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <PersonProjectsRow key={`${p.id}-projects`} personId={p.id} colSpan={11} />
                      )}
                      {activityPersonId === p.id && connectorStartupId && (
                        <PersonActivityRow
                          key={`${p.id}-activity`}
                          personId={p.id}
                          startupId={connectorStartupId}
                          colSpan={11}
                        />
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {modalOpen && (
        <AddPersonModal open={modalOpen} onOpenChange={setModalOpen} onSubmit={handleAdd}
          isPending={addPerson.isPending} startups={startupList} people={people} />
      )}
      {editPerson && (
        <AddPersonModal open={!!editPerson} onOpenChange={(v) => !v && setEditPerson(null)} onSubmit={handleEdit}
          isPending={updatePerson.isPending} startups={startupList} people={people} editPerson={editPerson} />
      )}
      {linksPerson && connectorStartupId && (
        <EditLinksModal
          open={!!linksPerson}
          onOpenChange={(v) => !v && setLinksPerson(null)}
          personId={linksPerson.id}
          personName={linksPerson.full_name}
          startupId={connectorStartupId}
        />
      )}
    </div>
  );
}
