import { useState } from "react";
import Navbar from "@/components/Navbar";
import StartupCard from "@/components/StartupCard";
import AlertStrip from "@/components/AlertStrip";
import FixModal from "@/components/FixModal";
import { startups, type Startup } from "@/data/startups";

const Index = () => {
  const [fixTarget, setFixTarget] = useState<Startup | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Section Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Your Startups</h1>
          <p className="text-sm text-muted-foreground mt-1">Quick overview — focus on what needs attention.</p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {startups.map((s) => (
            <StartupCard key={s.id} startup={s} onFix={setFixTarget} />
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
