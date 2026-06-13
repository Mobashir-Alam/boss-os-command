import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Heart, CornerDownRight, Paperclip, Hash, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersonProfile, type PersonMessage, type SlackMonitoringConfig } from "@/hooks/useSlack";

function Avatar({ name, url, size = 44 }: { name: string; url: string | null; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
  if (url) {
    return <img src={url} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size }}
    >
      {initials || "?"}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold leading-none">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function MessageList({ messages, tz, emptyLabel }: { messages: PersonMessage[]; tz: string; emptyLabel: string }) {
  if (messages.length === 0) {
    return <div className="text-center py-12 text-sm text-muted-foreground">{emptyLabel}</div>;
  }
  return (
    <ScrollArea className="h-[46vh] pr-3">
      <div className="space-y-2">
        {messages.map((m) => (
          <div key={`${m.channel_id}:${m.message_ts}`} className="rounded-lg border p-2.5 text-sm">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-0.5 font-medium text-indigo-600">
                <Hash className="w-3 h-3" />{m.channel_name ?? m.channel_id}
              </span>
              <span>·</span>
              <span>
                {m.posted_at
                  ? new Date(m.posted_at).toLocaleString("en-US", {
                      timeZone: tz, month: "short", day: "numeric",
                      hour: "numeric", minute: "2-digit",
                    })
                  : "—"}
              </span>
            </div>
            <p className="whitespace-pre-wrap leading-snug">{m.text || <em className="text-muted-foreground">(no text)</em>}</p>
            {(m.reaction_count > 0 || m.reply_count > 0 || m.has_files) && (
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                {m.reaction_count > 0 && <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{m.reaction_count}</span>}
                {m.reply_count > 0 && <span className="flex items-center gap-0.5"><CornerDownRight className="w-3 h-3" />{m.reply_count}</span>}
                {m.has_files && <span className="flex items-center gap-0.5"><Paperclip className="w-3 h-3" />file</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 text-xs px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors",
        active ? "bg-indigo-600 text-white border-indigo-600" : "bg-background hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}

// "All messages" tab — every channel the person posted in, with a per-channel
// filter so it's obvious the data spans the whole workspace, not just the
// attendance/work-update channels.
function AllMessagesTab({ messages, tz }: { messages: PersonMessage[]; tz: string }) {
  const [channel, setChannel] = useState<string>("all");

  const channels = useMemo(() => {
    const m = new Map<string, { id: string; name: string; count: number }>();
    for (const msg of messages) {
      const prev = m.get(msg.channel_id) ?? { id: msg.channel_id, name: msg.channel_name ?? msg.channel_id, count: 0 };
      prev.count++;
      m.set(msg.channel_id, prev);
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count);
  }, [messages]);

  const filtered = channel === "all" ? messages : messages.filter((m) => m.channel_id === channel);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <FilterChip active={channel === "all"} onClick={() => setChannel("all")} label={`All channels (${messages.length})`} />
        {channels.map((c) => (
          <FilterChip
            key={c.id}
            active={channel === c.id}
            onClick={() => setChannel(c.id)}
            label={`#${c.name} (${c.count})`}
          />
        ))}
      </div>
      <MessageList messages={filtered} tz={tz} emptyLabel="No messages in this channel." />
    </div>
  );
}

interface Props {
  startupId: string;
  userId: string | null;
  config: SlackMonitoringConfig | null | undefined;
  tz: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SlackPersonDialog({ startupId, userId, config, tz, open, onOpenChange }: Props) {
  const { data: profile, isLoading } = usePersonProfile(startupId, userId, config);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Person profile</DialogTitle>
        </DialogHeader>

        {isLoading || !profile ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-11 h-11 rounded-full" />
              <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div>
            </div>
            <Skeleton className="h-[46vh]" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Avatar name={profile.name} url={profile.avatar_url} />
              <div className="min-w-0">
                <div className="font-semibold text-base truncate">{profile.name}</div>
                {profile.title && <div className="text-xs text-muted-foreground truncate">{profile.title}</div>}
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-5 pr-2">
                <Stat label="messages" value={String(profile.stats.total_messages)} />
                <Stat
                  label="check-in"
                  value={`${profile.stats.checkin_days}/${profile.stats.work_days_seen}`}
                />
                <Stat
                  label="updates"
                  value={`${profile.stats.update_days}/${profile.stats.work_days_seen}`}
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="attendance">
              <TabsList>
                <TabsTrigger value="attendance">
                  Attendance
                  <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px]">{profile.attendance.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="updates">
                  Work updates
                  <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px]">{profile.work_updates.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="all">
                  All messages
                  <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px]">{profile.all.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <div className="mt-3">
                <TabsContent value="attendance">
                  <MessageList messages={profile.attendance} tz={tz} emptyLabel="No attendance messages in the synced window." />
                </TabsContent>
                <TabsContent value="updates">
                  <MessageList messages={profile.work_updates} tz={tz} emptyLabel="No work-update posts in the synced window." />
                </TabsContent>
                <TabsContent value="all">
                  <AllMessagesTab messages={profile.all} tz={tz} />
                </TabsContent>
              </div>
            </Tabs>

            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Showing up to the latest 1,000 messages from the synced history window.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
