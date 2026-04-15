import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle2, CalendarClock, ExternalLink, User, BarChart3, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Navbar from "@/components/Navbar";
import SparkLine from "@/components/SparkLine";
import { startups, statusConfig } from "@/data/startups";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface Problem {
  id: string;
  problem: string;
  why: string;
  impact: string;
  impactLevel: "High" | "Medium" | "Low";
  owner: string | null;
  status: "pending" | "in-progress" | "done";
  detectedAgo: string;
  lastUpdated: string;
}

const startupProblems: Record<string, Problem[]> = {
  nasheedio: [
    { id: "p1", problem: "⚠️ Retention ↓12% this week", why: "Fewer creator uploads in last 2 weeks", impact: "Affects long-term growth", impactLevel: "High", owner: null, status: "pending", detectedAgo: "3 days ago", lastUpdated: "2 hours ago" },
    { id: "p2", problem: "Premium tier churn at 4.2%", why: "Pricing may not match perceived value", impact: "Revenue impact moderate", impactLevel: "Medium", owner: "CS Head", status: "in-progress", detectedAgo: "1 week ago", lastUpdated: "1 day ago" },
  ],
  gurucool: [
    { id: "p1", problem: "⚠️ Backend role open for 21 days", why: "Low qualified applicants", impact: "Blocking API v2 launch", impactLevel: "Medium", owner: "HR Head", status: "pending", detectedAgo: "21 days ago", lastUpdated: "1 day ago" },
  ],
  "levelup-climate": [],
  "project-x": [
    { id: "p1", problem: "🔥 Runway below 3 months", why: "High burn, no funding yet", impact: "Company survival at stake", impactLevel: "High", owner: "CFO", status: "in-progress", detectedAgo: "2 weeks ago", lastUpdated: "30 min ago" },
    { id: "p2", problem: "Growth declining at -3% MoM", why: "User acquisition stalled", impact: "Weakens fundraising position", impactLevel: "High", owner: null, status: "pending", detectedAgo: "1 week ago", lastUpdated: "5 hours ago" },
  ],
};

const nextDecisions: Record<string, { question: string; context: string }> = {
  nasheedio: { question: "Should we invest in creator incentives to reverse retention?", context: "Creator uploads dropped 18% — incentives could cost $5K/mo but may recover 30% of churned creators." },
  gurucool: { question: "Should we use a recruiting agency for the backend role?", context: "Role has been open 21 days. Agency fee ~20% of salary but could fill in 1–2 weeks." },
  "levelup-climate": { question: "Should we expand to a second cohort market?", context: "Current cohort performing well at +18% growth. New market could 2x TAM but requires $40K investment." },
  "project-x": { question: "Should we pursue bridge funding or cut burn?", context: "Series A delayed. Bridge would extend runway 3 months. Cutting burn means pausing hiring." },
};

const statusDot: Record<string, string> = {
  pending: "bg-muted-foreground",
  "in-progress": "bg-blue-500",
  done: "bg-emerald-500",
};

const StartupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const startup = startups.find((s) => s.id === id);

  if (!startup) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-7xl px-6 py-16 text-center">
          <p className="text-muted-foreground">Startup not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>Go back</Button>
        </main>
      </div>
    );
  }

  const config = statusConfig[startup.status];
  const problems = startupProblems[startup.id] || [];
  const decision = nextDecisions[startup.id];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{startup.name}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: config.bg, color: config.color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.color }} />
                {config.label}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">{startup.insight}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Last updated {startup.lastUpdated}
          </div>
        </div>

        {/* 1. Snapshot */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Snapshot</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Runway", value: startup.runway },
              { label: "Growth", value: startup.growth },
              { label: "Status", value: config.label },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-border/60 bg-card p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
                <p className="text-2xl font-bold">{m.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-5 mt-4">
            <div className="flex items-center gap-4">
              <SparkLine data={startup.sparkData} color={config.color} width={200} height={40} />
              <div>
                <p className="text-sm font-medium">{startup.insightTrend}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{startup.insightDetail}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Problems */}
        {problems.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Problems</h2>
            <div className="space-y-4">
              {problems.map((p) => (
                <ProblemCard key={p.id} problem={p} />
              ))}
            </div>
          </section>
        )}

        {/* 3. Next Decision */}
        {decision && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Next Decision</h2>
            <div className="rounded-xl border border-border/60 bg-card p-6">
              <p className="text-lg font-semibold tracking-tight mb-2">{decision.question}</p>
              <p className="text-sm text-muted-foreground mb-5">{decision.context}</p>
              <div className="flex gap-2.5">
                <Button size="sm" variant="outline" onClick={() => toast.info("Opening data review...")}>
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  Review Data
                </Button>
                <Button size="sm" onClick={() => toast.success("Decision recorded")}>
                  Decide
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* 4. People (placeholder) */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">People</h2>
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Team members and roles will appear here</span>
            </div>
          </div>
        </section>

        {/* 5. Progress (placeholder) */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Progress</h2>
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span>Milestone timeline and progress tracking will appear here</span>
            </div>
          </div>
        </section>

        {/* 6. Plan (placeholder) */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Plan</h2>
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Strategic plan and OKRs will appear here</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

/* --- Problem Card sub-component --- */
function ProblemCard({ problem }: { problem: Problem }) {
  const [owner, setOwner] = useState(problem.owner || "");
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState(problem.status);
  const [deadline, setDeadline] = useState<Date>();

  const dotClass = statusDot[status];

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 transition-all duration-150 hover:border-border/70 hover:shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <p className="text-base font-semibold">{problem.problem}</p>
        <button
          onClick={() => {
            const next: Record<string, string> = { pending: "in-progress", "in-progress": "done", done: "pending" };
            const n = next[status] as typeof status;
            setStatus(n);
            toast.success(`Status: ${n}`);
          }}
          className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
          {status === "pending" ? "Pending" : status === "in-progress" ? "In Progress" : "Done"}
        </button>
      </div>

      <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
        <span>Detected {problem.detectedAgo}</span>
        <span>Updated {problem.lastUpdated}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 mb-4 text-sm text-muted-foreground">
        <p><span className="font-medium text-foreground/70">Why:</span> {problem.why}</p>
        <p><span className="font-medium text-foreground/70">Impact:</span> {problem.impactLevel} — {problem.impact}</p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-muted-foreground">Owner:</span>
        <Select value={owner} onValueChange={(v) => { setOwner(v); toast.success(`Assigned to ${v}`); }}>
          <SelectTrigger className="h-7 w-[160px] text-xs">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HR Head">HR Head</SelectItem>
            <SelectItem value="CFO">CFO</SelectItem>
            <SelectItem value="CTO">CTO</SelectItem>
            <SelectItem value="CS Head">CS Head</SelectItem>
            <SelectItem value="Product Lead">Product Lead</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {noteOpen && (
        <div className="mb-4 animate-in fade-in-0 duration-150">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Quick note..." className="resize-none text-sm mb-2" rows={2} autoFocus />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { toast.success("Note saved"); setNote(""); setNoteOpen(false); }} disabled={!note.trim()}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setNoteOpen(false); setNote(""); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!noteOpen && (
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setNoteOpen(true)}>Add Note</Button>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="text-xs h-7">
              <CalendarClock className="h-3 w-3 mr-1" />
              {deadline ? format(deadline, "MMM d") : "Deadline"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={deadline} onSelect={(d) => { if (d) { setDeadline(d); toast.success(`Deadline: ${format(d, "PPP")}`); } }} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <Button size="sm" variant="ghost" className="text-xs h-7 text-emerald-600" onClick={() => { setStatus("done"); toast.success("Marked done"); }}>
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Done
        </Button>
      </div>
    </div>
  );
}

export default StartupDetail;
