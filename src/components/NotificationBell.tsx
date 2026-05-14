import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useUnreadCount } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export default function NotificationBell({ className }: Props) {
  const unread = useUnreadCount();

  return (
    <Link
      to="/inbox"
      className={cn(
        "relative inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground",
        className
      )}
      title="Inbox"
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
