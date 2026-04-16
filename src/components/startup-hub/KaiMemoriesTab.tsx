import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKaiMemories } from "@/hooks/useStartupHub";
import { Brain, Plus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const categoryColors: Record<string, string> = {
  preference: "bg-purple-500/10 text-purple-500",
  target: "bg-blue-500/10 text-blue-500",
  context: "bg-amber-500/10 text-amber-500",
};

export default function KaiMemoriesTab({ startupId }: { startupId: string }) {
  const { memories, loading, add, remove } = useKaiMemories(startupId);
  const [adding, setAdding] = useState(false);
  const [memory, setMemory] = useState("");
  const [category, setCategory] = useState("context");

  const handleAdd = () => {
    if (!memory.trim()) return;
    add.mutate({ memory: memory.trim(), category });
    setMemory("");
    setCategory("context");
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">KAI Memories</h3>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setAdding(!adding)}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      {adding && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <Textarea placeholder="What should KAI remember about this startup?" value={memory} onChange={(e) => setMemory(e.target.value)} rows={2} />
          <div className="flex items-center gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="text-xs w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="preference">Preference</SelectItem>
                <SelectItem value="target">Target</SelectItem>
                <SelectItem value="context">Context</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAdd} disabled={add.isPending || !memory.trim()}>
              {add.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Save
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : memories.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          <Brain className="h-5 w-5 mx-auto mb-2 opacity-40" />
          No memories stored yet
        </div>
      ) : (
        <div className="space-y-2">
          {memories.map((m) => (
            <div key={m.id} className="rounded-xl border border-border/50 bg-card p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm">{m.memory}</p>
                <span className={cn("inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full", categoryColors[m.category] || categoryColors.context)}>
                  {m.category}
                </span>
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
