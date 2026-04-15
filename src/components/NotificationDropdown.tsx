import { Bell, AlertTriangle, Clock, UserCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useTaskContext } from "@/contexts/TaskContext";
import { cn } from "@/lib/utils";

const typeConfig = {
  assigned: { icon: UserCheck, color: "text-blue-500" },
  "deadline-near": { icon: Clock, color: "text-amber-500" },
  overdue: { icon: AlertTriangle, color: "text-destructive" },
};

const NotificationDropdown = () => {
  const { notifications, unreadCount, markNotificationRead, markAllRead } = useTaskContext();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative rounded-full p-2 transition-all duration-150 hover:bg-muted active:scale-95">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4">No notifications</p>
          ) : (
            notifications.map((n) => {
              const cfg = typeConfig[n.type];
              const Icon = cfg.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                    !n.read && "bg-muted/20"
                  )}
                >
                  <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", cfg.color)} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs", !n.read && "font-medium")}>{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{n.timestamp}</p>
                  </div>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;
