import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Github, RefreshCw, Loader2, Users2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useStartups } from "@/hooks/useStartups";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGitHubOverview, useGitHubPeople, useGitHubRepos, useGitHubFocus,
  useTriggerGitHubSync,
} from "@/hooks/useGitHub";
import GitHubOverviewTab from "@/components/github/GitHubOverviewTab";
import GitHubPeopleTab from "@/components/github/GitHubPeopleTab";
import GitHubReposTab from "@/components/github/GitHubReposTab";
import GitHubFocusTab from "@/components/github/GitHubFocusTab";
import GitHubKaiTab from "@/components/github/GitHubKaiTab";
import GitHubIdentityDialog from "@/components/github/GitHubIdentityDialog";

export default function GitHubDashboard() {
  const { dbStartups } = useStartups();
  const nasheedio = dbStartups.find((s) => s.slug === "nasheedio");
  const startupId = nasheedio?.id;
  const qc = useQueryClient();

  const [baselineDays, setBaselineDays] = useState<7 | 28>(7);
  // 3650 ≈ "All time" (reads every accumulated daily row).
  const [windowDays, setWindowDays] = useState<number>(30);
  const [identityOpen, setIdentityOpen] = useState(false);

  const { data: overview, isLoading: overviewLoading } = useGitHubOverview(startupId, baselineDays, windowDays);
  const { data: people, isLoading: peopleLoading } = useGitHubPeople(startupId, windowDays);
  const { data: repos, isLoading: reposLoading } = useGitHubRepos(startupId, windowDays);
  const { data: focus, isLoading: focusLoading } = useGitHubFocus(startupId);

  const { mutateAsync: triggerSync, isPending: syncing } = useTriggerGitHubSync();

  async function handleSync() {
    if (!startupId) return;
    try {
      toast.info("Syncing GitHub…");
      const r = await triggerSync(startupId);
      console.log("[github-sync] result:", r);
      toast.success(`Synced ${r.repos_synced} repos · ${r.commits} commits · ${r.prs} PRs · ${r.daily_rows} daily rows`);
      if (r.rate_limited) toast.warning("Hit GitHub rate limit mid-sync — some repos may be partial. Try again later.");
      if (r.time_budget_hit) toast.warning("Sync ran long and stopped early — most-active repos are covered. Re-run to fill the rest.");
      if (r.errors?.length) toast.warning(`${r.errors.length} repo error(s): ${r.errors.slice(0, 2).join("; ")}`);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["github-overview"] }),
        qc.invalidateQueries({ queryKey: ["github-people"] }),
        qc.invalidateQueries({ queryKey: ["github-repos"] }),
        qc.invalidateQueries({ queryKey: ["github-focus"] }),
        qc.invalidateQueries({ queryKey: ["github-identity"] }),
      ]);
    } catch (err) {
      console.error("[github-sync] error:", err);
      toast.error(`Sync error: ${(err as Error).message}`);
    }
  }

  const unmappedCount = (people ?? []).filter((p) => !p.mapped && p.commits > 0).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#24292f] flex items-center justify-center">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Engineering — GitHub</h1>
              <p className="text-sm text-muted-foreground">Who's working on what, commits, and where focus is right now</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => setIdentityOpen(true)} className="gap-2">
              <Users2 className="w-4 h-4" /> Map people
              {unmappedCount > 0 && <Badge variant="outline" className="text-amber-700 border-amber-300 ml-1">{unmappedCount}</Badge>}
            </Button>
            <Button onClick={handleSync} disabled={syncing || !startupId} className="gap-2">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {syncing ? "Syncing…" : "Sync GitHub"}
            </Button>
          </div>
        </div>

        {unmappedCount > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-center gap-3 py-3 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{unmappedCount} active GitHub {unmappedCount === 1 ? "handle isn't" : "handles aren't"} linked to a person yet — they show as raw handles. Click <strong>Map people</strong> to fix.</span>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="people">People</TabsTrigger>
              <TabsTrigger value="repos">Repos</TabsTrigger>
              <TabsTrigger value="focus">Focus</TabsTrigger>
              <TabsTrigger value="kai">✦ Ask KAI</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Window (People &amp; Repos):</span>
              <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                {[
                  { label: "30d", val: 30 },
                  { label: "60d", val: 60 },
                  { label: "90d", val: 90 },
                  { label: "180d", val: 180 },
                  { label: "All", val: 3650 },
                ].map((o) => (
                  <button
                    key={o.val}
                    type="button"
                    onClick={() => setWindowDays(o.val)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded font-medium transition-colors",
                      windowDays === o.val ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <TabsContent value="overview">
              <GitHubOverviewTab
                data={overview}
                isLoading={overviewLoading}
                baselineDays={baselineDays}
                onBaselineChange={setBaselineDays}
                repos={repos}
                focus={focus}
                windowDays={windowDays}
              />
            </TabsContent>
            <TabsContent value="people">
              {startupId && <GitHubPeopleTab data={people} isLoading={peopleLoading} startupId={startupId} />}
            </TabsContent>
            <TabsContent value="repos">
              <GitHubReposTab data={repos} isLoading={reposLoading} />
            </TabsContent>
            <TabsContent value="focus">
              <GitHubFocusTab data={focus} isLoading={focusLoading} />
            </TabsContent>
            <TabsContent value="kai">
              {startupId ? <GitHubKaiTab startupId={startupId} /> : <div className="text-center py-16 text-muted-foreground text-sm">Startup not found.</div>}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {startupId && <GitHubIdentityDialog startupId={startupId} open={identityOpen} onOpenChange={setIdentityOpen} />}
    </div>
  );
}
