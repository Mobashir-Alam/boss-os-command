import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, PieChart, Shield, TrendingUp, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import { useStartups } from "@/hooks/useStartups";
import OwnershipTab from "@/components/ownership/OwnershipTab";
import ControlTab from "@/components/ownership/ControlTab";
import SimulateTab from "@/components/ownership/SimulateTab";
import DocumentsTab from "@/components/ownership/DocumentsTab";
import OwnershipKaiInsights from "@/components/ownership/OwnershipKaiInsights";

const OwnershipEngine = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { startups, dbStartups } = useStartups();
  const startup = startups.find((s) => s.id === id);
  const dbStartup = dbStartups.find((s) => s.slug === id);

  if (!startup || !dbStartup) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-7xl px-6 py-16 text-center">
          <p className="text-muted-foreground">Startup not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <button
          onClick={() => navigate(`/startup/${id}`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {startup.name}
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Equity & Control</h1>
          <p className="text-muted-foreground mt-1">{startup.name} — Ownership structure, control, and dilution planning</p>
        </div>

        {/* KAI Strategic Insights */}
        <OwnershipKaiInsights startupId={dbStartup.id} />

        <Tabs defaultValue="ownership" className="mt-8">
          <TabsList className="w-full justify-start bg-muted/50 border border-border/40 rounded-xl p-1">
            <TabsTrigger value="ownership" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
              <PieChart className="h-3.5 w-3.5" /> Ownership
            </TabsTrigger>
            <TabsTrigger value="control" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
              <Shield className="h-3.5 w-3.5" /> Control
            </TabsTrigger>
            <TabsTrigger value="simulate" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
              <TrendingUp className="h-3.5 w-3.5" /> Simulate
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
              <FileText className="h-3.5 w-3.5" /> Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ownership">
            <OwnershipTab startupId={startup.id} />
          </TabsContent>
          <TabsContent value="control">
            <ControlTab startupId={startup.id} />
          </TabsContent>
          <TabsContent value="simulate">
            <SimulateTab startupId={startup.id} />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentsTab startupId={startup.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default OwnershipEngine;
