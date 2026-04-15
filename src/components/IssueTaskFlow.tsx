import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTaskContext } from "@/contexts/TaskContext";
import { assigneeOptions } from "@/data/tasks";

interface IssueTaskFlowProps {
  linkedIssueId: string;
  linkedStartupId: string;
  defaultTitle?: string;
  onCreated?: () => void;
}

const IssueTaskFlow = ({ linkedIssueId, linkedStartupId, defaultTitle, onCreated }: IssueTaskFlowProps) => {
  const { createTask } = useTaskContext();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(defaultTitle || "");
  const [assignee, setAssignee] = useState("");
  const [instructions, setInstructions] = useState("");
  const [deadline, setDeadline] = useState<Date>();

  const handleCreate = () => {
    if (!assignee) {
      toast.error("Owner is required");
      return;
    }
    createTask({
      title: title || "Untitled task",
      linkedIssueId,
      linkedStartupId,
      assignee,
      status: "pending",
      deadline: deadline ? format(deadline, "MMM d, yyyy") : null,
      instructions,
    });
    toast.success("Task created", { description: `Assigned to ${assignee}` });
    setTitle("");
    setAssignee("");
    setInstructions("");
    setDeadline(undefined);
    setExpanded(false);
    onCreated?.();
  };

  if (!expanded) {
    return (
      <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => setExpanded(true)}>
        <Plus className="h-3.5 w-3.5" />
        Create Task
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-150">
      <Input
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-8 text-sm"
      />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground flex-shrink-0">Owner *</span>
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="Assign owner" />
          </SelectTrigger>
          <SelectContent>
            {assigneeOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Textarea
        placeholder="Instructions (optional)"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        className="resize-none text-sm"
        rows={2}
      />
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="text-xs h-8 gap-1">
              <CalendarClock className="h-3 w-3" />
              {deadline ? format(deadline, "MMM d") : "Set Deadline"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleCreate} disabled={!assignee}>Create Task</Button>
        <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>Cancel</Button>
      </div>
    </div>
  );
};

export default IssueTaskFlow;
