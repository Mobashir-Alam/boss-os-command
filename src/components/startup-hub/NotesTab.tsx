import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStartupNotes } from "@/hooks/useStartupHub";
import { StickyNote, Plus, X, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function NotesTab({ startupId }: { startupId: string }) {
  const { notes, loading, add, remove } = useStartupNotes(startupId);
  const [adding, setAdding] = useState(false);
  const [content, setContent] = useState("");

  const handleAdd = () => {
    if (!content.trim()) return;
    add.mutate(content.trim());
    setContent("");
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notes</h3>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setAdding(!adding)}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      {adding && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <Textarea placeholder="Quick note..." value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
          <Button size="sm" onClick={handleAdd} disabled={add.isPending || !content.trim()}>
            {add.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Save Note
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          <StickyNote className="h-5 w-5 mx-auto mb-2 opacity-40" />
          No notes yet
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-border/50 bg-card p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                <p className="text-[10px] text-muted-foreground mt-2">{format(new Date(n.created_at), "MMM d, yyyy · h:mm a")}</p>
              </div>
              <button onClick={() => remove.mutate(n.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
