import { Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskContext } from "@/contexts/TaskContext";
import type { Task, TaskStatus } from "@/data/tasks";
import { taskStatusConfig } from "@/data/tasks";
import { toast } from "sonner";

const TaskCard = ({ task }: { task: Task }) => {
  const { updateTaskStatus } = useTaskContext();
  const cfg = taskStatusConfig[task.status];

  const cycleStatus = () => {
    const next: Record<TaskStatus, TaskStatus> = { pending: "in-progress", "in-progress": "completed", blocked: "in-progress", completed: "pending" };
    const newStatus = next[task.status];
    updateTaskStatus(task.id, newStatus);
    toast.success(`Task: ${taskStatusConfig[newStatus].label}`);
  };

  return (
    <div className={cn(
      "flex items-start justify-between gap-3 rounded-xl border border-border/40 bg-card px-4 py-3 transition-all duration-150 hover:border-border/60",
      task.status === "completed" && "opacity-50"
    )}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{task.assignee}</span>
          {task.deadline && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{task.deadline}</span>}
        </div>
      </div>
      <button
        onClick={cycleStatus}
        className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-muted/60 flex-shrink-0", cfg.color)}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
        {cfg.label}
      </button>
    </div>
  );
};

export default TaskCard;
