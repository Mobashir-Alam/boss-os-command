import { Link, useNavigate } from "react-router-dom";
import { Bell, AtSign, MessageSquare, Bug as BugIcon, ListTodo, Users, Inbox as InboxIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllRead,
  type Notification,
  type NotificationType,
} from "@/hooks/useNotifications";

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

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const unread = useUnreadCount();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const recent = notifications.slice(0, 8);

  const handleClick = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    navigate(deriveLink(n));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative rounded-full p-2 transition-all duration-150 hover:bg-muted active:scale-95">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground animate-pulse">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unread > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-6 px-2"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground p-6 text-center">No notifications yet</p>
          ) : (
            recent.map((n) => {
              const Icon = ICONS[n.type] ?? InboxIcon;
              const tone = COLORS[n.type] ?? "text-muted-foreground";
              const actorName = n.actor?.full_name ?? n.actor?.email ?? null;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 border-b border-border/30 last:border-0",
                    !n.read && "bg-primary/[0.04]"
                  )}
                >
                  <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", tone)} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs leading-snug", !n.read && "font-medium")}>
                      {actorName && <span className="font-semibold">{actorName} </span>}
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-1 flex-shrink-0" />}
                </button>
              );
            })
          )}
        </div>
        <div className="border-t border-border/50 px-4 py-2">
          <Link to="/inbox" className="block text-center text-xs font-medium text-primary hover:underline">
            View all in Inbox
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;
