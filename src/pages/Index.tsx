import { useState } from "react";
import Navbar from "@/components/Navbar";
import StartupCard from "@/components/StartupCard";
import AlertStrip from "@/components/AlertStrip";
import FixModal from "@/components/FixModal";
import KaiInsight from "@/components/KaiInsight";
import KaiPrediction from "@/components/KaiPrediction";
import KaiRecommendation from "@/components/KaiRecommendation";
import KaiPortfolioIntel from "@/components/KaiPortfolioIntel";
import KaiStrategicBrief from "@/components/KaiStrategicBrief";
import { startups, getDailySummary, type Startup } from "@/data/startups";
import {
  globalKaiInsight, globalKaiPredictions, globalKaiRecommendation,
  crossStartupInsights, capitalAllocations,
  weeklyBrief, founderPatterns, founderTimeAllocation,
} from "@/data/kai";
import { toast } from "sonner";

const Index = () => {
  const [fixTarget, setFixTarget] = useState<Startup | null>(null);
  const summary = getDailySummary();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Section Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Your Startups</h1>
          <p className="text-sm text-muted-foreground mt-1">Focus on what needs attention — act on what matters.</p>
        </div>

        {/* Daily Summary Briefing */}
        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/30 px-5 py-3.5">
          <span className="text-sm">📋</span>
          <p className="text-sm font-medium text-foreground/80">{summary}</p>
        </div>

        {/* KAI Portfolio Intelligence */}
        <div className="mb-8 space-y-3">
          <KaiInsight insight={globalKaiInsight.insight} convertible />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <KaiPrediction predictions={globalKaiPredictions} />
            <KaiRecommendation recommendation={globalKaiRecommendation} onAccept={() => toast.success("Recommendation accepted as task")} />
          </div>
          <KaiPortfolioIntel crossInsights={crossStartupInsights} capitalAllocations={capitalAllocations} />
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {startups.map((s, i) => (
            <StartupCard key={s.id} startup={s} onFix={setFixTarget} index={i} />
          ))}
        </div>

        {/* Weekly Strategic Brief */}
        <div className="mt-10">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">KAI Weekly Brief</h2>
          <KaiStrategicBrief brief={weeklyBrief} founderPatterns={founderPatterns} timeAllocation={founderTimeAllocation} />
        </div>

        {/* Alert Strip */}
        <AlertStrip />
      </main>

      {/* Fix Modal */}
      <FixModal startup={fixTarget} open={!!fixTarget} onOpenChange={(open) => !open && setFixTarget(null)} />
    </div>
  );
};

export default Index;
