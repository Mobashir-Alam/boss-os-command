import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GitCommit, GitMerge, GitPullRequest, Hash } from "lucide-react";
import { useGitHubPersonProfile } from "@/hooks/useGitHub";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface Props {
  startupId: string;
  login: string | null;
  displayName: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export default function GitHubPersonDialog({ startupId, login, displayName, open, onOpenChange }: Props) {
  const { data, isLoading } = useGitHubPersonProfile(startupId, login);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {displayName}
            {login && <span className="text-xs font-normal text-muted-foreground">@{login}</span>}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <Skeleton className="h-[50vh]" />
        ) : (
          <Tabs defaultValue="commits">
            <TabsList>
              <TabsTrigger value="commits">Commits <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px]">{data.commits.length}</Badge></TabsTrigger>
              <TabsTrigger value="prs">Pull requests <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px]">{data.prs.length}</Badge></TabsTrigger>
            </TabsList>

            <div className="mt-3">
              <TabsContent value="commits">
                <ScrollArea className="h-[50vh] pr-3">
                  <div className="space-y-1.5">
                    {data.commits.map((c) => (
                      <div key={c.external_id} className="flex items-start gap-2 text-sm border-b pb-1.5">
                        <GitCommit className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{c.title}</p>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="flex items-center gap-0.5"><Hash className="w-3 h-3" />{c.repo_name}</span>
                            <span>{fmtDate(c.created_at_source)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {data.commits.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No commits in the synced window.</p>}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="prs">
                <ScrollArea className="h-[50vh] pr-3">
                  <div className="space-y-1.5">
                    {data.prs.map((p) => (
                      <div key={p.external_id} className="flex items-start gap-2 text-sm border-b pb-1.5">
                        {p.state === "merged" ? <GitMerge className="w-3.5 h-3.5 mt-0.5 text-purple-500 shrink-0" /> : <GitPullRequest className="w-3.5 h-3.5 mt-0.5 text-green-600 shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{p.title}</p>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="flex items-center gap-0.5"><Hash className="w-3 h-3" />{p.repo_name}</span>
                            <span className="capitalize">{p.state}</span>
                            <span>{fmtDate(p.merged_at_source ?? p.created_at_source)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {data.prs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No PRs in the synced window.</p>}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
