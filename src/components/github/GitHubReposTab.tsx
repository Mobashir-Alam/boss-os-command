import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GitCommit, GitMerge, Users, AlertTriangle, Moon, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import InfoTooltip from "@/components/social/InfoTooltip";
import type { GitHubRepo } from "@/hooks/useGitHub";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function RepoCard({ r }: { r: GitHubRepo }) {
  return (
    <Card className={cn("p-4", r.stale && "opacity-70")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm truncate">{r.repo_name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {r.bus_factor_risk && (
            <Badge variant="outline" className="text-[10px] py-0 px-1 text-red-600 border-red-300 gap-0.5">
              <AlertTriangle className="w-3 h-3" /> bus factor
            </Badge>
          )}
          {r.stale && (
            <Badge variant="outline" className="text-[10px] py-0 px-1 text-muted-foreground gap-0.5">
              <Moon className="w-3 h-3" /> stale
            </Badge>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-center">
        <div>
          <div className="text-sm font-semibold flex items-center justify-center gap-0.5"><GitCommit className="w-3 h-3" />{r.commits}</div>
          <div className="text-[11px] text-muted-foreground">commits</div>
        </div>
        <div>
          <div className="text-sm font-semibold flex items-center justify-center gap-0.5"><GitMerge className="w-3 h-3" />{r.prs_merged}</div>
          <div className="text-[11px] text-muted-foreground">merged</div>
        </div>
        <div>
          <div className="text-sm font-semibold flex items-center justify-center gap-0.5"><Users className="w-3 h-3" />{r.contributors}</div>
          <div className="text-[11px] text-muted-foreground">contributors</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-2 flex items-center justify-between">
        <span>{r.top_contributor ? `Lead: ${r.top_contributor}` : "—"}</span>
        <span>Last {fmtDate(r.last_active)}</span>
      </div>
    </Card>
  );
}

interface Props { data: GitHubRepo[] | undefined; isLoading: boolean }

export default function GitHubReposTab({ data, isLoading }: Props) {
  if (isLoading) {
    return <div className="grid md:grid-cols-2 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36" />)}</div>;
  }
  if (!data?.length) {
    return <div className="text-center py-16 text-muted-foreground text-sm">No repo activity yet — sync GitHub first.</div>;
  }

  const active = data.filter((r) => !r.stale);
  const stale = data.filter((r) => r.stale);
  const risk = data.filter((r) => r.bus_factor_risk && !r.stale).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <span><span className="font-medium text-foreground">{active.length}</span> active repos</span>
        {risk > 0 && <span className="text-red-600">· {risk} with bus-factor risk</span>}
        {stale.length > 0 && <span>· {stale.length} stale</span>}
        <InfoTooltip size="xs">Bus-factor risk = one person owns ≥80% of commits (or it's a single-contributor repo). Stale = no activity in the last 14 days.</InfoTooltip>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {active.map((r) => <RepoCard key={r.repo_name} r={r} />)}
      </div>

      {stale.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Stale (no activity in 14d)</h3>
          <div className="grid md:grid-cols-2 gap-4">{stale.map((r) => <RepoCard key={r.repo_name} r={r} />)}</div>
        </div>
      )}
    </div>
  );
}
