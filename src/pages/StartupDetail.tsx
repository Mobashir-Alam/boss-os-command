import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle2, CalendarClock, BarChart3, FileText, MessageSquare, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Navbar from "@/components/Navbar";
import SparkLine from "@/components/SparkLine";
import KaiInsight from "@/components/KaiInsight";
import KaiPrediction from "@/components/KaiPrediction";
import KaiRecommendation from "@/components/KaiRecommendation";
import KaiSimulation from "@/components/KaiSimulation";
import KaiScoreCard from "@/components/KaiScoreCard";
import KaiDecision from "@/components/KaiDecision";
import AskKai from "@/components/AskKai";
import KaiSignalBadge from "@/components/KaiSignalBadge";
import TaskList from "@/components/TaskList";
import MfoUpdates from "@/components/MfoUpdates";
import ActivityTimeline from "@/components/ActivityTimeline";
import IssueTaskFlow from "@/components/IssueTaskFlow";
import ResolutionPrompt from "@/components/ResolutionPrompt";
import { statusConfig } from "@/data/startups";
import { useStartups } from "@/hooks/useStartups";
import { startupKaiData, startupSignals } from "@/data/kai";
import { assigneeOptions } from "@/data/tasks";
import { useTaskContext } from "@/contexts/TaskContext";
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
    { id: "p1-nasheedio", problem: "⚠️ Retention ↓12% this week", why: "Fewer creator uploads in last 2 weeks", impact: "Affects long-term growth", impactLevel: "High", owner: null, status: "pending", detectedAgo: "3 days ago", lastUpdated: "2 hours ago" },
    { id: "p2-nasheedio", problem: "Premium tier churn at 4.2%", why: "Pricing may not match perceived value", impact: "Revenue impact moderate", impactLevel: "Medium", owner: "CS Head", status: "in-progress", detectedAgo: "1 week ago", lastUpdated: "1 day ago" },
  ],
  gurucool: [
    { id: "p1-gurucool", problem: "⚠️ Backend role open for 21 days", why: "Low qualified applicants", impact: "Blocking API v2 launch", impactLevel: "Medium", owner: "HR Head", status: "pending", detectedAgo: "21 days ago", lastUpdated: "1 day ago" },
  ],
  "levelup-climate": [],
  "project-x": [
    { id: "p1-project-x", problem: "🔥 Runway below 3 months", why: "High burn, no funding yet", impact: "Company survival at stake", impactLevel: "High", owner: "CFO", status: "in-progress", detectedAgo: "2 weeks ago", lastUpdated: "30 min ago" },
    { id: "p2-project-x", problem: "Growth declining at -3% MoM", why: "User acquisition stalled", impact: "Weakens fundraising position", impactLevel: "High", owner: null, status: "pending", detectedAgo: "1 week ago", lastUpdated: "5 hours ago" },
  ],
};

const statusDot: Record<string, string> = {
  pending: "bg-muted-foreground",
  "in-progress": "bg-blue-500",
  done: "bg-emerald-500",
};

const StartupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { startups } = useStartups();
  const startup = startups.find((s) => s.id === id);
  const { getTasksByStartup, getTasksByIssue } = useTaskContext();

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
  const startupTasks = getTasksByStartup(startup.id);
  const kaiData = startupKaiData[startup.id];
  const startupContext = `Startup: ${startup.name}. Status: ${config.label}. Runway: ${startup.runway}. Growth: ${startup.growth}. Insight: ${startup.insight}. ${startup.insightDetail}`;
  const signal = startupSignals[startup.id];

  const completedTasks = startupTasks.filter((t) => t.status === "completed").length;
  const totalTasks = startupTasks.length;

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
              {totalTasks > 0 && (
                <span className="text-xs text-muted-foreground">{completedTasks}/{totalTasks} tasks done</span>
              )}
            </div>
            <p className="text-muted-foreground mt-1">{startup.insight}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Last updated {startup.lastUpdated}
          </div>
        </div>

        {/* KAI Signal */}
        {signal && (
          <div className="mb-8">
            <KaiSignalBadge signal={signal} />
          </div>
        )}

        {/* KAI Intelligence Block */}
        {kaiData && (
          <div className="mb-10 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">KAI Intelligence</h2>
            <KaiInsight insight={kaiData.insight} convertible />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KaiPrediction predictions={kaiData.predictions} />
              <KaiScoreCard score={kaiData.score} />
            </div>
            <KaiRecommendation recommendation={kaiData.recommendation} onAccept={() => toast.success("Recommendation accepted")} />
            <KaiSimulation simulations={kaiData.simulations} />
          </div>
        )}

        {/* Snapshot */}
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

        {/* Problems */}
        {problems.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Problems</h2>
            <div className="space-y-4">
              {problems.map((p) => (
                <ProblemCard key={p.id} problem={p} startupId={startup.id} />
              ))}
            </div>
          </section>
        )}

        {/* Tasks */}
        {startupTasks.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Tasks</h2>
            <TaskList tasks={startupTasks} />
          </section>
        )}

        {/* KAI Decision */}
        {kaiData?.decision && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">KAI Decision</h2>
            <KaiDecision decision={kaiData.decision} />
          </section>
        )}

        {/* MFO Updates */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5" />
            MFO Updates
          </h2>
          <MfoUpdates startupId={startup.id} />
        </section>

        {/* Activity Timeline */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" />
            Activity Timeline
          </h2>
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <ActivityTimeline startupId={startup.id} />
          </div>
        </section>

        {/* Ask KAI */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Ask KAI</h2>
          <AskKai startupContext={startupContext} />
        </section>

        {/* Plan placeholder */}
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
function ProblemCard({ problem, startupId }: { problem: Problem; startupId: string }) {
  const [owner, setOwner] = useState(problem.owner || "");
  const [status, setStatus] = useState(problem.status);
  const { getTasksByIssue } = useTaskContext();
  const linkedTasks = getTasksByIssue(problem.id);
  const allDone = linkedTasks.length > 0 && linkedTasks.every((t) => t.status === "completed");

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

      {/* Linked tasks */}
      {linkedTasks.length > 0 && (
        <div className="mb-4">
          <TaskList tasks={linkedTasks} />
        </div>
      )}

      {/* Resolution prompt */}
      {allDone && (
        <div className="mb-4">
          <ResolutionPrompt issueLabel={problem.problem} onResolve={() => setStatus("done")} />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <IssueTaskFlow linkedIssueId={problem.id} linkedStartupId={startupId} defaultTitle={problem.problem.replace(/[⚠️🔥]/g, "").trim()} />
        <Button size="sm" variant="ghost" className="text-xs h-7 text-emerald-600" onClick={() => { setStatus("done"); toast.success("Marked done"); }}>
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Done
        </Button>
      </div>
    </div>
  );
}

export default StartupDetail;
