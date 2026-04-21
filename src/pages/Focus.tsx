import { useState } from "react";
import { Target, ClipboardList, PenLine, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import PriorityCard from "@/components/PriorityCard";
import CreatePriorityModal from "@/components/CreatePriorityModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { severityConfig } from "@/data/focus";
import { useTaskContext } from "@/contexts/TaskContext";
import { usePriorities } from "@/hooks/usePriorities";
import { useAuth } from "@/contexts/AuthContext";

const Focus = () => {
  const { role } = useAuth();
  const [viewMode, setViewMode] = useState<"founder" | "manager">("founder");
  const [showLower, setShowLower] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionText, setDecisionText] = useState("");
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const { getTasksByIssue } = useTaskContext();
  const { priorities, loading, createPriority } = usePriorities();

  const isFounderOrMfo = role === "founder" || role === "mfo";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Here's where you win this week</h1>
            <p className="text-sm text-muted-foreground">Based on risk, growth impact, and urgency</p>
          </div>
          <div className="flex items-center gap-3">
            {isFounderOrMfo && <CreatePriorityModal onSubmit={createPriority} />}
            <div className="flex items-center rounded-full border border-border/60 p-0.5 bg-muted/40">
              <button
                onClick={() => setViewMode("founder")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  viewMode === "founder" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Founder View
              </button>
              <button
                onClick={() => setViewMode("manager")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  viewMode === "manager" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Manager View
              </button>
            </div>
          </div>
        </div>

        {/* Quick Action Bar */}
        <div className="flex gap-2.5 mb-10 overflow-x-auto pb-1">
          <Button size="sm" variant="outline" className="active:scale-[0.97] transition-transform duration-100" onClick={() => toast.info("Use the Create Task button on each priority card")}>
            <Target className="h-3.5 w-3.5 mr-1.5" />
            Assign Task
          </Button>
          <Button size="sm" variant="outline" className="active:scale-[0.97] transition-transform duration-100" onClick={() => setDecisionOpen(true)}>
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
            Add Decision
          </Button>
          <Button size="sm" variant="outline" className="active:scale-[0.97] transition-transform duration-100" onClick={() => setUpdateOpen(true)}>
            <PenLine className="h-3.5 w-3.5 mr-1.5" />
            Log Update
          </Button>
        </div>

        {/* Top Priorities */}
        <section className="mb-12">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">Top Priorities</h2>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : priorities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
              <p className="text-sm text-muted-foreground mb-3">No priorities yet</p>
              {isFounderOrMfo && <CreatePriorityModal onSubmit={createPriority} />}
            </div>
          ) : (
            <div className="space-y-5">
              {priorities.map((p, i) => {
                const linkedTasks = getTasksByIssue(p.id);
                return <PriorityCard key={p.id} priority={p} index={i} linkedTasks={linkedTasks} />;
              })}
            </div>
          )}
        </section>

        {/* Everything Else */}
        <section className="mb-12">
          <button
            onClick={() => setShowLower(!showLower)}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 hover:text-foreground transition-colors duration-150"
          >
            Everything Else
            {showLower ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showLower && (
            <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              {priorities.filter((p) => p.severity === "monitor").length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">No lower-priority items right now.</p>
              ) : (
                priorities.filter((p) => p.severity === "monitor").map((lp) => {
                  const cfg = severityConfig[lp.severity as keyof typeof severityConfig];
                  return (
                    <div key={lp.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-card px-5 py-4 transition-all duration-150 hover:border-border/60 hover:shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-xs">{cfg?.icon}</span>
                        <div>
                          <p className="text-sm font-medium">{lp.startupName} — <span className="text-muted-foreground">{lp.tag}</span></p>
                          <p className="text-xs text-muted-foreground mt-0.5">{lp.problem}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{lp.owner}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>

        {/* Manager View: in-progress priorities as activity */}
        {viewMode === "manager" && (
          <section className="mb-12 animate-in fade-in-0 duration-200">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">In Progress</h2>
            <div className="space-y-1">
              {priorities.filter((p) => p.executionStatus === "in-progress").length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">No items currently in progress.</p>
              ) : (
                priorities.filter((p) => p.executionStatus === "in-progress").map((p) => (
                  <div key={p.id} className="flex items-start gap-4 rounded-xl px-5 py-4 transition-colors duration-150 hover:bg-muted/40">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-semibold">{(p.owner ?? "?").charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">{p.owner ?? "Unassigned"}</span>
                        <span className="text-xs text-muted-foreground">· {p.startupName}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{p.problem}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0 mt-0.5">{p.deadlineIn}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* Decision Modal */}
      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log Decision</DialogTitle></DialogHeader>
          <Textarea placeholder="What was decided?" value={decisionText} onChange={(e) => setDecisionText(e.target.value)} className="resize-none" rows={4} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionOpen(false)}>Cancel</Button>
            <Button disabled={!decisionText.trim()} onClick={() => { toast.success("Decision logged"); setDecisionText(""); setDecisionOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Modal */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log Update</DialogTitle></DialogHeader>
          <Textarea placeholder="What's the latest?" value={updateText} onChange={(e) => setUpdateText(e.target.value)} className="resize-none" rows={4} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateOpen(false)}>Cancel</Button>
            <Button disabled={!updateText.trim()} onClick={() => { toast.success("Update logged"); setUpdateText(""); setUpdateOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Focus;
