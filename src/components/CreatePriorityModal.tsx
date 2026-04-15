import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useStartups } from "@/hooks/useStartups";
import type { PrioritySeverity } from "@/data/focus";

interface CreatePriorityModalProps {
  onSubmit: (data: {
    startupId: string;
    startupName: string;
    tag: string;
    severity: PrioritySeverity;
    problem: string;
    why: string;
    impact: string;
    impactLevel: "High" | "Medium" | "Low";
    owner: string | null;
    mfoSuggestion: string;
    deadlineIn: string;
  }) => void;
}

const CreatePriorityModal = ({ onSubmit }: CreatePriorityModalProps) => {
  const [open, setOpen] = useState(false);
  const { startups } = useStartups();
  const [startupId, setStartupId] = useState("");
  const [tag, setTag] = useState("");
  const [severity, setSeverity] = useState<PrioritySeverity>("at-risk");
  const [problem, setProblem] = useState("");
  const [why, setWhy] = useState("");
  const [impact, setImpact] = useState("");
  const [impactLevel, setImpactLevel] = useState<"High" | "Medium" | "Low">("Medium");
  const [owner, setOwner] = useState("");
  const [mfoSuggestion, setMfoSuggestion] = useState("");
  const [deadlineIn, setDeadlineIn] = useState("");

  const selectedStartup = startups.find(s => s.id === startupId);

  const reset = () => {
    setStartupId("");
    setTag("");
    setSeverity("at-risk");
    setProblem("");
    setWhy("");
    setImpact("");
    setImpactLevel("Medium");
    setOwner("");
    setMfoSuggestion("");
    setDeadlineIn("");
  };

  const handleSubmit = () => {
    if (!startupId || !problem) return;
    onSubmit({
      startupId,
      startupName: selectedStartup?.name || startupId,
      tag,
      severity,
      problem,
      why,
      impact,
      impactLevel,
      owner: owner || null,
      mfoSuggestion,
      deadlineIn,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Priority
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Priority</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Startup *</label>
              <Select value={startupId} onValueChange={setStartupId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select startup" />
                </SelectTrigger>
                <SelectContent>
                  {startups.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Severity</label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as PrioritySeverity)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">🔴 Critical</SelectItem>
                  <SelectItem value="at-risk">🟡 At Risk</SelectItem>
                  <SelectItem value="monitor">🟢 Monitor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Problem *</label>
            <Input placeholder="e.g. Retention ↓12% this week" value={problem} onChange={e => setProblem(e.target.value)} className="h-9 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tag</label>
              <Input placeholder="e.g. Retention Drop" value={tag} onChange={e => setTag(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Owner</label>
              <Input placeholder="e.g. CFO" value={owner} onChange={e => setOwner(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Why is this happening?</label>
            <Textarea placeholder="Root cause analysis" value={why} onChange={e => setWhy(e.target.value)} rows={2} className="resize-none text-sm" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Impact</label>
              <Input placeholder="What's at risk?" value={impact} onChange={e => setImpact(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Level</label>
              <Select value={impactLevel} onValueChange={(v) => setImpactLevel(v as "High" | "Medium" | "Low")}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Suggested Action</label>
            <Input placeholder="What should be done?" value={mfoSuggestion} onChange={e => setMfoSuggestion(e.target.value)} className="h-9 text-sm" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Deadline</label>
            <Input placeholder="e.g. 3 days, 1 week" value={deadlineIn} onChange={e => setDeadlineIn(e.target.value)} className="h-9 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!startupId || !problem.trim()} onClick={handleSubmit}>Create Priority</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePriorityModal;
