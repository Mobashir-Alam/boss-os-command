import { useAuth } from "@/contexts/AuthContext";
import { useTaskContext } from "@/contexts/TaskContext";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

const MyWork = () => {
  const { profile } = useAuth();
  const { tasks } = useTaskContext();

  const myName = profile?.full_name || profile?.email || "";
  const myTasks = tasks.filter(
    (t) => t.assignee.toLowerCase() === myName.toLowerCase() && t.status !== "completed"
  );

  if (myTasks.length === 0) return null;

  const overdue = myTasks.filter((t) => {
    if (!t.deadline) return false;
    return new Date(t.deadline) < new Date();
  });

  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">My Work</h3>
        <Badge variant="secondary" className="text-xs">{myTasks.length} active</Badge>
      </div>
      <div className="space-y-2">
        {myTasks.slice(0, 5).map((task) => {
          const isOverdue = task.deadline && new Date(task.deadline) < new Date();
          return (
            <div key={task.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                {isOverdue ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                ) : task.status === "in-progress" ? (
                  <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm truncate">{task.title}</span>
              </div>
              {task.deadline && (
                <span className={`text-xs shrink-0 ml-2 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {overdue.length > 0 && (
        <p className="text-xs text-destructive font-medium">{overdue.length} overdue task{overdue.length > 1 ? "s" : ""}</p>
      )}
    </div>
  );
};

export default MyWork;
