import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import type { Startup } from "@/data/startups";

interface FixModalProps {
  startup: Startup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FixModal = ({ startup, open, onOpenChange }: FixModalProps) => {
  const [assignee, setAssignee] = useState("");
  const [note, setNote] = useState("");
  const [deadline, setDeadline] = useState<Date>();

  const handleSubmit = () => {
    toast.success(`Action created for ${startup?.name}`, {
      description: `Assigned to ${assignee || "Unassigned"} — due ${deadline ? format(deadline, "PPP") : "No deadline"}`,
    });
    setAssignee("");
    setNote("");
    setDeadline(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Fix — {startup?.name}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{startup?.insight}</p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Assign to</label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alice">Alice Chen</SelectItem>
                <SelectItem value="bob">Bob Kumar</SelectItem>
                <SelectItem value="carol">Carol Martinez</SelectItem>
                <SelectItem value="dave">Dave Singh</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Note</label>
            <Textarea
              placeholder="Add context or next steps..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Deadline</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "PPP") : "Set deadline"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Action</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FixModal;
