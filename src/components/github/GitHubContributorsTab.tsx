import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GitCommit, GitPullRequest, User, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SparkLine from "@/components/SparkLine";
import { useConnectorLinks } from "@/hooks/useConnectorLinks";

interface ContributorRow {
  login: string;
  commits30d: number;
  prsOpened: number;
  prsMerged: number;
  sparkline: number[]; // per-day commits, oldest → newest (30 days)
  lastActive: string | null;
}

const nAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

function useContributors(startupId: string) {
  return useQuery({
    queryKey: ["github-contributors", startupId],
    queryFn: async (): Promise<ContributorRow[]> => {
      const since = nAgo(30);
      const { data, error } = await supabase
        .from("connector_data_github_daily")
        .select("github_login, activity_date, commits, prs_opened, prs_merged")
        .eq("startup_id", startupId)
        .gte("activity_date", since);
      if (error) throw error;

      // 30 day slots for the sparkline
      const daySlots: string[] = [];
      for (let i = 29; i >= 0; i--) daySlots.push(nAgo(i));
      const slotIndex = new Map(daySlots.map((d, i) => [d, i]));

      const byLogin = new Map<string, ContributorRow>();
      for (const r of data ?? []) {
        let row = byLogin.get(r.github_login);
        if (!row) {
          row = {
            login: r.github_login,
            commits30d: 0,
            prsOpened: 0,
            prsMerged: 0,
            sparkline: new Array(30).fill(0),
            lastActive: null,
          };
          byLogin.set(r.github_login, row);
        }
        row.commits30d += r.commits;
        row.prsOpened += r.prs_opened;
        row.prsMerged += r.prs_merged;
        const idx = slotIndex.get(r.activity_date);
        if (idx !== undefined) row.sparkline[idx] += r.commits;
        if ((r.commits > 0 || r.prs_merged > 0) && (!row.lastActive || r.activity_date > row.lastActive)) {
          row.lastActive = r.activity_date;
        }
      }
      return Array.from(byLogin.values()).sort((a, b) => b.commits30d - a.commits30d);
    },
  });
}

// Contributors tab: every github_login with a 30-day commit sparkline, PR
// totals, and a "View profile" link when the login is linked to an employee
// via employee_connector_links.
export default function GitHubContributorsTab({ startupId }: { startupId: string }) {
  const { data: contributors, isLoading } = useContributors(startupId);
  const { data: links = [] } = useConnectorLinks(startupId);

  const personByLogin = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of links) {
      if (l.github_login && l.person_id) m.set(l.github_login.toLowerCase(), l.person_id);
    }
    return m;
  }, [links]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!contributors || contributors.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No contributor activity in the last 30 days — run a GitHub sync.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contributors.map((c) => {
        const linkedPersonId = personByLogin.get(c.login.toLowerCase());
        return (
          <Card key={c.login}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.login}</p>
                <p className="text-[11px] text-muted-foreground">
                  {c.lastActive ? `last active ${c.lastActive}` : "no recent activity"}
                </p>
              </div>
              <div className="hidden h-8 w-32 shrink-0 md:block">
                <SparkLine data={c.sparkline} color="hsl(var(--primary))" width={128} height={32} />
              </div>
              <div className="flex shrink-0 items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5" title="Commits, last 30 days">
                  <GitCommit className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="tabular-nums font-semibold">{c.commits30d}</span>
                </span>
                <span className="flex items-center gap-1.5" title="PRs opened / merged, last 30 days">
                  <GitPullRequest className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="tabular-nums font-semibold">
                    {c.prsOpened}/{c.prsMerged}
                  </span>
                </span>
              </div>
              {linkedPersonId ? (
                <Link
                  to="/people"
                  className="flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:underline underline-offset-2"
                  title="Open this person in People OS"
                >
                  View profile <ArrowRight className="h-3 w-3" />
                </Link>
              ) : (
                <span className="shrink-0 text-[10px] text-muted-foreground" title="Link this login to a person in People OS (🔗)">
                  not linked
                </span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
