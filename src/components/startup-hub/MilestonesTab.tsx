import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStartupMilestones } from "@/hooks/useStartupHub";
import { Target, Plus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const statusIcon: Record<string, string> = {
  pending: "bg-muted-foreground",
  "in-progress": "bg-blue-500",
  done: "bg-emerald-500",
};

export default function MilestonesTab({ startupId }: { startupId: string }) {
  const { milestones, loading, add, toggleStatus, remove } = useStartupMilestones(startupId);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");

  const done = milestones.filter((m) => m.status === "done").length;
  const total = milestones.length;

  const handleAdd = () => {
    if (!title.trim()) return;
    add.mutate({ title: title.trim(), deadline: deadline || undefined });
    setTitle("");
    setDeadline("");
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Milestones</h3>
          {total > 0 && <span className="text-xs text-muted-foreground">{done}/{total} done</span>}
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setAdding(!adding)}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      {total > 0 && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}

      {adding && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <Input placeholder="Milestone title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="text-xs" />
          <Button size="sm" onClick={handleAdd} disabled={add.isPending || !title.trim()}>
            {add.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Save
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : milestones.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          <Target className="h-5 w-5 mx-auto mb-2 opacity-40" />
          No milestones yet
        </div>
      ) : (
        <div className="space-y-2">
          {milestones.map((m) => (
            <div key={m.id} className="rounded-xl border border-border/50 bg-card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => toggleStatus.mutate({ id: m.id, status: m.status })} className="shrink-0">
                  <span className={cn("block h-3 w-3 rounded-full border-2 transition-colors", m.status === "done" ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground")} />
                </button>
                <div className="min-w-0">
                  <p className={cn("text-sm font-medium", m.status === "done" && "line-through text-muted-foreground")}>{m.title}</p>
                  {m.deadline && <p className="text-[10px] text-muted-foreground">Due: {m.deadline}</p>}
                </div>
              </div>
              <button onClick={() => remove.mutate(m.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
