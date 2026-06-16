import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GitCommit, GitMerge, Users, AlertTriangle, Moon, Hash, Lock, Search, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import InfoTooltip from "@/components/social/InfoTooltip";
import type { GitHubRepo } from "@/hooks/useGitHub";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function RepoCard({ r }: { r: GitHubRepo }) {
  return (
    <Card className={cn("p-4", !r.active && "opacity-70")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {r.is_private ? <Lock className="w-4 h-4 text-muted-foreground shrink-0" /> : <Hash className="w-4 h-4 text-muted-foreground shrink-0" />}
          <span className="font-medium text-sm truncate">{r.repo_name}</span>
          {r.language && <Badge variant="secondary" className="text-[10px] py-0 px-1 shrink-0">{r.language}</Badge>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {r.is_archived && (
            <Badge variant="outline" className="text-[10px] py-0 px-1 text-muted-foreground gap-0.5"><Archive className="w-3 h-3" /> archived</Badge>
          )}
          {r.bus_factor_risk && (
            <Badge variant="outline" className="text-[10px] py-0 px-1 text-red-600 border-red-300 gap-0.5"><AlertTriangle className="w-3 h-3" /> bus factor</Badge>
          )}
          {!r.active && !r.is_archived && (
            <Badge variant="outline" className="text-[10px] py-0 px-1 text-muted-foreground gap-0.5"><Moon className="w-3 h-3" /> dormant</Badge>
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
      {r.contributors_list.length > 0 && (
        <div className="mt-3 pt-2 border-t">
          <div className="text-[11px] text-muted-foreground mb-1">Who worked on it</div>
          <div className="flex flex-wrap gap-1">
            {r.contributors_list.slice(0, 6).map((c) => (
              <span key={c.name} className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5">
                {c.name}
                <span className="font-semibold text-indigo-600">{c.commits}</span>
              </span>
            ))}
            {r.contributors_list.length > 6 && (
              <span className="text-xs text-muted-foreground px-1 py-0.5">+{r.contributors_list.length - 6} more</span>
            )}
          </div>
        </div>
      )}
      <div className="text-xs text-muted-foreground mt-2 flex items-center justify-end">
        <span>{r.active ? `Active ${fmtDate(r.last_active)}` : `Pushed ${fmtDate(r.pushed_at)}`}</span>
      </div>
    </Card>
  );
}

interface Props { data: GitHubRepo[] | undefined; isLoading: boolean }

export default function GitHubReposTab({ data, isLoading }: Props) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"active" | "all">("active");

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (mode === "active") list = list.filter((r) => r.active);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((r) => r.repo_name.toLowerCase().includes(q));
    return list;
  }, [data, mode, search]);

  if (isLoading) {
    return <div className="grid md:grid-cols-2 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36" />)}</div>;
  }
  if (!data?.length) {
    return <div className="text-center py-16 text-muted-foreground text-sm">No repos yet — sync GitHub first.</div>;
  }

  const activeCount = data.filter((r) => r.active).length;
  const riskCount = data.filter((r) => r.bus_factor_risk).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            {(["active", "all"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={cn("px-3 py-1 text-xs rounded font-medium transition-colors capitalize",
                  mode === m ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {m === "active" ? `Active (${activeCount})` : `All (${data.length})`}
              </button>
            ))}
          </div>
          {riskCount > 0 && <span className="text-red-600">{riskCount} bus-factor risk</span>}
          <InfoTooltip size="xs">Active = had commits/PRs in the selected window (top-right). All = every repo in the org, including dormant + archived. Bus-factor = one person owns ≥80% of commits.</InfoTooltip>
        </div>
        <div className="relative w-56">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter repos (e.g. nasheedio)…" className="h-8 pl-7 text-sm" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((r) => <RepoCard key={r.repo_name} r={r} />)}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No repos match{search ? ` "${search}"` : ""}{mode === "active" ? " in the active view — try All" : ""}.
        </div>
      )}
    </div>
  );
}
