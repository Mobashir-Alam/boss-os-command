import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Hash, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import InfoTooltip from "@/components/social/InfoTooltip";
import type { SlackChannelRow } from "@/hooks/useSlack";
import type { SlackChannel } from "@/hooks/useSlack";

function fmtNum(n: number) {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function TrendIcon({ trend }: { trend: "up" | "flat" | "down" }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-green-600" />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function StatBlock({ label, value, tooltip }: { label: string; value: string; tooltip: string }) {
  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
        {label}
        <InfoTooltip size="xs">{tooltip}</InfoTooltip>
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

interface ChannelCardProps {
  row: SlackChannelRow;
  channel?: SlackChannel;
}

function ChannelCard({ row, channel }: ChannelCardProps) {
  const isPrivate = channel?.is_private ?? false;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isPrivate ? <Lock className="w-4 h-4 text-muted-foreground shrink-0" /> : <Hash className="w-4 h-4 text-muted-foreground shrink-0" />}
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{row.name}</div>
            {channel?.purpose && (
              <div className="text-xs text-muted-foreground truncate">{channel.purpose}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TrendIcon trend={row.trend} />
          <span className="text-xs text-muted-foreground">vs prior 14d</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t">
        <StatBlock
          label="Messages"
          value={fmtNum(row.messages)}
          tooltip="Total messages posted in the last 14 days."
        />
        <StatBlock
          label="Active users"
          value={fmtNum(row.active_users)}
          tooltip="Peak daily active poster count in this channel over the period."
        />
        <StatBlock
          label="Reactions"
          value={fmtNum(row.reactions)}
          tooltip="Total emoji reactions received on messages in this channel."
        />
        <StatBlock
          label="Replies"
          value={fmtNum(row.replies)}
          tooltip="Total thread replies. High replies = engaged conversations."
        />
      </div>

      {row.last_active && (
        <div className="text-xs text-muted-foreground mt-2">
          Last active {row.last_active}
        </div>
      )}
    </Card>
  );
}

interface Props {
  rows: SlackChannelRow[] | undefined;
  channels: SlackChannel[] | undefined;
  isLoading: boolean;
}

export default function SlackChannelsTab({ rows, channels, isLoading }: Props) {
  const channelMeta = new Map<string, SlackChannel>();
  for (const c of channels ?? []) channelMeta.set(c.channel_id, c);

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36" />)}
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        No channel data yet — click "Sync Slack" to load.
      </div>
    );
  }

  const active = rows.filter((r) => r.messages > 0);
  const silent = rows.filter((r) => r.messages === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{active.length}</span> active channels
        {silent.length > 0 && (
          <>, <span className="font-medium text-foreground">{silent.length}</span> silent in last 14 days</>
        )}
        <InfoTooltip size="xs">
          Active = at least 1 message in the last 14 days. Silent channels are shown below.
        </InfoTooltip>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {active.map((row) => (
          <ChannelCard key={row.channel_id} row={row} channel={channelMeta.get(row.channel_id)} />
        ))}
      </div>

      {silent.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Silent channels (no messages in 14d)</h3>
          <div className="flex flex-wrap gap-2">
            {silent.map((r) => (
              <Badge key={r.channel_id} variant="outline" className="text-muted-foreground">
                {channelMeta.get(r.channel_id)?.is_private ? "🔒" : "#"}{r.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
