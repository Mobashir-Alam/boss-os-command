import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePriorities } from "@/hooks/usePriorities";
import { Plus, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const severityColors: Record<string, string> = {
  critical: "text-red-500",
  urgent: "text-orange-500",
  monitor: "text-yellow-500",
};

const statusDot: Record<string, string> = {
  pending: "bg-muted-foreground",
  "in-progress": "bg-blue-500",
  resolved: "bg-emerald-500",
};

export default function PrioritiesTab({ startupId, startupName }: { startupId: string; startupName: string }) {
  const { priorities, loading, createPriority, updateStatus } = usePriorities();
  const filtered = priorities.filter((p) => p.startupId === startupId);

  const [adding, setAdding] = useState(false);
  const [problem, setProblem] = useState("");
  const [severity, setSeverity] = useState("monitor");
  const [owner, setOwner] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!problem.trim()) return;
    setSubmitting(true);
    await createPriority({
      startupId,
      startupName,
      tag: "",
      severity: severity as any,
      problem: problem.trim(),
      why: "",
      impact: "",
      impactLevel: "Medium",
      owner: owner || null,
      mfoSuggestion: "",
      deadlineIn: deadline,
    });
    setProblem("");
    setSeverity("monitor");
    setOwner("");
    setDeadline("");
    setAdding(false);
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Priorities</h3>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setAdding(!adding)}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      {adding && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <Input placeholder="What's the priority?" value={problem} onChange={(e) => setProblem(e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="monitor">Monitor</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} className="text-xs" />
            <Input placeholder="Deadline (e.g. 3 days)" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="text-xs" />
          </div>
          <Button size="sm" onClick={handleAdd} disabled={submitting || !problem.trim()}>
            {submitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Save Priority
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          <AlertTriangle className="h-5 w-5 mx-auto mb-2 opacity-40" />
          No priorities yet
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-xl border border-border/50 bg-card p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", severityColors[p.severity])}>{p.problem}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {p.owner && <span>Owner: {p.owner}</span>}
                  {p.deadlineIn && <span>Due: {p.deadlineIn}</span>}
                </div>
              </div>
              <button
                onClick={() => {
                  const next: Record<string, string> = { pending: "in-progress", "in-progress": "resolved", resolved: "pending" };
                  updateStatus(p.id, (next[p.executionStatus] || "pending") as any);
                }}
                className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground shrink-0"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[p.executionStatus] || "bg-muted-foreground")} />
                {p.executionStatus}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
