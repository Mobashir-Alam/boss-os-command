import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, AlertTriangle, XCircle, FileWarning, Circle, Loader2, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import InfoTooltip from "@/components/social/InfoTooltip";
import type { TodayBoard, TodayPerson } from "@/hooks/useSlack";

function fmtTime(iso: string | null, tz: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: tz, hour: "numeric", minute: "2-digit",
  });
}

function Avatar({ name, url, size = 32 }: { name: string; url: string | null; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
  if (url) {
    return <img src={url} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0"
      style={{ width: size, height: size }}
    >
      {initials || "?"}
    </div>
  );
}

function PresenceDot({ state }: { state?: string }) {
  if (!state) return null;
  const color = state === "active" ? "bg-green-500" : "bg-gray-300";
  return <span className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-white", color)} title={state} />;
}

const STATUS_META: Record<TodayPerson["status"], { label: string; icon: React.ReactNode; tone: string }> = {
  checked_in: { label: "Checked in", icon: <CheckCircle2 className="w-4 h-4" />, tone: "text-green-600" },
  active_no_checkin: { label: "Active, no check-in", icon: <AlertTriangle className="w-4 h-4" />, tone: "text-amber-600" },
  absent: { label: "Absent", icon: <XCircle className="w-4 h-4" />, tone: "text-red-500" },
};

function PersonRow({ person, presence, tz }: { person: TodayPerson; presence?: string; tz: string }) {
  const meta = STATUS_META[person.status];
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="relative">
        <Avatar name={person.name} url={person.avatar_url} />
        <span className="absolute -bottom-0.5 -right-0.5"><PresenceDot state={presence} /></span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{person.name}</div>
        <div className={cn("text-xs flex items-center gap-1", meta.tone)}>
          {meta.icon}
          {meta.label}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-muted-foreground">
          {person.status !== "absent" ? `in ${fmtTime(person.check_in_time, tz)}` : "—"}
        </div>
        <div className="flex items-center gap-1 justify-end mt-0.5">
          {person.posted_update ? (
            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-[10px] py-0 px-1">update ✓</Badge>
          ) : person.status === "absent" ? null : person.days_since_update !== null ? (
            <Badge variant="outline" className="text-muted-foreground text-[10px] py-0 px-1">
              update {person.days_since_update}d ago
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px] py-0 px-1">no update</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  board: TodayBoard | undefined;
  isLoading: boolean;
  configured: boolean;
  tz: string;
  presence: Record<string, string> | null;
  onCheckPresence: () => void;
  presenceLoading: boolean;
  onOpenSetup: () => void;
}

export default function SlackTodayTab({
  board, isLoading, configured, tz, presence, onCheckPresence, presenceLoading, onOpenSetup,
}: Props) {
  const sortedPeople = useMemo(() => {
    if (!board) return [];
    const order: Record<TodayPerson["status"], number> = { active_no_checkin: 0, absent: 1, checked_in: 2 };
    return [...board.people].sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
  }, [board]);

  if (!configured) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center text-center gap-3 py-12">
          <Settings className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Attendance monitoring isn't set up yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Tell the system which channel is your check-in channel and which channels carry work updates, then run a sync.
            </p>
          </div>
          <Button onClick={onOpenSetup} className="gap-2">
            <Settings className="w-4 h-4" /> Set up monitoring
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!board?.work_date) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        No attendance data yet — run a sync after saving your config.
      </div>
    );
  }

  const summary = [
    { label: "Checked in", value: board.checked_in.length, tone: "text-green-600", icon: <CheckCircle2 className="w-4 h-4" /> },
    { label: "Active, no check-in", value: board.active_no_checkin.length, tone: "text-amber-600", icon: <AlertTriangle className="w-4 h-4" /> },
    { label: "Absent", value: board.absent.length, tone: "text-red-500", icon: <XCircle className="w-4 h-4" /> },
    { label: "No update", value: board.no_update.length, tone: "text-orange-500", icon: <FileWarning className="w-4 h-4" /> },
  ];

  const activeCount = presence ? Object.values(presence).filter((p) => p === "active").length : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Today</h2>
          <p className="text-sm text-muted-foreground">
            Work-day {board.work_date}
            {activeCount !== null && <> · <span className="text-green-600 font-medium">{activeCount} online now</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCheckPresence} disabled={presenceLoading} className="gap-1.5">
            {presenceLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Circle className="w-3.5 h-3.5 text-green-500 fill-green-500" />}
            Who's online
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenSetup} className="gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Setup
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summary.map((s) => (
          <Card key={s.label} className="p-4">
            <div className={cn("flex items-center gap-1.5 text-sm", s.tone)}>{s.icon}{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Exceptions pinned */}
      {(board.active_no_checkin.length > 0 || board.no_update.length > 0) && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {board.active_no_checkin.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground">Working but didn't check in:</span>
                {board.active_no_checkin.map((p) => (
                  <Badge key={p.user_id} variant="outline" className="bg-white">{p.name}</Badge>
                ))}
              </div>
            )}
            {board.no_update.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground">No work update yet:</span>
                {board.no_update.map((p) => (
                  <Badge key={p.user_id} variant="outline" className="bg-white">{p.name}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Roster */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1">
            Roster
            <InfoTooltip size="xs">
              Everyone on the team. "Active, no check-in" means they posted somewhere but never in the attendance channel. "Absent" means no Slack activity at all this work-day.
            </InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {sortedPeople.map((p) => (
            <PersonRow key={p.user_id} person={p} presence={presence?.[p.user_id]} tz={tz} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
