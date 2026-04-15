import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, ExternalLink, Lightbulb, CheckCircle2, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import KaiInsight from "@/components/KaiInsight";
import KaiPrediction from "@/components/KaiPrediction";
import KaiRecommendation from "@/components/KaiRecommendation";
import KaiSimulation from "@/components/KaiSimulation";
import KaiScoreCard from "@/components/KaiScoreCard";
import type { FocusPriority, ExecutionStatus } from "@/data/focus";
import { severityConfig } from "@/data/focus";
import { focusKaiData } from "@/data/kai";

interface PriorityCardProps {
  priority: FocusPriority;
  index: number;
}

const executionStatusConfig: Record<ExecutionStatus, { label: string; color: string; dot: string }> = {
  pending: { label: "Pending", color: "text-muted-foreground", dot: "bg-muted-foreground" },
  "in-progress": { label: "In Progress", color: "text-blue-500", dot: "bg-blue-500" },
  done: { label: "Done", color: "text-emerald-500", dot: "bg-emerald-500" },
};

const PriorityCard = ({ priority, index }: PriorityCardProps) => {
  const navigate = useNavigate();
  const config = severityConfig[priority.severity];
  const [assignee, setAssignee] = useState(priority.owner || "");
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [deadline, setDeadline] = useState<Date>();
  const [status, setStatus] = useState<ExecutionStatus>(priority.executionStatus);
  const [dismissed, setDismissed] = useState(false);

  const statusCfg = executionStatusConfig[status];
  const kaiData = focusKaiData[priority.id];

  const handleAssign = (value: string) => {
    setAssignee(value);
    toast.success(`Assigned to ${value}`, { description: `${priority.startupName} — ${priority.tag}` });
  };

  const handleSaveNote = () => {
    if (!note.trim()) return;
    toast.success("Note added", { description: `${priority.startupName} — ${priority.tag}` });
    setNote("");
    setNoteExpanded(false);
  };

  const cycleStatus = () => {
    const next: Record<ExecutionStatus, ExecutionStatus> = { pending: "in-progress", "in-progress": "done", done: "pending" };
    const newStatus = next[status];
    setStatus(newStatus);
    toast.success(`Status: ${executionStatusConfig[newStatus].label}`);
  };

  const handleAcceptSuggestion = () => {
    toast.success("Suggestion accepted as task", { description: priority.mfoSuggestion });
  };

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-border/40 p-8 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border/70",
        status === "done" && "opacity-50"
      )}
      style={{
        backgroundColor: config.bg,
        borderLeftWidth: "4px",
        borderLeftColor: config.color,
        boxShadow: `0 1px 3px hsl(0 0% 0% / 0.03), 0 4px 16px hsl(0 0% 0% / 0.03)`,
        animationDelay: `${index * 100}ms`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 24px hsl(0 0% 0% / 0.07), ${config.glow}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 1px 3px hsl(0 0% 0% / 0.03), 0 4px 16px hsl(0 0% 0% / 0.03)`;
      }}
    >
      {/* Rank Badge */}
      <div
        className="absolute -top-3 -left-3 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
        style={{ backgroundColor: config.color }}
      >
        #{priority.rank}
      </div>

      {/* Top row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-semibold tracking-tight">{priority.startupName}</h3>
          <span className="text-xs font-medium text-muted-foreground bg-muted/80 rounded-full px-2.5 py-0.5">
            {priority.tag}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={cycleStatus}
            className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-muted/60", statusCfg.color)}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
            {statusCfg.label}
          </button>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
              priority.severity === "critical" && "animate-pulse"
            )}
            style={{ color: config.color }}
          >
            <span className="text-xs">{config.icon}</span>
            {config.label}
          </span>
        </div>
      </div>

      <p className="text-lg font-semibold tracking-tight mb-2">{priority.problem}</p>

      {/* Time pressure */}
      <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Detected {priority.detectedAgo}
        </span>
        <span className={cn(
          "flex items-center gap-1 font-medium",
          priority.deadlineIn.toLowerCase().includes("overdue") ? "text-destructive" : ""
        )}>
          ⏰ Deadline: {priority.deadlineIn}
        </span>
      </div>

      {/* Why + Impact */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 mb-4 text-sm text-muted-foreground">
        <p><span className="font-medium text-foreground/70">Why:</span> {priority.why}</p>
        <p><span className="font-medium text-foreground/70">Impact:</span> <span className={priority.impactLevel === "High" ? "font-semibold" : ""} style={priority.impactLevel === "High" ? { color: config.color } : undefined}>{priority.impactLevel}</span> — {priority.impact}</p>
      </div>

      {/* Owner */}
      <div className="flex items-center gap-2 mb-5 text-sm">
        <span className="text-muted-foreground">Owner:</span>
        <Select value={assignee} onValueChange={handleAssign}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HR Head">HR Head</SelectItem>
            <SelectItem value="CFO">CFO</SelectItem>
            <SelectItem value="CTO">CTO</SelectItem>
            <SelectItem value="Alice Chen">Alice Chen (MFO)</SelectItem>
            <SelectItem value="Bob Kumar">Bob Kumar (MFO)</SelectItem>
            <SelectItem value="Carol Martinez">Carol Martinez (MFO)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KAI Engine Block */}
      {kaiData && (
        <div className="mb-5 space-y-3">
          <KaiInsight insight={kaiData.insight} convertible compact />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <KaiPrediction predictions={kaiData.predictions} />
            <KaiScoreCard score={kaiData.score} />
          </div>
          <KaiRecommendation recommendation={kaiData.recommendation} onAccept={() => toast.success("Recommendation accepted as task")} />
          <KaiSimulation simulations={kaiData.simulations} />
        </div>
      )}

      {/* MFO Suggestion */}
      <div className="flex items-start gap-2 rounded-xl bg-background/60 border border-border/40 px-4 py-3 mb-5">
        <Lightbulb className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">MFO Suggested Action</p>
            <span className={cn(
              "text-[10px] font-medium rounded-full px-2 py-0.5",
              priority.mfoConfidence === "High" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
            )}>
              {priority.mfoConfidence} confidence
            </span>
          </div>
          <p className="text-sm font-medium">{priority.mfoSuggestion}</p>
        </div>
        <Button size="sm" variant="outline" className="text-xs h-7 flex-shrink-0" onClick={handleAcceptSuggestion}>
          Accept
        </Button>
      </div>

      {/* Inline Note */}
      {noteExpanded && (
        <div className="mb-5 animate-in fade-in-0 slide-in-from-top-2 duration-150">
          <Textarea
            placeholder="Quick note, decision, or next step..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="resize-none mb-2 text-sm"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveNote} disabled={!note.trim()}>Save Note</Button>
            <Button size="sm" variant="ghost" onClick={() => { setNoteExpanded(false); setNote(""); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {!noteExpanded && (
          <Button size="sm" variant="default" className="active:scale-[0.97] transition-transform duration-100" onClick={() => setNoteExpanded(true)}>
            Add Note
          </Button>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="active:scale-[0.97] transition-transform duration-100">
              <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
              {deadline ? format(deadline, "MMM d") : "Set Deadline"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={deadline} onSelect={(d) => { if (d) { setDeadline(d); toast.success(`Deadline: ${format(d, "PPP")}`); } }} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <Button size="sm" variant="ghost" className="text-muted-foreground active:scale-[0.97] transition-transform duration-100" onClick={() => navigate(`/startup/${priority.startupId}`)}>
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Open
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-emerald-600 active:scale-[0.97] transition-transform duration-100"
          onClick={() => { setStatus("done"); toast.success("Marked as done"); }}
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          Done
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground active:scale-[0.97] transition-transform duration-100"
          onClick={() => { setDismissed(true); toast("Dismissed", { description: priority.tag }); }}
        >
          <X className="h-3.5 w-3.5 mr-1.5" />
          Ignore
        </Button>
      </div>
    </div>
  );
};

export default PriorityCard;
