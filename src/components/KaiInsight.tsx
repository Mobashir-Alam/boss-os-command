import { useState } from "react";
import { Zap, ArrowRight, UserPlus, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";

interface KaiInsightProps {
  insight: string;
  convertible?: boolean;
  compact?: boolean;
}

const KaiInsight = ({ insight, convertible = false, compact = false }: KaiInsightProps) => {
  const [showActions, setShowActions] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [deadline, setDeadline] = useState<Date>();

  const handleConvert = () => {
    toast.success("KAI insight converted to task", {
      description: assignee ? `Assigned to ${assignee}` : "Unassigned",
    });
    setShowActions(false);
    setAssignee("");
    setDeadline(undefined);
  };

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3 transition-all duration-150">
      <div className="flex items-start gap-2.5">
        <div className="flex items-center justify-center h-5 w-5 rounded-md bg-foreground/5 flex-shrink-0 mt-0.5">
          <Zap className="h-3 w-3 text-foreground/60" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">KAI</p>
          <p className={`text-sm font-medium leading-relaxed ${compact ? "line-clamp-2" : ""}`}>
            {insight}
          </p>

          {convertible && !showActions && (
            <button
              onClick={() => setShowActions(true)}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Convert to task <ArrowRight className="h-3 w-3" />
            </button>
          )}

          {showActions && (
            <div className="mt-3 flex flex-wrap items-center gap-2 animate-in fade-in-0 duration-150">
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="h-7 w-[140px] text-xs">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HR Head">HR Head</SelectItem>
                  <SelectItem value="CFO">CFO</SelectItem>
                  <SelectItem value="CTO">CTO</SelectItem>
                  <SelectItem value="Alice Chen">Alice Chen (MFO)</SelectItem>
                  <SelectItem value="Bob Kumar">Bob Kumar (MFO)</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    <CalendarClock className="h-3 w-3 mr-1" />
                    {deadline ? format(deadline, "MMM d") : "Deadline"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={deadline} onSelect={(d) => d && setDeadline(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Button size="sm" className="h-7 text-xs" onClick={handleConvert}>
                Create Task
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowActions(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KaiInsight;
