import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { GitCommit, Hash, ExternalLink } from "lucide-react";
import InfoTooltip from "@/components/social/InfoTooltip";
import { useGitHubCommits } from "@/hooks/useGitHub";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

interface Props {
  startupId: string;
  windowDays: number;
}

export default function GitHubCommitsPanel({ startupId, windowDays }: Props) {
  const { data: commits, isLoading } = useGitHubCommits(startupId, windowDays);
  const [person, setPerson] = useState("all");
  const [repo, setRepo] = useState("all");

  const people = useMemo(() => {
    const m = new Map<string, string>(); // login -> name
    for (const c of commits ?? []) m.set(c.author_login, c.author);
    return Array.from(m.entries()).map(([login, name]) => ({ login, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [commits]);

  const repos = useMemo(() => {
    const s = new Set<string>();
    for (const c of commits ?? []) s.add(c.repo_name);
    return Array.from(s).sort();
  }, [commits]);

  const filtered = useMemo(() => {
    let list = commits ?? [];
    if (person !== "all") list = list.filter((c) => c.author_login === person);
    if (repo !== "all") list = list.filter((c) => c.repo_name === repo);
    return list;
  }, [commits, person, repo]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-1">
            <GitCommit className="w-4 h-4" /> Commits
            <span className="text-xs font-normal text-muted-foreground">
              ({filtered.length}{(commits?.length ?? 0) >= 2000 ? " of latest 2,000" : ""})
            </span>
            <InfoTooltip size="xs">Every commit in the selected window. Filter by person or repo. Newest first; capped at the latest 2,000.</InfoTooltip>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={person} onValueChange={setPerson}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Person" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All people</SelectItem>
                {people.map((p) => <SelectItem key={p.login} value={p.login}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={repo} onValueChange={setRepo}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Repo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All repos</SelectItem>
                {repos.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            {commits?.length ? "No commits match these filters." : "No commits in this window — sync GitHub."}
          </div>
        ) : (
          <ScrollArea className="h-80 pr-3">
            <div className="space-y-1">
              {filtered.map((c) => (
                <div key={`${c.repo_name}:${c.sha}`} className="flex items-start gap-2 border-b py-1.5 text-sm last:border-0">
                  <GitCommit className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate flex-1">{c.title || <em className="text-muted-foreground">(no message)</em>}</p>
                      {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="shrink-0"><ExternalLink className="w-3 h-3 text-muted-foreground" /></a>}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="font-medium text-foreground/80">{c.author}</span>
                      <span className="flex items-center gap-0.5"><Hash className="w-3 h-3" />{c.repo_name}</span>
                      <span>· {fmtDate(c.date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
