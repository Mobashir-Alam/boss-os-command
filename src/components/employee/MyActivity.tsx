import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GitCommit, GitPullRequest, CalendarCheck2, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePeople } from "@/hooks/usePeople";
import { useStartups } from "@/hooks/useStartups";
import { usePersonLink, usePersonActivity } from "@/hooks/useConnectorLinks";

const WINDOW_DAYS = 30;

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// "My Activity" — the logged-in employee's last 30 days:
//  · GitHub: commit heatmap calendar + summary stats (via employee_connector_links,
//    falling back to profiles.github_username)
//  · Slack: attendance calendar (green = checked in, amber = active w/o check-in,
//    gray = absent)
//  · Neither linked → prompt to ask an admin.
export default function MyActivity() {
  const { profile } = useAuth();
  const { people } = usePeople();
  const { dbStartups } = useStartups();
  const startupId = dbStartups.find((s) => s.slug === "nasheedio")?.id ?? dbStartups[0]?.id;

  // Resolve the logged-in profile to a People OS person by name (there is no
  // direct profile↔person foreign key yet).
  const person = useMemo(() => {
    const name = profile?.full_name?.trim().toLowerCase();
    if (!name) return undefined;
    return people.find((p) => p.full_name.trim().toLowerCase() === name);
  }, [people, profile?.full_name]);

  const { data: link } = usePersonLink(person?.id);
  const githubLogin = link?.github_login ?? (profile as any)?.github_username ?? null;
  const slackUserId = link?.slack_user_id ?? null;

  const { data: activity, isLoading } = usePersonActivity(
    startupId,
    githubLogin,
    slackUserId,
    WINDOW_DAYS
  );

  const days = useMemo(() => {
    const out: Date[] = [];
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      out.push(new Date(Date.now() - i * 864e5));
    }
    return out;
  }, []);

  const ghByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of activity?.github.days ?? []) m.set(d.activity_date, d.commits);
    return m;
  }, [activity]);

  const attByDay = useMemo(() => {
    const m = new Map<string, { checked_in: boolean; was_active: boolean }>();
    for (const d of activity?.slack.days ?? [])
      m.set(d.work_date, { checked_in: d.checked_in, was_active: d.was_active });
    return m;
  }, [activity]);

  const maxCommits = Math.max(1, ...Array.from(ghByDay.values()));

  const heatClass = (commits: number) => {
    if (commits === 0) return "bg-muted";
    const ratio = commits / maxCommits;
    if (ratio > 0.66) return "bg-emerald-600";
    if (ratio > 0.33) return "bg-emerald-500/70";
    return "bg-emerald-400/50";
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold tracking-tight">My Activity</h2>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Last {WINDOW_DAYS} days
        </span>
      </div>

      {!githubLogin && !slackUserId ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-6">
            <Link2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">No connected accounts</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ask your admin to link your Slack and GitHub accounts in People OS
                (🔗 Edit Links) to see your activity here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-xs text-muted-foreground">Loading activity…</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* GitHub commits */}
          {githubLogin && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <GitCommit className="h-3.5 w-3.5" /> GitHub — {githubLogin}
                  </span>
                </div>
                {/* Heatmap calendar */}
                <div className="flex flex-wrap gap-1">
                  {days.map((d) => {
                    const key = dateKey(d);
                    const commits = ghByDay.get(key) ?? 0;
                    return (
                      <div
                        key={key}
                        title={`${key} — ${commits} commit${commits === 1 ? "" : "s"}`}
                        className={cn("h-4 w-4 rounded-sm", heatClass(commits))}
                      />
                    );
                  })}
                </div>
                {/* Summary stats */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Commits" value={activity?.github.total_commits ?? 0} />
                  <Stat label="PRs opened" value={activity?.github.prs_opened ?? 0} />
                  <Stat label="PRs merged" value={activity?.github.prs_merged ?? 0} />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Code</p>
                    <p className="text-sm font-semibold tabular-nums">
                      <span className="text-emerald-600">+{(activity?.github.additions ?? 0).toLocaleString()}</span>{" "}
                      <span className="text-red-500">−{(activity?.github.deletions ?? 0).toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Slack attendance */}
          {slackUserId && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <CalendarCheck2 className="h-3.5 w-3.5" /> Attendance
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {activity?.slack.checked_in_days ?? 0} check-ins · {activity?.slack.active_days ?? 0} active days
                  </span>
                </div>
                {/* Calendar grid: green = checked in, amber = present w/o check-in, gray = absent */}
                <div className="flex flex-wrap gap-1">
                  {days.map((d) => {
                    const key = dateKey(d);
                    const att = attByDay.get(key);
                    const color = att?.checked_in
                      ? "bg-emerald-500"
                      : att?.was_active
                        ? "bg-amber-400"
                        : "bg-muted";
                    const label = att?.checked_in
                      ? "checked in"
                      : att?.was_active
                        ? "active, no check-in"
                        : "absent";
                    return (
                      <div
                        key={key}
                        title={`${key} — ${label}`}
                        className={cn("flex h-6 w-6 items-center justify-center rounded-sm text-[8px] font-medium", color, att ? "text-white" : "text-muted-foreground")}
                      >
                        {d.getDate()}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Checked in</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" /> Active, no check-in</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-muted" /> Absent</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}
