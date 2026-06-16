import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GitPullRequest, Hash, ExternalLink, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import InfoTooltip from "@/components/social/InfoTooltip";
import type { OpenPR } from "@/hooks/useGitHub";

function PRRow({ pr }: { pr: OpenPR }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <GitPullRequest className={cn("w-4 h-4 mt-0.5 shrink-0", pr.stale ? "text-red-500" : "text-green-600")} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{pr.title}</span>
          {pr.url && <a href={pr.url} target="_blank" rel="noreferrer" className="shrink-0"><ExternalLink className="w-3 h-3 text-muted-foreground" /></a>}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
          <span className="flex items-center gap-0.5"><Hash className="w-3 h-3" />{pr.repo_name}</span>
          <span>· {pr.author}</span>
        </div>
      </div>
      <Badge variant="outline" className={cn("text-[11px] shrink-0", pr.stale ? "text-red-600 border-red-300 bg-red-50" : "text-muted-foreground")}>
        {pr.age_days === null ? "—" : `${pr.age_days}d open`}
      </Badge>
    </div>
  );
}

interface Props {
  data: { openPrs: OpenPR[]; stale_count: number } | undefined;
  isLoading: boolean;
}

export default function GitHubFocusTab({ data, isLoading }: Props) {
  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <div className="text-center py-16 text-muted-foreground text-sm">No data yet — sync GitHub first.</div>;

  const stale = data.openPrs.filter((p) => p.stale);
  const fresh = data.openPrs.filter((p) => !p.stale);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{data.openPrs.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Open PRs</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-500">{data.stale_count}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-0.5 mt-1">
            Stale (≥7d) <InfoTooltip size="xs">Open PRs sitting for a week or more — likely stuck waiting on review or a decision.</InfoTooltip>
          </div>
        </Card>
      </div>

      {stale.length > 0 && (
        <Card className="border-red-200 bg-red-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Stuck — open ≥7 days</CardTitle>
          </CardHeader>
          <CardContent className="divide-y py-0">{stale.map((p) => <PRRow key={p.external_id} pr={p} />)}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1">
            In review
            <InfoTooltip size="xs">All currently-open pull requests, oldest first. This is what the team has in flight right now.</InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y py-0">
          {fresh.map((p) => <PRRow key={p.external_id} pr={p} />)}
          {data.openPrs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No open PRs right now.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
