import { useState } from "react";
import Navbar from "@/components/Navbar";
import StartupCard from "@/components/StartupCard";
import AlertStrip from "@/components/AlertStrip";
import FixModal from "@/components/FixModal";
import { startups, getDailySummary, type Startup } from "@/data/startups";

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
        <div className="mb-8 flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/30 px-5 py-3.5">
          <span className="text-sm">📋</span>
          <p className="text-sm font-medium text-foreground/80">{summary}</p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {startups.map((s, i) => (
            <StartupCard key={s.id} startup={s} onFix={setFixTarget} index={i} />
          ))}
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
