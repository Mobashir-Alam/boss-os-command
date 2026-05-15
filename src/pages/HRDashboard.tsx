import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, CalendarCheck, Search, CheckCircle2, XCircle, Plane, Clock,
  MessageSquare, AlertTriangle, CalendarDays, Banknote,
} from "lucide-react";
import LeaveRequestsTab from "@/components/leave/LeaveRequestsTab";
import LeaveCalendar from "@/components/hr/LeaveCalendar";
import PayrollTab from "@/components/hr/PayrollTab";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useAttendanceForDate,
  useUpsertAttendance,
  todayISO,
  type AttendanceStatus,
  type AttendanceRecord,
} from "@/hooks/useAttendance";
import { useEmployeeDirectory, type DirectoryEmployee } from "@/hooks/useEmployeeDirectory";

const STATUS_CONFIG: Record<
  AttendanceStatus | "not_marked",
  { label: string; chip: string; icon: typeof CheckCircle2 }
> = {
  present:    { label: "Present",    chip: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",   icon: CheckCircle2 },
  on_leave:   { label: "On leave",   chip: "bg-amber-500/15 text-amber-700 border-amber-500/30",         icon: Plane },
  absent:     { label: "Absent",     chip: "bg-rose-500/15 text-rose-700 border-rose-500/30",            icon: XCircle },
  half_day:   { label: "Half day",   chip: "bg-blue-500/15 text-blue-700 border-blue-500/30",            icon: Clock },
  not_marked: { label: "Not marked", chip: "bg-muted text-muted-foreground border-border",               icon: Clock },
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function HRDashboard() {
  const [dateISO, setDateISO] = useState(todayISO());
  const { data: directory = [], isLoading: dirLoading } = useEmployeeDirectory();
  const { data: attendanceRows = [], isLoading: attLoading } = useAttendanceForDate(dateISO);
  const upsertAttendance = useUpsertAttendance();

  // Map of profile_id → record for quick lookup
  const recordByProfile = useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    attendanceRows.forEach((r) => m.set(r.profile_id, r));
    return m;
  }, [attendanceRows]);

  // Headcount stats (today)
  const stats = useMemo(() => {
    let present = 0, leave = 0, absent = 0, notMarked = 0, needsReview = 0;
    directory.forEach((emp) => {
      const r = recordByProfile.get(emp.id);
      if (!r) notMarked += 1;
      else if (r.status === "present" || r.status === "half_day") present += 1;
      else if (r.status === "on_leave") leave += 1;
      else if (r.status === "absent") absent += 1;
      if (r?.needs_review) needsReview += 1;
    });
    return { total: directory.length, present, leave, absent, notMarked, needsReview };
  }, [directory, recordByProfile]);

  const handleMark = (employee: DirectoryEmployee, status: AttendanceStatus) => {
    upsertAttendance.mutate(
      { profileId: employee.id, dateISO, status },
      {
        onSuccess: () => toast.success(`${employee.full_name} marked ${STATUS_CONFIG[status].label.toLowerCase()}`),
        onError: (e: any) => toast.error(e?.message ?? "Couldn't update"),
      }
    );
  };

  const isToday = dateISO === todayISO();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" /> HR
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Nasheedio · {stats.total} people on the roster
            </p>
          </div>
          <Input
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
            className="w-44"
            max={todayISO()}
          />
        </div>

        {/* Daily KPI strip */}
        <Card className="border-border/50">
          <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-border/30">
            <Stat label="Headcount"    value={stats.total}     tone="text-foreground" />
            <Stat label="Present"      value={stats.present}   tone="text-emerald-600" />
            <Stat label="On leave"     value={stats.leave}     tone="text-amber-600" />
            <Stat label="Absent"       value={stats.absent}    tone="text-rose-600" />
            <Stat label="Not marked"   value={stats.notMarked} tone="text-muted-foreground" />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="today" className="space-y-4">
          <TabsList>
            <TabsTrigger value="today">
              <CalendarCheck className="h-3.5 w-3.5" /> {isToday ? "Today" : "Day view"}
            </TabsTrigger>
            <TabsTrigger value="directory">
              <Users className="h-3.5 w-3.5" /> Directory
            </TabsTrigger>
            <TabsTrigger value="leaves">
              <Plane className="h-3.5 w-3.5" /> Leaves
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="payroll">
              <Banknote className="h-3.5 w-3.5" /> Payroll
            </TabsTrigger>
            <TabsTrigger value="updates">
              <MessageSquare className="h-3.5 w-3.5" /> Work updates
            </TabsTrigger>
          </TabsList>

          {/* ──────── Today / Day view ──────── */}
          <TabsContent value="today" className="space-y-3">
            {(attLoading || dirLoading) ? (
              <Skeleton className="h-40 w-full" />
            ) : directory.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">No employees in directory yet.</p>
            ) : (
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Person</th>
                      <th className="text-left px-2 py-2 font-medium">Status</th>
                      <th className="text-left px-2 py-2 font-medium">First in</th>
                      <th className="text-left px-2 py-2 font-medium">Last out</th>
                      <th className="text-left px-2 py-2 font-medium">Total</th>
                      <th className="text-right px-4 py-2 font-medium">Mark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directory.map((emp) => {
                      const rec = recordByProfile.get(emp.id);
                      const status = (rec?.status ?? "not_marked") as AttendanceStatus | "not_marked";
                      const cfg = STATUS_CONFIG[status];
                      const Icon = cfg.icon;
                      return (
                        <tr key={emp.id} className="border-t border-border/30 hover:bg-muted/20">
                          <td className="px-4 py-2">
                            <Link to={`/profile/${emp.id}`} className="flex items-center gap-2 hover:underline">
                              <Avatar className="h-7 w-7">
                                {emp.avatar_url && <AvatarImage src={emp.avatar_url} />}
                                <AvatarFallback className="text-[10px]">{initials(emp.full_name)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{emp.full_name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{emp.department ?? "—"}</p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-2 py-2">
                            <Badge variant="outline" className={cn("text-[10px] gap-1", cfg.chip)}>
                              <Icon className="h-3 w-3" />
                              {cfg.label}
                            </Badge>
                            {rec?.needs_review && (
                              <Badge variant="outline" className="ml-1 text-[10px] gap-1 bg-yellow-500/15 text-yellow-700 border-yellow-500/30">
                                <AlertTriangle className="h-3 w-3" /> review
                              </Badge>
                            )}
                          </td>
                          <td className="px-2 py-2 tabular-nums text-xs">{formatTime(rec?.first_in_at ?? null)}</td>
                          <td className="px-2 py-2 tabular-nums text-xs">{formatTime(rec?.last_out_at ?? null)}</td>
                          <td className="px-2 py-2 tabular-nums text-xs">{formatDuration(rec?.total_minutes ?? null)}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <MarkButton current={status} target="present"  onClick={() => handleMark(emp, "present")} />
                              <MarkButton current={status} target="on_leave" onClick={() => handleMark(emp, "on_leave")} />
                              <MarkButton current={status} target="absent"   onClick={() => handleMark(emp, "absent")} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ──────── Directory ──────── */}
          <TabsContent value="directory">
            <DirectoryTab employees={directory} loading={dirLoading} />
          </TabsContent>

          {/* ──────── Leaves ──────── */}
          <TabsContent value="leaves">
            <LeaveRequestsTab />
          </TabsContent>

          {/* ──────── Calendar ──────── */}
          <TabsContent value="calendar">
            <LeaveCalendar />
          </TabsContent>

          {/* ──────── Payroll ──────── */}
          <TabsContent value="payroll">
            <PayrollTab />
          </TabsContent>

          {/* ──────── Work updates ──────── */}
          <TabsContent value="updates">
            <Card className="border-dashed border-border/40 bg-muted/10">
              <CardContent className="p-10 text-center space-y-2">
                <MessageSquare className="mx-auto h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm font-medium">Work updates inbox</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  This will pull each person's daily Slack updates from your standup channel,
                  group them by person and date, and let HR see who's been quiet. Lights up
                  once the Slack bot token is wired in /department/tech → Connector Setup.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ──────────── small components ──────────── */

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="text-center sm:text-left sm:px-3 first:pl-0 last:pr-0">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold tabular-nums mt-1", tone)}>{value}</p>
    </div>
  );
}

function MarkButton({
  current, target, onClick,
}: {
  current: AttendanceStatus | "not_marked";
  target: AttendanceStatus;
  onClick: () => void;
}) {
  const cfg = STATUS_CONFIG[target];
  const Icon = cfg.icon;
  const active = current === target;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Mark ${cfg.label.toLowerCase()}`}
      className={cn(
        "rounded-md p-1 transition border",
        active
          ? cfg.chip + " ring-1 ring-current/20"
          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function DirectoryTab({ employees, loading }: { employees: DirectoryEmployee[]; loading: boolean }) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string>("all");

  const departments = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => e.department && s.add(e.department));
    return Array.from(s).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (department !== "all" && e.department !== department) return false;
      if (!q) return true;
      return (
        e.full_name.toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q) ||
        (e.role ?? "").toLowerCase().includes(q)
      );
    });
  }, [employees, search, department]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {employees.length}
        </span>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : filtered.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">No matches.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.map((e) => (
            <Link
              key={e.id}
              to={`/profile/${e.id}`}
              className="rounded-lg border border-border/40 bg-card p-3 hover:border-border hover:bg-muted/20 transition flex items-center gap-3"
            >
              <Avatar className="h-9 w-9">
                {e.avatar_url && <AvatarImage src={e.avatar_url} />}
                <AvatarFallback className="text-xs">{initials(e.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{e.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {e.role?.replace(/_/g, " ") ?? "—"}{e.department && ` · ${e.department}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
