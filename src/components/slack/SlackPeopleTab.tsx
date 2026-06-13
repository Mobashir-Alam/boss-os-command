import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Heart, CornerDownRight, Search, ChevronRight } from "lucide-react";
import InfoTooltip from "@/components/social/InfoTooltip";
import SlackPersonDialog from "@/components/slack/SlackPersonDialog";
import type { SlackContributor, SlackMonitoringConfig } from "@/hooks/useSlack";

function fmtNum(n: number) {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initials = name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  if (url) {
    return <img src={url} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
      {initials || "?"}
    </div>
  );
}

interface ContributorRowProps {
  rank: number;
  contributor: SlackContributor;
  maxMessages: number;
}

function ContributorRow({ rank, contributor, maxMessages }: ContributorRowProps) {
  const barPct = maxMessages ? (contributor.messages / maxMessages) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 text-xs text-muted-foreground text-right shrink-0">{rank}</div>
      <Avatar name={contributor.name} url={contributor.avatar_url} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate">{contributor.name}</span>
          <span className="text-sm font-semibold shrink-0 ml-2">{fmtNum(contributor.messages)}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${barPct}%` }} />
        </div>
        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{contributor.reactions} rxn given</span>
          <span className="flex items-center gap-0.5"><CornerDownRight className="w-3 h-3" />{contributor.replies} replies</span>
        </div>
      </div>
    </div>
  );
}

interface Props {
  data:
    | {
        leaderboard: SlackContributor[];
        roster: SlackContributor[];
        lurker_pct: number;
        total_members: number;
        active_posters: number;
      }
    | undefined;
  isLoading: boolean;
  startupId: string;
  config: SlackMonitoringConfig | null | undefined;
  tz: string;
}

export default function SlackPeopleTab({ data, isLoading, startupId, config, tz }: Props) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const filteredRoster = useMemo(() => {
    const roster = data?.roster ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((r) => r.name.toLowerCase().includes(q));
  }, [data?.roster, search]);

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        <Skeleton className="h-24 md:col-span-3" />
        {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-16 md:col-span-3" />)}
      </div>
    );
  }

  if (!data?.roster.length) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        No people data yet — sync Slack first.
      </div>
    );
  }

  const maxMessages = data.leaderboard[0]?.messages ?? 1;
  const lurker_count = data.total_members - data.active_posters;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{data.total_members}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-0.5 mt-1">
            Total members
            <InfoTooltip size="xs">Total human (non-bot) workspace members synced from Slack.</InfoTooltip>
          </div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{data.active_posters}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-0.5 mt-1">
            Active posters (14d)
            <InfoTooltip size="xs">Members who sent at least one message in the last 14 days.</InfoTooltip>
          </div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{data.lurker_pct}%</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-0.5 mt-1">
            Lurker rate
            <InfoTooltip size="xs">
              % of members who read but didn&apos;t post in 14 days ({lurker_count} people).
            </InfoTooltip>
          </div>
        </Card>
      </div>

      {/* Top contributors */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1">
            Top contributors
            <InfoTooltip size="xs">Ranked by messages sent in the last 14 days.</InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.leaderboard.map((c, i) => (
            <ContributorRow key={c.user_id} rank={i + 1} contributor={c} maxMessages={maxMessages} />
          ))}
        </CardContent>
      </Card>

      {/* Full roster — click anyone to open their profile */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-1">
              Everyone
              <InfoTooltip size="xs">Every person on Slack. Click anyone to see all their attendance, work updates, and messages.</InfoTooltip>
            </CardTitle>
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people…"
                className="h-8 pl-7 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredRoster.map((p) => (
              <button
                key={p.user_id}
                type="button"
                onClick={() => setSelectedUser(p.user_id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
              >
                <Avatar name={p.name} url={p.avatar_url} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.messages > 0 ? `${fmtNum(p.messages)} msgs · ${p.reactions} rxn · ${p.replies} replies (14d)` : "No activity in last 14d"}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
            {filteredRoster.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No one matches "{search}".</div>
            )}
          </div>
        </CardContent>
      </Card>

      <SlackPersonDialog
        startupId={startupId}
        userId={selectedUser}
        config={config}
        tz={tz}
        open={!!selectedUser}
        onOpenChange={(o) => { if (!o) setSelectedUser(null); }}
      />
    </div>
  );
}
