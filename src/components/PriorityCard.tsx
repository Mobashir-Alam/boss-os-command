import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, StickyNote, CalendarClock, ExternalLink, CheckCheck, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import type { FocusPriority } from "@/data/focus";
import { severityConfig } from "@/data/focus";

interface PriorityCardProps {
  priority: FocusPriority;
  index: number;
}

const PriorityCard = ({ priority, index }: PriorityCardProps) => {
  const navigate = useNavigate();
  const config = severityConfig[priority.severity];
  const [assignee, setAssignee] = useState(priority.owner || "");
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [deadline, setDeadline] = useState<Date>();
  const [reviewed, setReviewed] = useState(false);

  const handleAssign = (value: string) => {
    setAssignee(value);
    toast.success(`Assigned to ${value}`, { description: `${priority.startupName} — ${priority.tag}` });
  };

  const handleNote = () => {
    toast.success("Note added", { description: `${priority.startupName} — ${priority.tag}` });
    setNote("");
    setNoteOpen(false);
  };

  const handleDeadline = (date: Date | undefined) => {
    setDeadline(date);
    if (date) {
      toast.success(`Deadline set: ${format(date, "PPP")}`, { description: `${priority.startupName} — ${priority.tag}` });
    }
  };

  return (
    <>
      <div
        className={cn(
          "group relative rounded-2xl border border-border/40 p-8 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border/70",
          reviewed && "opacity-60"
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
        {/* Top row: Startup + Severity */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-semibold tracking-tight">{priority.startupName}</h3>
            <span className="text-xs font-medium text-muted-foreground bg-muted/80 rounded-full px-2.5 py-0.5">
              {priority.tag}
            </span>
          </div>
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

        {/* Problem — THE HEADLINE */}
        <p className="text-lg font-semibold tracking-tight mb-3">{priority.problem}</p>

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

        {/* MFO Suggestion */}
        <div className="flex items-start gap-2 rounded-xl bg-background/60 border border-border/40 px-4 py-3 mb-6">
          <Lightbulb className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">MFO Suggested Action</p>
            <p className="text-sm font-medium">{priority.mfoSuggestion}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="default" className="active:scale-[0.97] transition-transform duration-100" onClick={() => setNoteOpen(true)}>
            <StickyNote className="h-3.5 w-3.5 mr-1.5" />
            Add Note
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="active:scale-[0.97] transition-transform duration-100">
                <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                {deadline ? format(deadline, "MMM d") : "Set Deadline"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={deadline} onSelect={handleDeadline} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="ghost" className="text-muted-foreground active:scale-[0.97] transition-transform duration-100" onClick={() => navigate(`/startup/${priority.startupId}`)}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Open Startup
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={cn("text-muted-foreground active:scale-[0.97] transition-transform duration-100", reviewed && "text-foreground")}
            onClick={() => {
              setReviewed(!reviewed);
              toast.success(reviewed ? "Marked as unreviewed" : "Marked as reviewed");
            }}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            {reviewed ? "Reviewed" : "Mark Reviewed"}
          </Button>
        </div>
      </div>

      {/* Note Modal */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Note — {priority.startupName}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Quick note, decision, or next step..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="resize-none"
            rows={4}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button onClick={handleNote} disabled={!note.trim()}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PriorityCard;
