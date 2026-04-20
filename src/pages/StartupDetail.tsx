import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Clock, CheckCircle2, MessageSquare, Activity, PieChart,
  AlertTriangle, Users, Brain, FolderOpen, StickyNote, Target, Contact,
  DollarSign, Gauge, TrendingUp, Rocket, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import PrioritiesTab from "@/components/startup-hub/PrioritiesTab";
import PeopleTab from "@/components/startup-hub/PeopleTab";
import KaiMemoriesTab from "@/components/startup-hub/KaiMemoriesTab";
import DocumentsTab from "@/components/startup-hub/DocumentsTab";
import NotesTab from "@/components/startup-hub/NotesTab";
import MilestonesTab from "@/components/startup-hub/MilestonesTab";
import ContactsTab from "@/components/startup-hub/ContactsTab";
import FinancesTab from "@/components/startup-hub/FinancesTab";
import TeamEfficiencyEngine from "@/components/startup-hub/TeamEfficiencyEngine";
import GrowthEngine from "@/components/startup-hub/GrowthEngine";
import ProductEngine from "@/components/startup-hub/ProductEngine";
import DepartmentUpdatesPanel from "@/components/startup-hub/DepartmentUpdatesPanel";
import { useStartups } from "@/hooks/useStartups";
import { startupKaiData, startupSignals } from "@/data/kai";
import { useTaskContext } from "@/contexts/TaskContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { statusConfig } from "@/data/startups";

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
    { id: "p1-nasheedio", problem: "Retention ↓12% this week", why: "Fewer creator uploads in last 2 weeks", impact: "Affects long-term growth", impactLevel: "High", owner: null, status: "pending", detectedAgo: "3 days ago", lastUpdated: "2 hours ago" },
    { id: "p2-nasheedio", problem: "Premium tier churn at 4.2%", why: "Pricing may not match perceived value", impact: "Revenue impact moderate", impactLevel: "Medium", owner: "CS Head", status: "in-progress", detectedAgo: "1 week ago", lastUpdated: "1 day ago" },
  ],
  gurucool: [
    { id: "p1-gurucool", problem: "Backend role open for 21 days", why: "Low qualified applicants", impact: "Blocking API v2 launch", impactLevel: "Medium", owner: "HR Head", status: "pending", detectedAgo: "21 days ago", lastUpdated: "1 day ago" },
  ],
  "levelup-climate": [],
  "project-x": [
    { id: "p1-project-x", problem: "Runway below 3 months", why: "High burn, no funding yet", impact: "Company survival at stake", impactLevel: "High", owner: "CFO", status: "in-progress", detectedAgo: "2 weeks ago", lastUpdated: "30 min ago" },
    { id: "p2-project-x", problem: "Growth declining at -3% MoM", why: "User acquisition stalled", impact: "Weakens fundraising position", impactLevel: "High", owner: null, status: "pending", detectedAgo: "1 week ago", lastUpdated: "5 hours ago" },
  ],
};

const statusDot: Record<string, string> = {
  pending: "bg-muted-foreground",
  "in-progress": "bg-accent",
  done: "bg-signal-positive",
};

const statusToneClass: Record<string, string> = {
  healthy: "text-signal-positive bg-signal-positive-soft border-signal-positive/30",
  "at-risk": "text-signal-warning bg-signal-warning-soft border-signal-warning/30",
  critical: "text-signal-critical bg-signal-critical-soft border-signal-critical/30",
};

const hubTabs = [
  { id: "growth", label: "Growth", icon: TrendingUp },
  { id: "product", label: "Product", icon: Rocket },
  { id: "finances", label: "Finances", icon: DollarSign },
  { id: "efficiency", label: "Efficiency", icon: Gauge },
  { id: "priorities", label: "Priorities", icon: AlertTriangle },
  { id: "people", label: "People", icon: Users },
  { id: "memories", label: "KAI Memories", icon: Brain },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "milestones", label: "Milestones", icon: Target },
  { id: "contacts", label: "Contacts", icon: Contact },
];

const StartupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { startups, dbStartups } = useStartups();
  const startup = startups.find((s) => s.id === id);
  const dbStartup = dbStartups.find((s) => s.slug === id);
  const { getTasksByStartup } = useTaskContext();
  const [hubTab, setHubTab] = useState<string | null>(null);

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
  const trendUp = startup.growthDirection === "up";
  const tone = startup.status === "critical" ? "critical" : startup.status === "at-risk" ? "warning" : "positive";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* EXECUTIVE HEADER */}
      <header className="border-b border-border-strong/40 bg-paper">
        <div className="mx-auto max-w-6xl px-6 pt-5 pb-7">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground transition-colors mb-5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to portfolio
          </button>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border",
                  statusToneClass[startup.status] ?? "bg-muted text-muted-foreground border-border"
                )}>
                  <span className="h-1 w-1 rounded-full bg-current" />
                  {config.label}
                </span>
                {totalTasks > 0 && (
                  <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                    {completedTasks}/{totalTasks} tasks
                  </span>
                )}
              </div>
              <h1 className="font-display text-5xl font-semibold leading-none tracking-tight">{startup.name}</h1>
              <p className="font-display italic text-base text-foreground/70 mt-3 max-w-2xl leading-snug">
                {startup.insight}
              </p>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-3">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9 border-border-strong" onClick={() => navigate(`/startup/${id}/ownership`)}>
                  <PieChart className="h-3.5 w-3.5" /> Equity &amp; Control
                </Button>
                <Button size="sm" className="gap-1.5 text-xs h-9 bg-primary" onClick={() => setHubTab("priorities")}>
                  <AlertTriangle className="h-3.5 w-3.5" /> Open Priorities
                </Button>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
                <Clock className="h-3 w-3" />
                Updated {startup.lastUpdated}
              </div>
            </div>
          </div>

          {/* Vital signs strip */}
          <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
            <VitalCell label="Runway" value={startup.runway} />
            <VitalCell
              label="Growth"
              value={startup.growth}
              icon={trendUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              tone={trendUp ? "positive" : "critical"}
            />
            <VitalCell label="Status" value={config.label} tone={tone as "positive" | "warning" | "critical"} />
            <div className="bg-card p-4">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Trend</span>
              <div className="mt-2">
                <SparkLine data={startup.sparkData} color={`hsl(var(--signal-${tone}))`} width={140} height={32} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-12">

        {/* Hub Action Bar */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 border-b border-border">
          {hubTabs.map((tab) => {
            const Icon = tab.icon;
            const active = hubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setHubTab(active ? null : tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors whitespace-nowrap border-b-2 -mb-px",
                  active
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Hub Tab Content */}
        {hubTab && dbStartup && (
          <section>
            {hubTab === "growth" && <GrowthEngine startupId={dbStartup.id} />}
            {hubTab === "product" && <ProductEngine startupId={dbStartup.id} />}
            {hubTab === "finances" && <FinancesTab startupId={dbStartup.id} />}
            {hubTab === "efficiency" && <TeamEfficiencyEngine startupId={dbStartup.id} runway={startup.runway} />}
            {hubTab === "priorities" && <PrioritiesTab startupId={dbStartup.slug} startupName={startup.name} />}
            {hubTab === "people" && <PeopleTab startupId={dbStartup.id} />}
            {hubTab === "memories" && <KaiMemoriesTab startupId={dbStartup.id} />}
            {hubTab === "documents" && <DocumentsTab startupId={dbStartup.id} />}
            {hubTab === "notes" && <NotesTab startupId={dbStartup.id} />}
            {hubTab === "milestones" && <MilestonesTab startupId={dbStartup.id} />}
            {hubTab === "contacts" && <ContactsTab startupId={dbStartup.id} />}
          </section>
        )}

        {/* DEPARTMENT COMMAND LAYER — primary section */}
        {dbStartup && (
          <section>
            <div className="flex items-end justify-between mb-4">
              <div>
                <span className="eyebrow">Department Command Layer</span>
                <h2 className="font-display text-2xl mt-1">Operations across the company</h2>
              </div>
            </div>
            <DepartmentUpdatesPanel startupId={dbStartup.id} />
          </section>
        )}

        {signal && (
          <section>
            <KaiSignalBadge signal={signal} />
          </section>
        )}

        {/* KAI Intelligence */}
        {kaiData && (
          <section className="space-y-4">
            <div>
              <span className="eyebrow">KAI Company Intelligence</span>
              <h2 className="font-display text-2xl mt-1">Strategic read on {startup.name}</h2>
            </div>
            <KaiInsight insight={kaiData.insight} convertible />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KaiPrediction predictions={kaiData.predictions} />
              <KaiScoreCard score={kaiData.score} />
            </div>
            <KaiRecommendation recommendation={kaiData.recommendation} onAccept={() => toast.success("Recommendation accepted")} />
            <KaiSimulation simulations={kaiData.simulations} />
          </section>
        )}

        {/* Problems */}
        {problems.length > 0 && (
          <section>
            <div className="mb-4">
              <span className="eyebrow text-signal-warning">Open Problems</span>
              <h2 className="font-display text-2xl mt-1">{problems.length} {problems.length === 1 ? "issue" : "issues"} on the desk</h2>
            </div>
            <div className="space-y-3">
              {problems.map((p) => (
                <ProblemCard key={p.id} problem={p} startupId={startup.id} />
              ))}
            </div>
          </section>
        )}

        {/* Tasks */}
        {startupTasks.length > 0 && (
          <section>
            <span className="eyebrow mb-3 block">Tasks</span>
            <TaskList tasks={startupTasks} />
          </section>
        )}

        {/* KAI Decision */}
        {kaiData?.decision && (
          <section>
            <span className="eyebrow mb-3 block">KAI Decision</span>
            <KaiDecision decision={kaiData.decision} />
          </section>
        )}

        {/* MFO Updates */}
        <section>
          <span className="eyebrow mb-3 flex items-center gap-2">
            <MessageSquare className="h-3 w-3" /> MFO Updates
          </span>
          <MfoUpdates startupId={startup.id} />
        </section>

        {/* Activity */}
        <section>
          <span className="eyebrow mb-3 flex items-center gap-2">
            <Activity className="h-3 w-3" /> Activity Timeline
          </span>
          <div className="paper-card p-5">
            <ActivityTimeline startupId={startup.id} />
          </div>
        </section>

        {/* Ask KAI */}
        <section>
          <span className="eyebrow mb-3 block">Ask KAI</span>
          <AskKai startupContext={startupContext} />
        </section>

      </main>
    </div>
  );
};

function VitalCell({
  label, value, icon, tone,
}: { label: string; value: string; icon?: React.ReactNode; tone?: "positive" | "warning" | "critical" }) {
  const toneClass =
    tone === "positive" ? "text-signal-positive" :
    tone === "warning" ? "text-signal-warning" :
    tone === "critical" ? "text-signal-critical" :
    "text-foreground";
  return (
    <div className="bg-card p-4">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <p className={cn("numeric text-2xl mt-1 flex items-center gap-1.5", toneClass)}>
        {icon}
        {value}
      </p>
    </div>
  );
}

/* --- Problem Card sub-component --- */
function ProblemCard({ problem, startupId }: { problem: Problem; startupId: string }) {
  const [status, setStatus] = useState(problem.status);
  const { getTasksByIssue } = useTaskContext();
  const linkedTasks = getTasksByIssue(problem.id);
  const allDone = linkedTasks.length > 0 && linkedTasks.every((t) => t.status === "completed");
  const dotClass = statusDot[status];
  const impactTone =
    problem.impactLevel === "High" ? "text-signal-critical" :
    problem.impactLevel === "Medium" ? "text-signal-warning" :
    "text-muted-foreground";

  return (
    <article className="paper-card p-5">
      <header className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg leading-snug">{problem.problem}</h3>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            <span>Detected {problem.detectedAgo}</span>
            <span>·</span>
            <span>Updated {problem.lastUpdated}</span>
          </div>
        </div>
        <button
          onClick={() => {
            const next: Record<string, string> = { pending: "in-progress", "in-progress": "done", done: "pending" };
            const n = next[status] as typeof status;
            setStatus(n);
            toast.success(`Status: ${n}`);
          }}
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
          {status === "pending" ? "Pending" : status === "in-progress" ? "In Progress" : "Done"}
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
        <p className="text-foreground/75">
          <span className="eyebrow block mb-1">Why</span>
          {problem.why}
        </p>
        <p className="text-foreground/75">
          <span className="eyebrow block mb-1">Impact</span>
          <span className={cn("font-semibold", impactTone)}>{problem.impactLevel}</span> — {problem.impact}
        </p>
      </div>

      {linkedTasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <TaskList tasks={linkedTasks} />
        </div>
      )}

      {allDone && (
        <div className="mt-4">
          <ResolutionPrompt issueLabel={problem.problem} onResolve={() => setStatus("done")} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        <IssueTaskFlow linkedIssueId={problem.id} linkedStartupId={startupId} defaultTitle={problem.problem.replace(/[⚠️🔥]/g, "").trim()} />
        <Button size="sm" variant="ghost" className="text-xs h-7 text-signal-positive" onClick={() => { setStatus("done"); toast.success("Marked done"); }}>
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Done
        </Button>
      </div>
    </article>
  );
}

export default StartupDetail;
