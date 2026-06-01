import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, KeyRound, Plus, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  useYouTubeCredentials,
  useSaveYouTubeApiKey,
  useTriggerYouTubeDiscovery,
  useAddYouTubeChannel,
  useYouTubeChannels,
  useToggleChannelActive,
} from "@/hooks/useYouTube";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  startupId: string;
}

export default function YouTubeConnectorSetup({ open, onOpenChange, startupId }: Props) {
  const { data: cred } = useYouTubeCredentials(startupId);
  const { data: channels = [] } = useYouTubeChannels(startupId);
  const saveKey = useSaveYouTubeApiKey();
  const discover = useTriggerYouTubeDiscovery();
  const addChannel = useAddYouTubeChannel();
  const toggleActive = useToggleChannelActive();

  const [apiKey, setApiKey] = useState("");
  const [channelInput, setChannelInput] = useState("");
  const [discoveryPreview, setDiscoveryPreview] = useState<any>(null);

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast.error("Paste the API key first");
      return;
    }
    saveKey.mutate(
      { startupId, apiKey: apiKey.trim() },
      {
        onSuccess: () => {
          toast.success("API key saved");
          setApiKey("");
        },
        onError: (e: any) => toast.error(e?.message ?? "Couldn't save"),
      }
    );
  };

  const handleDiscover = () => {
    if (!channelInput.trim()) {
      toast.error("Enter a channel ID or @handle");
      return;
    }
    setDiscoveryPreview(null);
    discover.mutate(
      { startupId, channelInput: channelInput.trim() },
      {
        onSuccess: (data) => {
          setDiscoveryPreview(data);
          toast.success(`Resolved: ${data.channel?.title}`);
        },
        onError: (e: any) => toast.error(e?.message ?? "Discovery failed"),
      }
    );
  };

  const handleConfirmAddChannel = () => {
    if (!discoveryPreview?.channel) return;
    addChannel.mutate(
      {
        startupId,
        channelId: discoveryPreview.channel.channel_id,
        title: discoveryPreview.channel.title,
      },
      {
        onSuccess: () => {
          toast.success(`Added ${discoveryPreview.channel.title}`);
          setChannelInput("");
          setDiscoveryPreview(null);
        },
        onError: (e: any) => toast.error(e?.message ?? "Couldn't add channel"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> YouTube Connector Setup
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Step 1 — API key */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 text-primary text-[10px] font-bold w-5 h-5 flex items-center justify-center">1</span>
              <p className="text-sm font-semibold">Google API key</p>
              {cred && (
                <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/30 bg-emerald-500/15 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Generate in Google Cloud Console → enable <code className="bg-muted px-1 rounded">YouTube Data API v3</code> → Credentials → Create API key.{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Open Google Cloud <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={cred ? "•••••••••• (paste to replace)" : "AIzaSy…"}
                className="font-mono text-xs"
                type="password"
              />
              <Button size="sm" onClick={handleSaveKey} disabled={saveKey.isPending}>
                {saveKey.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {cred ? "Replace" : "Save"}
              </Button>
            </div>
          </div>

          {/* Step 2 — Add channels */}
          {cred && (
            <div className="space-y-2 border-t border-border/40 pt-5">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 text-primary text-[10px] font-bold w-5 h-5 flex items-center justify-center">2</span>
                <p className="text-sm font-semibold">Add channels</p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Channel ID (e.g. <code className="bg-muted px-1 rounded">UCabc123...</code>) or handle (e.g. <code className="bg-muted px-1 rounded">@nasheediobeats</code>).
                Hit "Preview" to verify before adding.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  placeholder="UCxxxx… or @handle"
                  className="font-mono text-xs"
                />
                <Button size="sm" variant="outline" onClick={handleDiscover} disabled={discover.isPending}>
                  {discover.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Preview
                </Button>
              </div>

              {discoveryPreview?.channel && (
                <div className="mt-2 rounded-lg border border-border/40 bg-card p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    {discoveryPreview.channel.thumbnail_url && (
                      <img
                        src={discoveryPreview.channel.thumbnail_url}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 rounded-full"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{discoveryPreview.channel.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {Number(discoveryPreview.channel.subscriber_count).toLocaleString()} subscribers · {Number(discoveryPreview.channel.video_count).toLocaleString()} videos · {Number(discoveryPreview.channel.view_count).toLocaleString()} total views
                      </p>
                    </div>
                    <Button size="sm" onClick={handleConfirmAddChannel} disabled={addChannel.isPending} className="gap-1">
                      {addChannel.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                  </div>
                  {discoveryPreview.recent_videos?.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Last upload: <span className="text-foreground">{discoveryPreview.recent_videos[0]?.title}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Configured channels */}
          {cred && channels.length > 0 && (
            <div className="space-y-2 border-t border-border/40 pt-5">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 text-primary text-[10px] font-bold w-5 h-5 flex items-center justify-center">3</span>
                <p className="text-sm font-semibold">Configured channels · {channels.length}</p>
              </div>
              <div className="space-y-1.5">
                {channels.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border/40 bg-card p-2">
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{c.title ?? c.channel_id}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {c.subscriber_count.toLocaleString()} subs · {c.video_count} videos
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={c.is_active ? "outline" : "ghost"}
                      onClick={() =>
                        toggleActive.mutate({ id: c.id, startupId, isActive: !c.is_active })
                      }
                      className="text-[10px] h-7"
                    >
                      {c.is_active ? "Active" : "Paused"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
