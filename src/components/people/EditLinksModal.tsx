import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";
import {
  usePersonLink, useSaveConnectorLink, useSlackUserOptions, useGitHubLoginOptions,
} from "@/hooks/useConnectorLinks";

const NONE = "__none__";

// Connects a People OS person to their Slack user + GitHub login so connector
// activity can be attributed to them (My Activity, People Pulse, KAI lookups).
export default function EditLinksModal({
  open,
  onOpenChange,
  personId,
  personName,
  startupId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  personId: string;
  personName: string;
  startupId: string;
}) {
  const { data: link, isLoading: linkLoading } = usePersonLink(open ? personId : undefined);
  const { data: slackUsers = [] } = useSlackUserOptions(open ? startupId : undefined);
  const { data: githubLogins = [] } = useGitHubLoginOptions(open ? startupId : undefined);
  const save = useSaveConnectorLink();

  const [slackUserId, setSlackUserId] = useState<string>(NONE);
  const [githubLogin, setGithubLogin] = useState<string>(NONE);

  // Hydrate from the existing link row once loaded
  useEffect(() => {
    if (!open) return;
    setSlackUserId(link?.slack_user_id ?? NONE);
    setGithubLogin(link?.github_login ?? NONE);
  }, [open, link]);

  const handleSave = () => {
    save.mutate(
      {
        personId,
        startupId,
        slackUserId: slackUserId === NONE ? null : slackUserId,
        githubLogin: githubLogin === NONE ? null : githubLogin,
      },
      {
        onSuccess: () => {
          toast.success(`Linked accounts saved for ${personName}`);
          onOpenChange(false);
        },
        onError: (e) => toast.error((e as Error).message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Edit Links — {personName}
          </DialogTitle>
          <DialogDescription>
            Connect this person's Slack and GitHub accounts so their activity shows
            up in dashboards and KAI lookups.
          </DialogDescription>
        </DialogHeader>

        {linkLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Slack user</Label>
              <Select value={slackUserId} onValueChange={setSlackUserId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Not linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not linked</SelectItem>
                  {slackUsers.map((u) => (
                    <SelectItem key={u.user_id_source} value={u.user_id_source}>
                      {u.display_name ?? u.user_id_source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">GitHub login</Label>
              <Select value={githubLogin} onValueChange={setGithubLogin}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Not linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not linked</SelectItem>
                  {githubLogins.map((login) => (
                    <SelectItem key={login} value={login}>
                      {login}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={save.isPending || linkLoading}>
            {save.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save links
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
