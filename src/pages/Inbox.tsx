import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  type Notification,
  type NotificationType,
} from "@/hooks/useNotifications";
import {
  AtSign, MessageSquare, ListTodo, Bug as BugIcon, Users, Inbox as InboxIcon, CheckCheck,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationType, typeof InboxIcon> = {
  mention: AtSign,
  bug_comment: MessageSquare,
  bug_assigned: BugIcon,
  bug_status_changed: BugIcon,
  task_assigned: ListTodo,
  task_updated: ListTodo,
  project_assigned: Users,
  project_member_added: Users,
  project_completed: ListTodo,
  project_paused: ListTodo,
};

const COLORS: Record<NotificationType, string> = {
  mention: "text-primary",
  bug_comment: "text-blue-500",
  bug_assigned: "text-amber-500",
  bug_status_changed: "text-amber-500",
  task_assigned: "text-emerald-500",
  task_updated: "text-emerald-500",
  project_assigned: "text-purple-500",
  project_member_added: "text-purple-500",
  project_completed: "text-emerald-500",
  project_paused: "text-muted-foreground",
};

function deriveLink(n: Notification): string {
  if (n.link) return n.link;
  if (n.bug_id && n.project_id) return `/project/${n.project_id}?tab=bugs`;
  if (n.project_id) return `/project/${n.project_id}`;
  return "/inbox";
}

function groupByDay(notifications: Notification[]): Map<string, Notification[]> {
  const groups = new Map<string, Notification[]>();
  notifications.forEach((n) => {
    const key = format(new Date(n.created_at), "PPP");
    const arr = groups.get(key) ?? [];
    arr.push(n);
    groups.set(key, arr);
  });
  return groups;
}

export default function InboxPage() {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const unread = notifications.filter((n) => !n.read);

  const handleClick = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    navigate(deriveLink(n));
  };

  const groups = groupByDay(notifications);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <InboxIcon className="h-6 w-6" />
              Inbox
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {unread.length > 0 ? `${unread.length} unread` : "All caught up"}
            </p>
          </div>
          {unread.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="gap-1.5"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {isLoading && <p className="text-sm italic text-muted-foreground">Loading…</p>}

        {!isLoading && notifications.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-12 text-center">
            <InboxIcon className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              You'll see @mentions, task assignments, and bug updates here.
            </p>
          </div>
        )}

        {[...groups.entries()].map(([day, items]) => (
          <div key={day} className="space-y-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {day}
            </h2>
            <div className="space-y-1.5">
              {items.map((n) => {
                const Icon = ICONS[n.type] ?? InboxIcon;
                const tone = COLORS[n.type] ?? "text-muted-foreground";
                const actorName = n.actor?.full_name ?? n.actor?.email ?? null;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      "group block w-full rounded-lg border bg-card p-3 text-left transition hover:border-border hover:bg-muted/20",
                      n.read ? "border-border/40" : "border-primary/40 bg-primary/[0.03]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">
                          {actorName && (
                            <span className="font-semibold">{actorName}</span>
                          )}
                          {actorName && " "}
                          {n.message}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!n.read && (
                        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] text-primary">
                          new
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
