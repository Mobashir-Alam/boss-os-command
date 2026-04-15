import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import SparkLine from "@/components/SparkLine";
import { startups, statusConfig } from "@/data/startups";

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
        </div>

        {/* Metrics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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

        {/* Insight detail */}
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Insight Detail</h2>
          <div className="mb-4">
            <SparkLine data={startup.sparkData} color={config.color} width={200} height={40} />
          </div>
          <p className="text-sm leading-relaxed">{startup.insightDetail}</p>
        </div>
      </main>
    </div>
  );
};

export default StartupDetail;
