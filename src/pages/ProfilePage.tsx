import { useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Crown, MessageSquare, ListTodo, Bug, GitPullRequest } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  department: string | null;
}

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function last7DaysISO(): string {
  return new Date(Date.now() - 7 * 864e5).toISOString();
}

function useProfileData(profileId: string | undefined) {
  return useQuery({
    queryKey: ["profile-page", profileId],
    enabled: !!profileId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const pid = profileId!;
      const monthStart = startOfMonthISO();
      const weekStart = last7DaysISO();

      const [
        profileRes, memberRes,
        tasksDoneMonthRes, bugsSolvedMonthRes,
        tasksDoneWeekRes, bugsSolvedWeekRes,
        openTasksRes, bugsRaisedRes, bugsAssignedRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", pid).single(),
        supabase.from("project_members").select("project_id,role").eq("profile_id", pid),
        supabase.from("project_tasks").select("id", { count: "exact", head: true })
          .eq("assignee_profile", pid).eq("status", "done").gte("updated_at", monthStart),
        supabase.from("bugs").select("id", { count: "exact", head: true })
          .eq("assignee_profile", pid).eq("status", "solved").gte("solved_at", monthStart),
        supabase.from("project_tasks").select("id", { count: "exact", head: true })
          .eq("assignee_profile", pid).eq("status", "done").gte("updated_at", weekStart),
        supabase.from("bugs").select("id", { count: "exact", head: true })
          .eq("assignee_profile", pid).eq("status", "solved").gte("solved_at", weekStart),
        supabase.from("project_tasks").select("id,title,status,project_id,deadline")
          .eq("assignee_profile", pid).neq("status", "done"),
        supabase.from("bugs").select("id", { count: "exact", head: true }).eq("reporter_profile", pid),
        supabase.from("bugs").select("id", { count: "exact", head: true })
          .eq("assignee_profile", pid).neq("status", "solved"),
      ]);

      const profile = profileRes.data as ProfileRow | null;
      const memberRows = (memberRes.data ?? []) as Array<{ project_id: string; role: string }>;
      const projectIds = memberRows.map((m) => m.project_id);

      let projects: Array<{ id: string; title: string; status: string; role: string }> = [];
      if (projectIds.length) {
        const { data: pj } = await supabase
          .from("projects").select("id,title,status").in("id", projectIds);
        projects = (pj ?? []).map((p: any) => ({
          ...p,
          role: memberRows.find((m) => m.project_id === p.id)?.role ?? "member",
        }));
      }

      // Rough PR-merged via connector_data_github author_login match.
      // Two windows in parallel.
      let prsMergedMonth = 0;
      let prsMergedWeek = 0;
      if (profile?.full_name) {
        const handle = `%${profile.full_name.split(" ")[0]}%`;
        const [monthCount, weekCount] = await Promise.all([
          supabase
            .from("connector_data_github")
            .select("id", { count: "exact", head: true })
            .eq("record_type", "pull_request")
            .eq("state", "merged")
            .ilike("author_login", handle)
            .gte("merged_at_source", monthStart),
          supabase
            .from("connector_data_github")
            .select("id", { count: "exact", head: true })
            .eq("record_type", "pull_request")
            .eq("state", "merged")
            .ilike("author_login", handle)
            .gte("merged_at_source", weekStart),
        ]);
        prsMergedMonth = monthCount.count ?? 0;
        prsMergedWeek = weekCount.count ?? 0;
      }

      // Build project title map for open tasks
      const openTasks = (openTasksRes.data ?? []) as Array<{
        id: string; title: string; status: string; project_id: string; deadline: string | null;
      }>;
      const taskProjectIds = Array.from(new Set(openTasks.map((t) => t.project_id)));
      let taskProjectMap = new Map<string, string>();
      if (taskProjectIds.length) {
        const { data } = await supabase.from("projects").select("id,title").in("id", taskProjectIds);
        (data ?? []).forEach((p: any) => taskProjectMap.set(p.id, p.title));
      }

      return {
        profile,
        projects,
        tasksDoneThisMonth: tasksDoneMonthRes.count ?? 0,
        bugsSolvedThisMonth: bugsSolvedMonthRes.count ?? 0,
        prsMergedThisMonth: prsMergedMonth,
        tasksDoneThisWeek: tasksDoneWeekRes.count ?? 0,
        bugsSolvedThisWeek: bugsSolvedWeekRes.count ?? 0,
        prsMergedThisWeek: prsMergedWeek,
        openTasks,
        taskProjectMap,
        bugsRaised: bugsRaisedRes.count ?? 0,
        bugsAssigned: bugsAssignedRes.count ?? 0,
      };
    },
  });
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile: viewerProfile } = useAuth();
  const { data, isLoading } = useProfileData(id);

  const isMe = user?.id === id;
  // Only founder + tech functional_head can navigate to /team/tech.
  // For everyone else, we'll render the bug stats as plain (non-clickable) cards.
  const viewerCanOpenTechBugs =
    viewerProfile?.role === "founder" ||
    (viewerProfile?.role === "functional_head" && viewerProfile?.department === "tech");

  const tasksByProject = useMemo(() => {
    const m = new Map<string, typeof data extends { openTasks: infer T } ? T : never>();
    if (!data) return m as any;
    const map = new Map<string, typeof data.openTasks>();
    for (const t of data.openTasks) {
      if (!map.has(t.project_id)) map.set(t.project_id, []);
      map.get(t.project_id)!.push(t);
    }
    return map;
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-3xl px-5 py-10 space-y-4">
          <div className="h-24 rounded-xl bg-muted/30 animate-pulse" />
          <div className="h-40 rounded-xl bg-muted/30 animate-pulse" />
        </main>
      </div>
    );
  }

  const {
    profile, projects,
    tasksDoneThisMonth, bugsSolvedThisMonth, prsMergedThisMonth,
    tasksDoneThisWeek, bugsSolvedThisWeek, prsMergedThisWeek,
    bugsRaised, bugsAssigned, taskProjectMap,
  } = data;

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-3xl px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">Profile not found.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate(-1)}>Back</Button>
        </main>
      </div>
    );
  }

  const initials = (profile.full_name ?? profile.email ?? "?")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        {/* Header */}
        <div className="flex items-start gap-5 mb-8">
          <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            ) : initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{profile.full_name || "Unnamed"}</h1>
              {isMe && <span className="text-xs text-primary">(you)</span>}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {profile.role && (
                <Badge variant="outline" className="text-[10px] capitalize">{profile.role.replace(/_/g, " ")}</Badge>
              )}
              {profile.department && (
                <Badge variant="outline" className="text-[10px] capitalize bg-muted/40">
                  {profile.department.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
            {profile.email && (
              <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-2">
                <Mail className="h-3 w-3" /> {profile.email}
              </a>
            )}
          </div>
          {!isMe && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => {/* placeholder */}}>
              <MessageSquare className="h-3.5 w-3.5" /> Message
            </Button>
          )}
        </div>

        {/* What I shipped — month headline + week underline per stat */}
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">What I shipped</h2>
        <div className="grid grid-cols-3 gap-3 mb-8">
          <ShipStat icon={ListTodo}       label="Tasks done"  monthValue={tasksDoneThisMonth}  weekValue={tasksDoneThisWeek}  color="text-blue-600" />
          <ShipStat icon={Bug}            label="Bugs solved" monthValue={bugsSolvedThisMonth} weekValue={bugsSolvedThisWeek} color="text-emerald-600" />
          <ShipStat icon={GitPullRequest} label="PRs merged"  monthValue={prsMergedThisMonth}  weekValue={prsMergedThisWeek}  color="text-purple-600" />
        </div>

        {/* Currently working on */}
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Currently working on</h2>
        <div className="space-y-2 mb-8">
          {projects.length === 0 ? (
            <Card className="border-dashed border-border/40"><CardContent className="p-4 text-center text-xs text-muted-foreground italic">No projects.</CardContent></Card>
          ) : projects.map((p) => (
            <Link key={p.id} to={`/project/${p.id}`} className="block">
              <Card className="border-border/40 hover:border-border transition-colors">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    {p.role === "lead" && (
                      <Badge variant="outline" className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-700">
                        <Crown className="h-2.5 w-2.5 mr-0.5 inline" /> Lead
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{p.status}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Active tasks grouped */}
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Active tasks</h2>
        <div className="space-y-3 mb-8">
          {tasksByProject.size === 0 ? (
            <Card className="border-dashed border-border/40"><CardContent className="p-4 text-center text-xs text-muted-foreground italic">No active tasks.</CardContent></Card>
          ) : Array.from(tasksByProject.entries()).map(([pid, list]: any) => (
            <Card key={pid} className="border-border/40">
              <CardContent className="p-3">
                <Link to={`/project/${pid}`} className="text-xs font-semibold hover:underline">
                  {taskProjectMap.get(pid) ?? "Project"}
                </Link>
                <ul className="mt-2 space-y-1">
                  {list.map((t: any) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 text-xs">
                      <Link to={`/project/${pid}#task-${t.id}`} className="truncate hover:underline">{t.title}</Link>
                      <span className={cn(
                        "text-[10px] capitalize",
                        t.status === "blocked" ? "text-amber-600" : "text-muted-foreground"
                      )}>{t.status.replace(/_/g, " ")}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bugs — clickable only when the viewer can actually access /team/tech */}
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Bugs</h2>
        <div className="grid grid-cols-2 gap-3">
          <BugStatCard
            label="Raised"
            value={bugsRaised}
            link={viewerCanOpenTechBugs ? "/team/tech?tab=bugs" : null}
          />
          <BugStatCard
            label="Assigned · open"
            value={bugsAssigned}
            link={viewerCanOpenTechBugs ? "/team/tech?tab=bugs" : null}
          />
        </div>
      </main>
    </div>
  );
}

function BugStatCard({ label, value, link }: { label: string; value: number; link: string | null }) {
  const card = (
    <Card className={cn("border-border/40", link && "hover:border-border transition-colors")}>
      <CardContent className="p-4">
        <p className="text-[10px] uppercase text-muted-foreground tracking-widest">{label}</p>
        <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
      </CardContent>
    </Card>
  );
  return link ? <Link to={link}>{card}</Link> : card;
}

function ShipStat({
  icon: Icon,
  label,
  monthValue,
  weekValue,
  color,
}: {
  icon: any;
  label: string;
  monthValue: number;
  weekValue: number;
  color: string;
}) {
  return (
    <Card className="border-border/40">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", color)} />
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        </div>
        <p className="text-2xl font-bold tabular-nums mt-1">{monthValue}</p>
        <p className="text-[10px] text-muted-foreground">this month</p>
        <div className="mt-2 pt-2 border-t border-border/30 flex items-baseline gap-1.5">
          <span className="text-sm font-semibold tabular-nums">{weekValue}</span>
          <span className="text-[10px] text-muted-foreground">in last 7 days</span>
        </div>
      </CardContent>
    </Card>
  );
}
