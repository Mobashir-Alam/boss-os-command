import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, GitCommit, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useGitHubIdentity, useMapGitHubIdentity } from "@/hooks/useGitHub";

interface Props {
  startupId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export default function GitHubIdentityDialog({ startupId, open, onOpenChange }: Props) {
  const { data, isLoading } = useGitHubIdentity(startupId);
  const { mutateAsync: mapId, isPending } = useMapGitHubIdentity();
  const [busyLogin, setBusyLogin] = useState<string | null>(null);

  async function assign(githubLogin: string, profileId: string) {
    setBusyLogin(githubLogin);
    try {
      await mapId({ profileId, githubLogin });
      toast.success(`Mapped @${githubLogin}`);
    } catch (err) {
      toast.error(`Map failed: ${(err as Error).message}`);
    } finally {
      setBusyLogin(null);
    }
  }

  const profiles = data?.profiles ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Map GitHub handles to people</DialogTitle>
          <DialogDescription>
            These GitHub logins have activity but aren&apos;t linked to an employee yet. Pick the matching person so the dashboard shows real names.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (data?.unmapped.length ?? 0) === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            Everyone with activity is mapped. 🎉
          </div>
        ) : (
          <ScrollArea className="h-[55vh] pr-3">
            <div className="space-y-2">
              {data!.unmapped.map((u) => (
                <div key={u.github_login} className="flex items-center gap-2 border rounded-lg p-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">@{u.github_login}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-0.5"><GitCommit className="w-3 h-3" />{u.commits} commits</div>
                  </div>
                  {busyLogin === u.github_login ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Select onValueChange={(profileId) => assign(u.github_login, profileId)} disabled={isPending}>
                      <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Assign to…" /></SelectTrigger>
                      <SelectContent>
                        {profiles
                          .filter((p) => !p.github_username)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.full_name ?? "(unnamed)"}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <p className="text-[11px] text-muted-foreground">
          Mapping sets <code className="bg-muted px-1 rounded">profiles.github_username</code>. Re-sync to attribute past commits to the person.
        </p>
      </DialogContent>
    </Dialog>
  );
}
