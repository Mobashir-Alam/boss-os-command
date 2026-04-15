import { useTaskContext } from "@/contexts/TaskContext";

const ActivityTimeline = ({ startupId }: { startupId: string }) => {
  const { activityLog } = useTaskContext();
  const entries = activityLog.filter((e) => e.startupId === startupId).slice(0, 10);

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground py-3">No activity yet.</p>;
  }

  return (
    <div className="relative pl-4">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="relative flex items-start gap-3">
            <div className="absolute left-[-12px] top-1.5 h-2 w-2 rounded-full bg-muted-foreground/50" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground/80">{entry.action}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{entry.actor} · {entry.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityTimeline;
