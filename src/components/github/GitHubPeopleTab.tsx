import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight, GitCommit, GitMerge, Hash } from "lucide-react";
import InfoTooltip from "@/components/social/InfoTooltip";
import GitHubPersonDialog from "@/components/github/GitHubPersonDialog";
import type { GitHubPerson } from "@/hooks/useGitHub";

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initials = name.split(" ").map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
  if (url) return <img src={url} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  return <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">{initials || "?"}</div>;
}

interface Props {
  data: GitHubPerson[] | undefined;
  isLoading: boolean;
  startupId: string;
}

export default function GitHubPeopleTab({ data, isLoading, startupId }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GitHubPerson | null>(null);

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.name.toLowerCase().includes(q) || p.github_login.toLowerCase().includes(q));
  }, [data, search]);

  if (isLoading) {
    return <div className="space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  }
  if (!data?.length) {
    return <div className="text-center py-16 text-muted-foreground text-sm">No contributor activity yet — sync GitHub first.</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-1">
              Who&apos;s working on what
              <InfoTooltip size="xs">Per-engineer activity over the selected window (top-right). Click anyone to see their commits + PRs. Unmapped GitHub handles are shown raw — map them in Setup.</InfoTooltip>
            </CardTitle>
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people…" className="h-8 pl-7 text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((p) => (
              <button key={p.github_login} type="button" onClick={() => setSelected(p)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left">
                <Avatar name={p.name} url={p.avatar_url} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{p.name}</span>
                    {!p.mapped && <Badge variant="outline" className="text-[10px] py-0 px-1 text-amber-700 border-amber-300">unmapped</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-0.5"><GitCommit className="w-3 h-3" />{p.commits}</span>
                    <span className="flex items-center gap-0.5"><GitMerge className="w-3 h-3" />{p.prs_merged} merged</span>
                    <span>{p.repos_touched} repo{p.repos_touched === 1 ? "" : "s"}</span>
                    {p.top_repo && <span className="flex items-center gap-0.5 text-indigo-600"><Hash className="w-3 h-3" />{p.top_repo}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
            {filtered.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No one matches "{search}".</div>}
          </div>
        </CardContent>
      </Card>

      <GitHubPersonDialog
        startupId={startupId}
        login={selected?.github_login ?? null}
        displayName={selected?.name ?? ""}
        open={!!selected}
        onOpenChange={(o) => { if (!o) setSelected(null); }}
      />
    </div>
  );
}
