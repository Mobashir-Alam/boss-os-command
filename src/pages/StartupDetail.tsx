import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Clock,
  Contact,
  DollarSign,
  FolderOpen,
  Gauge,
  MessageSquare,
  PieChart,
  Rocket,
  StickyNote,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useStartups } from "@/hooks/useStartups";
import {
  useStartupExecutiveOverview,
  type StartupExecutiveProblem,
} from "@/hooks/useStartupExecutiveOverview";
import { useTaskContext } from "@/contexts/TaskContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { statusConfig } from "@/data/startups";

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
] as const;

const StartupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { startups, dbStartups } = useStartups();
  const startup = startups.find((entry) => entry.id === id);
  const dbStartup = dbStartups.find((entry) => entry.slug === id);
  const { getTasksByStartup } = useTaskContext();
  const [hubTab, setHubTab] = useState<string | null>(null);
  const executiveOverview = useStartupExecutiveOverview(startup, dbStartup);

  if (!startup) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-7xl px-6 py-16 text-center">
          <p className="text-muted-foreground">Startup not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
            Go back
          </Button>
        </main>
      </div>
    );
  }

  const config = statusConfig[startup.status];
  const startupTasks = getTasksByStartup(startup.id);
  const problems = executiveOverview.problems;
  const kaiData = executiveOverview.kaiData;
  const signal = executiveOverview.signal;
  const startupContext = `Startup: ${startup.name}. Status: ${config.label}. Runway: ${startup.runway}. Growth: ${startup.growth}. Insight: ${kaiData?.insight ?? startup.insight}.`;

  const completedTasks = startupTasks.filter((task) => task.status === "completed").length;
  const totalTasks = startupTasks.length;
  const trendUp = startup.growthDirection === "up";
  const tone =
    startup.status === "critical"
      ? "critical"
      : startup.status === "at-risk"
        ? "warning"
        : "positive";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <header className="border-b border-border-strong/40 bg-paper">
        <div className="mx-auto max-w-6xl px-6 pb-7 pt-5">
          <button
            onClick={() => navigate("/")}
            className="mb-5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to portfolio
          </button>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    statusToneClass[startup.status] ?? "bg-muted text-muted-foreground border-border",
                  )}
                >
                  <span className="h-1 w-1 rounded-full bg-current" />
                  {config.label}
                </span>
                {totalTasks > 0 && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {completedTasks}/{totalTasks} tasks
                  </span>
                )}
              </div>
              <h1 className="font-display text-5xl font-semibold leading-none tracking-tight">
                {startup.name}
              </h1>
              <p className="mt-3 max-w-2xl font-display text-base italic leading-snug text-foreground/70">
                {kaiData?.insight ?? startup.insight}
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 border-border-strong text-xs"
                  onClick={() => navigate(`/startup/${id}/ownership`)}
                >
                  <PieChart className="h-3.5 w-3.5" /> Equity &amp; Control
                </Button>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 bg-primary text-xs"
                  onClick={() => setHubTab("priorities")}
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Open Priorities
                </Button>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3" />
                Updated {startup.lastUpdated}
              </div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
            <VitalCell label="Runway" value={startup.runway} />
            <VitalCell
              label="Growth"
              value={startup.growth}
              icon={trendUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              tone={trendUp ? "positive" : "critical"}
            />
            <VitalCell label="Status" value={config.label} tone={tone as "positive" | "warning" | "critical"} />
            <div className="bg-card p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Trend
              </span>
              <div className="mt-2">
                <SparkLine
                  data={startup.sparkData}
                  color={`hsl(var(--signal-${tone}))`}
                  width={140}
                  height={32}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-6 py-8">
        <nav className="-mx-1 flex items-center gap-1 overflow-x-auto border-b border-border px-1 pb-1">
          {hubTabs.map((tab) => {
            const Icon = tab.icon;
            const active = hubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setHubTab(active ? null : tab.id)}
                className={cn(
                  "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                  active
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {hubTab && dbStartup && (
          <section>
            {hubTab === "growth" && <GrowthEngine startupId={dbStartup.id} />}
            {hubTab === "product" && <ProductEngine startupId={dbStartup.id} />}
            {hubTab === "finances" && <FinancesTab startupId={dbStartup.id} />}
            {hubTab === "efficiency" && (
              <TeamEfficiencyEngine startupId={dbStartup.id} runway={startup.runway} />
            )}
            {hubTab === "priorities" && (
              <PrioritiesTab startupId={dbStartup.slug} startupName={startup.name} />
            )}
            {hubTab === "people" && <PeopleTab startupId={dbStartup.id} startupSlug={dbStartup.slug} />}
            {hubTab === "memories" && <KaiMemoriesTab startupId={dbStartup.id} />}
            {hubTab === "documents" && <DocumentsTab startupId={dbStartup.id} />}
            {hubTab === "notes" && <NotesTab startupId={dbStartup.id} />}
            {hubTab === "milestones" && <MilestonesTab startupId={dbStartup.id} />}
            {hubTab === "contacts" && <ContactsTab startupId={dbStartup.id} />}
          </section>
        )}

        {dbStartup && (
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <span className="eyebrow">Department Command Layer</span>
                <h2 className="mt-1 font-display text-2xl">Operations across the company</h2>
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

        {kaiData && (
          <section className="space-y-4">
            <div>
              <span className="eyebrow">KAI Company Intelligence</span>
              <h2 className="mt-1 font-display text-2xl">Strategic read on {startup.name}</h2>
            </div>
            <KaiInsight insight={kaiData.insight} convertible />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <KaiPrediction predictions={kaiData.predictions} />
              <KaiScoreCard score={kaiData.score} />
            </div>
            <KaiRecommendation
              recommendation={kaiData.recommendation}
              onAccept={() => toast.success("Recommendation accepted")}
            />
            <KaiSimulation simulations={kaiData.simulations} />
          </section>
        )}

        {problems.length > 0 && (
          <section>
            <div className="mb-4">
              <span className="eyebrow text-signal-warning">Open Problems</span>
              <h2 className="mt-1 font-display text-2xl">
                {problems.length} {problems.length === 1 ? "issue" : "issues"} on the desk
              </h2>
            </div>
            <div className="space-y-3">
              {problems.map((problem) => (
                <ProblemCard key={problem.id} problem={problem} startupId={startup.id} />
              ))}
            </div>
          </section>
        )}

        {startupTasks.length > 0 && (
          <section>
            <span className="eyebrow mb-3 block">Tasks</span>
            <TaskList tasks={startupTasks} />
          </section>
        )}

        {kaiData?.decision && (
          <section>
            <span className="eyebrow mb-3 block">KAI Decision</span>
            <KaiDecision decision={kaiData.decision} />
          </section>
        )}

        <section>
          <span className="eyebrow mb-3 flex items-center gap-2">
            <MessageSquare className="h-3 w-3" /> MFO Updates
          </span>
          <MfoUpdates startupId={startup.id} />
        </section>

        <section>
          <span className="eyebrow mb-3 flex items-center gap-2">
            <Activity className="h-3 w-3" /> Activity Timeline
          </span>
          <div className="paper-card p-5">
            <ActivityTimeline startupId={startup.id} />
          </div>
        </section>

        <section>
          <span className="eyebrow mb-3 block">Ask KAI</span>
          <AskKai startupContext={startupContext} />
        </section>
      </main>
    </div>
  );
};

function VitalCell({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "positive" | "warning" | "critical";
}) {
  const toneClass =
    tone === "positive"
      ? "text-signal-positive"
      : tone === "warning"
        ? "text-signal-warning"
        : tone === "critical"
          ? "text-signal-critical"
          : "text-foreground";

  return (
    <div className="bg-card p-4">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <p className={cn("numeric mt-1 flex items-center gap-1.5 text-2xl", toneClass)}>
        {icon}
        {value}
      </p>
    </div>
  );
}

function ProblemCard({
  problem,
  startupId,
}: {
  problem: StartupExecutiveProblem;
  startupId: string;
}) {
  const [status, setStatus] = useState(problem.status);
  const { getTasksByIssue } = useTaskContext();
  const linkedTasks = getTasksByIssue(problem.id);
  const allDone = linkedTasks.length > 0 && linkedTasks.every((task) => task.status === "completed");
  const dotClass = statusDot[status];
  const impactTone =
    problem.impactLevel === "High"
      ? "text-signal-critical"
      : problem.impactLevel === "Medium"
        ? "text-signal-warning"
        : "text-muted-foreground";

  return (
    <article className="paper-card p-5">
      <header className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg leading-snug">{problem.problem}</h3>
          <div className="mt-1.5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Detected {problem.detectedAgo}</span>
            <span>/</span>
            <span>Updated {problem.lastUpdated}</span>
          </div>
        </div>
        <button
          onClick={() => {
            const next: Record<string, string> = {
              pending: "in-progress",
              "in-progress": "done",
              done: "pending",
            };
            const nextStatus = next[status] as typeof status;
            setStatus(nextStatus);
            toast.success(`Status: ${nextStatus}`);
          }}
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
          {status === "pending" ? "Pending" : status === "in-progress" ? "In Progress" : "Done"}
        </button>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <p className="text-foreground/75">
          <span className="eyebrow mb-1 block">Why</span>
          {problem.why}
        </p>
        <p className="text-foreground/75">
          <span className="eyebrow mb-1 block">Impact</span>
          <span className={cn("font-semibold", impactTone)}>{problem.impactLevel}</span> - {problem.impact}
        </p>
      </div>

      {linkedTasks.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <TaskList tasks={linkedTasks} />
        </div>
      )}

      {allDone && (
        <div className="mt-4">
          <ResolutionPrompt issueLabel={problem.problem} onResolve={() => setStatus("done")} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <IssueTaskFlow linkedIssueId={problem.id} linkedStartupId={startupId} defaultTitle={problem.problem} />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-signal-positive"
          onClick={() => {
            setStatus("done");
            toast.success("Marked done");
          }}
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Done
        </Button>
      </div>
    </article>
  );
}

export default StartupDetail;
