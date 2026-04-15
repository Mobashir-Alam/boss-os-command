import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTaskContext } from "@/contexts/TaskContext";
import { toast } from "sonner";
import type { MfoUpdate } from "@/data/tasks";

const mfoNames = ["Alice Chen (MFO)", "Bob Kumar (MFO)", "Carol Martinez (MFO)", "Dave Singh (MFO)"];

const MfoUpdates = ({ startupId }: { startupId: string }) => {
  const { mfoUpdates, addMfoUpdate } = useTaskContext();
  const [message, setMessage] = useState("");
  const [person, setPerson] = useState(mfoNames[0]);

  const updates = mfoUpdates.filter((u) => u.startupId === startupId);

  const handleSend = () => {
    if (!message.trim()) return;
    addMfoUpdate({ startupId, person, message: message.trim() });
    toast.success("Update added");
    setMessage("");
  };

  return (
    <div>
      {/* Add update */}
      <div className="flex items-center gap-2 mb-4">
        <Select value={person} onValueChange={setPerson}>
          <SelectTrigger className="h-8 w-[160px] text-xs flex-shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mfoNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="Quick update..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="h-8 text-sm flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button size="sm" variant="default" className="h-8 px-3" onClick={handleSend} disabled={!message.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Updates feed */}
      <div className="space-y-1">
        {updates.slice(0, 8).map((u) => (
          <div key={u.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/30">
            <div className="flex-shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center">
              <span className="text-[10px] font-semibold">{u.person.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold">{u.person}</span>
                <span className="text-[10px] text-muted-foreground">{u.timestamp}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{u.message}</p>
            </div>
          </div>
        ))}
        {updates.length === 0 && (
          <p className="text-xs text-muted-foreground py-3">No MFO updates yet.</p>
        )}
      </div>
    </div>
  );
};

export default MfoUpdates;
