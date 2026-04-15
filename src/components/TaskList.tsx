import TaskCard from "@/components/TaskCard";
import type { Task } from "@/data/tasks";

const TaskList = ({ tasks, title }: { tasks: Task[]; title?: string }) => {
  const completed = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;

  if (total === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        {title && <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</h3>}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{completed}/{total} completed</span>
          <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
};

export default TaskList;
