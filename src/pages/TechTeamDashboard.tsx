import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import SparkLine from "@/components/SparkLine";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTechMembers, useTechTasks, type TechMember, type TechTask } from "@/hooks/useTechTeam";
import { AssignTaskModal } from "@/components/tech/AssignTaskModal";
import {
  GitPullRequest,
  GitMerge,
  AlertTriangle,
  Clock,
  Users,
  CircleDot,
  Sparkles,
  Loader2,
  XCircle,
  Plus,
} from "lucide-react";

/* ───────── Mock data ───────── */

type PR = {
  id: string;
  title: string;
  author: { name: string; avatar?: string };
  repo: string;
  state: "open" | "merged";
  createdDaysAgo: number;
  mergedDaysAgo?: number;
  labels: string[];
  ciFailed?: boolean;
};

const PRS: PR[] = [
  { id: "1", title: "feat(auth): add SSO provider", author: { name: "Aarav Mehta" }, repo: "core-api", state: "open", createdDaysAgo: 12, labels: ["feature", "auth"] },
  { id: "2", title: "fix: race condition in queue worker", author: { name: "Priya Kumar" }, repo: "workers", state: "open", createdDaysAgo: 8, labels: ["bug", "p1"] },
  { id: "3", title: "refactor: extract billing module", author: { name: "Rahul Singh" }, repo: "core-api", state: "open", createdDaysAgo: 3, labels: ["refactor"] },
  { id: "4", title: "chore: bump deps", author: { name: "Sneha Iyer" }, repo: "web", state: "open", createdDaysAgo: 9, labels: ["chore"], ciFailed: true },
  { id: "5", title: "feat: dark mode polish", author: { name: "Karan Shah" }, repo: "web", state: "open", createdDaysAgo: 14, labels: ["ui"] },
  { id: "6", title: "perf: index heavy table", author: { name: "Aarav Mehta" }, repo: "core-api", state: "merged", createdDaysAgo: 9, mergedDaysAgo: 1, labels: ["perf"] },
  { id: "7", title: "feat: webhook retries", author: { name: "Priya Kumar" }, repo: "core-api", state: "merged", createdDaysAgo: 6, mergedDaysAgo: 2, labels: ["feature"] },
  { id: "8", title: "fix: crash on null payload", author: { name: "Rahul Singh" }, repo: "workers", state: "merged", createdDaysAgo: 4, mergedDaysAgo: 4, labels: ["bug"] },
  { id: "9", title: "docs: API reference", author: { name: "Sneha Iyer" }, repo: "docs", state: "merged", createdDaysAgo: 2, mergedDaysAgo: 0, labels: ["docs"] },
];

// Members + tasks now come from useTechMembers / useTechTasks (real DB)

const SPARKS = {
  openPRs: [12, 14, 11, 13, 10, 12, 12],
  prAge: [4, 5, 6, 5, 6, 7, 6],
  awaiting: [3, 4, 4, 5, 5, 6, 5],
  merged: [2, 3, 1, 4, 3, 5, 4],
};

/* ───────── Helpers ───────── */

const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const GlassCard = ({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
  <Card
    className={cn(
      "border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.25)]",
      "transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_10px_40px_rgba(0,0,0,0.35)]",
      className,
    )}
    {...rest}
  >
    {children}
  </Card>
);

/* ───────── KPI tile ───────── */

const Kpi = ({
  icon: Icon,
  label,
  value,
  spark,
  tone = "primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  spark: number[];
  tone?: "primary" | "amber" | "emerald" | "rose";
}) => {
  const toneClass = {
    primary: "text-primary",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
    rose: "text-rose-400",
  }[tone];
  const sparkColor = {
    primary: "hsl(var(--primary))",
    amber: "#fbbf24",
    emerald: "#34d399",
    rose: "#fb7185",
  }[tone];
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", toneClass)} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight">{value}</span>
        <SparkLine data={spark} color={sparkColor} width={70} height={26} />
      </div>
    </GlassCard>
  );
};

/* ───────── Tab 1: PR Pulse ───────── */

const PrPulse = () => {
  const open = PRS.filter((p) => p.state === "open");
  const merged = PRS.filter((p) => p.state === "merged" && (p.mergedDaysAgo ?? 99) <= 7);
  const awaiting = open.filter((p) => p.createdDaysAgo > 7);
  const avgAge = Math.round(open.reduce((s, p) => s + p.createdDaysAgo, 0) / Math.max(open.length, 1));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={GitPullRequest} label="Open PRs" value={open.length} spark={SPARKS.openPRs} tone="primary" />
        <Kpi icon={Clock} label="Avg PR age (days)" value={avgAge} spark={SPARKS.prAge} tone="amber" />
        <Kpi icon={CircleDot} label="Awaiting review" value={awaiting.length} spark={SPARKS.awaiting} tone="rose" />
        <Kpi icon={GitMerge} label="Merged this week" value={merged.length} spark={SPARKS.merged} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Awaiting review</h3>
            <Badge variant="outline" className="border-rose-400/30 text-rose-300">
              {awaiting.length} stale
            </Badge>
          </div>
          <div className="space-y-2">
            {awaiting.map((pr) => (
              <div
                key={pr.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/15 hover:bg-white/[0.04]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{pr.title}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="text-[8px]">{initials(pr.author.name)}</AvatarFallback>
                    </Avatar>
                    <span>{pr.author.name}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="font-mono">{pr.repo}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {pr.labels.map((l) => (
                      <span
                        key={l}
                        className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  className={cn(
                    "flex flex-col items-end font-mono text-xs tabular-nums",
                    pr.createdDaysAgo > 7 ? "text-rose-400" : "text-muted-foreground",
                  )}
                >
                  <span className="text-lg font-semibold leading-none">{pr.createdDaysAgo}</span>
                  <span className="text-[10px] uppercase tracking-wider">days</span>
                </div>
              </div>
            ))}
            {awaiting.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">All caught up.</p>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recently merged</h3>
            <Badge variant="outline" className="border-emerald-400/30 text-emerald-300">
              last 7d
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {merged.map((pr) => (
              <div
                key={pr.id}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 transition hover:border-emerald-400/20"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px]">{initials(pr.author.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{pr.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{pr.author.name}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="font-mono">{pr.repo}</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] tabular-nums text-emerald-300">
                  {pr.mergedDaysAgo === 0 ? "today" : `${pr.mergedDaysAgo}d`}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

/* ───────── Tab 2: Team load ───────── */

const TeamLoad = ({
  members,
  tasks,
  loading,
  onSelect,
}: {
  members: TechMember[];
  tasks: TechTask[];
  loading: boolean;
  onSelect: (m: TechMember) => void;
}) => {
  const rows = useMemo(
    () =>
      members.map((m) => {
        const mine = tasks.filter((t) => t.assignee_profile === m.id);
        const openPRs = PRS.filter((p) => p.author.name === m.full_name && p.state === "open").length;
        const openIssues = mine.filter((t) => t.status === "blocked").length;
        return { member: m, openPRs, openIssues, tasks: mine.length };
      }),
    [members, tasks],
  );
  const max = Math.max(1, ...rows.flatMap((r) => [r.openPRs, r.openIssues, r.tasks]));

  const Bar = ({ value, color }: { value: number; color: string }) => (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="w-6 text-right font-mono text-xs tabular-nums text-muted-foreground">{value}</span>
    </div>
  );

  if (loading) return <Skeleton className="h-32 w-full" />;
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">No tech team members found (profiles.department = 'tech').</p>;

  return (
    <div className="space-y-3">
      {rows.map(({ member: m, openPRs, openIssues, tasks: t }) => (
        <button key={m.id} onClick={() => onSelect(m)} className="block w-full text-left">
          <GlassCard className="p-4">
            <div className="grid grid-cols-12 items-center gap-4">
              <div className="col-span-12 flex items-center gap-3 md:col-span-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{initials(m.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{m.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                </div>
              </div>
              <div className="col-span-12 grid gap-2 md:col-span-9 md:grid-cols-3">
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-emerald-300">Open PRs</p>
                  <Bar value={openPRs} color="bg-emerald-400/80" />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-amber-300">Blocked</p>
                  <Bar value={openIssues} color="bg-amber-400/80" />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-sky-300">Tasks</p>
                  <Bar value={t} color="bg-sky-400/80" />
                </div>
              </div>
            </div>
          </GlassCard>
        </button>
      ))}
    </div>
  );
};

/* ───────── Tab 3: Blockers ───────── */

const Blockers = ({
  tasks,
  members,
  loading,
}: {
  tasks: TechTask[];
  members: TechMember[];
  loading: boolean;
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [aiOut, setAiOut] = useState<Record<string, string>>({});
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const blocked = tasks.filter((t) => t.status === "blocked");

  const askKai = async (t: TechTask) => {
    setLoadingId(t.id);
    try {
      const r = await supabase.functions.invoke("kai-ask", {
        body: {
          question: `Blocked task "${t.title}" in project ${t.project_title ?? t.project_id}. Reason: ${
            t.blocked_reason ?? "not specified"
          }. How do we unblock this?`,
          role: "functional_head",
        },
      });
      if (r.error) throw r.error;
      setAiOut((p) => ({ ...p, [t.id]: r.data?.answer || "No suggestion right now." }));
    } catch {
      toast.error("KAI couldn't respond");
    } finally {
      setLoadingId(null);
    }
  };

  const grouped = blocked.reduce<Record<string, TechTask[]>>((acc, b) => {
    const key = b.project_title ?? "Unassigned project";
    (acc[key] ||= []).push(b);
    return acc;
  }, {});

  const idlePRs = PRS.filter((p) => p.state === "open" && p.createdDaysAgo > 5);
  const failedCi = PRS.filter((p) => p.ciFailed);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Blocked tasks</h3>
        {loading && <Skeleton className="h-24 w-full" />}
        {!loading && blocked.length === 0 && (
          <GlassCard className="p-6 text-sm text-muted-foreground">No blocked tasks. Nice.</GlassCard>
        )}
        {Object.entries(grouped).map(([project, items]) => (
          <GlassCard key={project} className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold">{project}</h4>
              <Badge variant="outline" className="border-rose-400/30 text-rose-300 font-mono tabular-nums">
                {items.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {items.map((b) => {
                const assigneeName = b.assignee_profile
                  ? memberById.get(b.assignee_profile)?.full_name ?? "Unassigned"
                  : "Unassigned";
                return (
                  <div key={b.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{b.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{assigneeName}</p>
                        {b.blocked_reason && (
                          <p className="mt-1 text-xs italic text-muted-foreground/80">"{b.blocked_reason}"</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => askKai(b)}
                        disabled={loadingId === b.id}
                        className="shrink-0 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        {loadingId === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        Ask KAI
                      </Button>
                    </div>
                    {aiOut[b.id] && (
                      <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs leading-relaxed">
                        <span className="mr-2 font-semibold text-primary">KAI</span>
                        {aiOut[b.id]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="space-y-4">
        <GlassCard className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-rose-300">
            <Clock className="h-3.5 w-3.5" /> Idle PRs (&gt;5d)
          </h3>
          <div className="space-y-2">
            {idlePRs.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-rose-400/10 bg-rose-400/5 p-2 text-xs">
                <span className="truncate">{p.title}</span>
                <span className="ml-2 font-mono tabular-nums text-rose-300">{p.createdDaysAgo}d</span>
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
            <XCircle className="h-3.5 w-3.5" /> Failed CI
          </h3>
          <div className="space-y-2">
            {failedCi.length === 0 && <p className="text-xs text-muted-foreground">All checks green.</p>}
            {failedCi.map((p) => (
              <div key={p.id} className="rounded-md border border-amber-400/10 bg-amber-400/5 p-2 text-xs">
                <p className="truncate">{p.title}</p>
                <p className="text-muted-foreground">{p.author.name} · {p.repo}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

const TechTeamDashboard = () => {
  const [selected, setSelected] = useState<TechMember | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const { data: members = [], isLoading: loadingMembers } = useTechMembers();
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const { data: tasks = [], isLoading: loadingTasks } = useTechTasks(memberIds);

  const selectedTasks = selected ? tasks.filter((t) => t.assignee_profile === selected.id) : [];
  const selectedPRs = selected ? PRS.filter((p) => p.author.name === selected.full_name) : [];

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const blockedCount = tasks.filter((t) => t.status === "blocked").length;
  const avgCompletion = activeTasks.length
    ? Math.round(
        activeTasks.reduce((s, t) => s + (t.completion_percentage ?? 0), 0) / activeTasks.length,
      )
    : 0;

  const Stat = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex-1 px-6 py-4 text-center">
      <div className="font-mono text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.08),_transparent_50%)]" />
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Users className="h-5 w-5 text-primary" />
              Tech Team
            </h1>
            <p className="text-sm text-muted-foreground">PR throughput, team load, and blockers in one view.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-white/10 bg-white/5 font-mono text-[10px] uppercase tracking-widest">
              Tech Lead view
            </Badge>
            <Button onClick={() => setAssignOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Assign Task
            </Button>
          </div>
        </div>

        <GlassCard className="mb-6 flex divide-x divide-white/10">
          <Stat label="Members" value={loadingMembers ? "—" : members.length} />
          <Stat label="Active tasks" value={loadingTasks ? "—" : activeTasks.length} />
          <Stat label="Blocked" value={loadingTasks ? "—" : blockedCount} />
          <Stat label="Avg completion" value={loadingTasks ? "—" : `${avgCompletion}%`} />
        </GlassCard>


        <Tabs defaultValue="pulse" className="space-y-6">
          <TabsList className="bg-white/5 backdrop-blur-xl border border-white/10">
            <TabsTrigger value="pulse" className="data-[state=active]:bg-white/10">
              <GitPullRequest className="h-3.5 w-3.5" /> PR Pulse
            </TabsTrigger>
            <TabsTrigger value="load" className="data-[state=active]:bg-white/10">
              <Users className="h-3.5 w-3.5" /> Team load
            </TabsTrigger>
            <TabsTrigger value="blockers" className="data-[state=active]:bg-white/10">
              <AlertTriangle className="h-3.5 w-3.5" /> Blockers & risks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pulse"><PrPulse /></TabsContent>
          <TabsContent value="load">
            <TeamLoad members={members} tasks={tasks} loading={loadingMembers || loadingTasks} onSelect={setSelected} />
          </TabsContent>
          <TabsContent value="blockers">
            <Blockers tasks={tasks} members={members} loading={loadingMembers || loadingTasks} />
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg bg-background/95 backdrop-blur-xl border-l border-white/10">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{initials(selected.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-base font-semibold">{selected.full_name}</p>
                    <p className="text-xs font-normal text-muted-foreground">{selected.role}</p>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pull requests</h4>
                  <div className="space-y-2">
                    {selectedPRs.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] p-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="truncate">{p.title}</p>
                          <p className="text-xs text-muted-foreground font-mono">{p.repo}</p>
                        </div>
                        <Badge variant="outline" className={cn("ml-2 font-mono text-[10px]", p.state === "merged" ? "border-emerald-400/30 text-emerald-300" : "border-amber-400/30 text-amber-300")}>
                          {p.state}
                        </Badge>
                      </div>
                    ))}
                    {selectedPRs.length === 0 && <p className="text-xs text-muted-foreground">No PRs.</p>}
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tasks ({selectedTasks.length})</h4>
                  <div className="space-y-2">
                    {selectedTasks.map((t) => (
                      <div key={t.id} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] p-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground">{t.project_title}</p>
                        </div>
                        <Badge variant="outline" className="ml-2 font-mono text-[10px]">{t.status}</Badge>
                      </div>
                    ))}
                    {selectedTasks.length === 0 && <p className="text-xs text-muted-foreground">No tasks.</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AssignTaskModal open={assignOpen} onOpenChange={setAssignOpen} members={members} />
    </div>
  );
};

export default TechTeamDashboard;
