import { useState, useMemo } from "react";
import { useGrowthConfig, useGrowthMetrics, useGrowthExperiments } from "@/hooks/useGrowth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  TrendingUp, TrendingDown, Users, DollarSign, Brain, Zap, Plus,
  BarChart3, Target, Beaker, Megaphone, ShoppingCart, Globe,
  Handshake, Store, ArrowUpDown, X, Loader2, Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";

const MODELS = [
  { id: "content", label: "Content-driven", icon: Megaphone, desc: "Blog, video, social media growth" },
  { id: "product", label: "Product-driven", icon: Rocket, desc: "DAU/MAU, feature adoption, virality" },
  { id: "distribution", label: "Distribution-driven", icon: Store, desc: "Retail, units sold, region expansion" },
  { id: "sales", label: "Sales-driven", icon: Handshake, desc: "Leads, pipeline, conversion" },
];

const MODEL_DRIVERS: Record<string, { key: string; label: string }[]> = {
  content: [
    { key: "content_published", label: "Content Published" },
    { key: "engagement_rate", label: "Engagement Rate (%)" },
    { key: "shares", label: "Shares/Virality" },
    { key: "time_on_content", label: "Avg Time on Content (min)" },
  ],
  product: [
    { key: "dau", label: "DAU" },
    { key: "mau", label: "MAU" },
    { key: "transactions", label: "Transactions" },
    { key: "feature_adoption", label: "Feature Adoption (%)" },
  ],
  distribution: [
    { key: "units_sold", label: "Units Sold" },
    { key: "retail_locations", label: "Retail Locations" },
    { key: "regions_active", label: "Regions Active" },
    { key: "fill_rate", label: "Fill Rate (%)" },
  ],
  sales: [
    { key: "leads", label: "Leads" },
    { key: "conversion_rate", label: "Conversion Rate (%)" },
    { key: "pipeline_value", label: "Pipeline Value (₹)" },
    { key: "deal_velocity", label: "Deal Velocity (days)" },
  ],
};

const MODEL_FUNNELS: Record<string, string[]> = {
  content: ["Discover", "Consume", "Engage", "Subscribe", "Convert", "Refer"],
  product: ["Awareness", "Signup", "Activation", "Engagement", "Revenue", "Referral"],
  distribution: ["Awareness", "Distribution", "Purchase", "Repeat", "Expansion"],
  sales: ["Lead", "Qualify", "Demo", "Proposal", "Close", "Upsell"],
};

const CHANNELS = ["organic", "paid", "partnerships", "retail", "referral", "direct"];
const EXP_STATUSES = [
  { value: "planned", label: "Planned", color: "text-muted-foreground" },
  { value: "running", label: "Running", color: "text-blue-400" },
  { value: "completed", label: "Completed", color: "text-emerald-400" },
  { value: "failed", label: "Failed", color: "text-red-400" },
];

interface Props { startupId: string }

export default function GrowthEngine({ startupId }: Props) {
  const { config, loading: configLoading, upsert } = useGrowthConfig(startupId);
  const { metrics, loading: metricsLoading, add: addMetric, remove: removeMetric } = useGrowthMetrics(startupId);
  const { experiments, loading: expLoading, add: addExp, update: updateExp, remove: removeExp } = useGrowthExperiments(startupId);

  const [addMetricOpen, setAddMetricOpen] = useState(false);
  const [addExpOpen, setAddExpOpen] = useState(false);
  const [metricForm, setMetricForm] = useState<Record<string, any>>({});
  const [expForm, setExpForm] = useState<Record<string, any>>({});

  const model = config?.growth_model || "product";
  const drivers = MODEL_DRIVERS[model] || MODEL_DRIVERS.product;
  const funnel = MODEL_FUNNELS[model] || MODEL_FUNNELS.product;

  // Latest snapshot metrics
  const snapshots = metrics.filter((m: any) => m.metric_type === "snapshot");
  const latest = snapshots[0];
  const driverMetrics = metrics.filter((m: any) => m.metric_type === "driver");
  const channelMetrics = metrics.filter((m: any) => m.metric_type === "channel");

  // Aggregate driver values (latest per key)
  const latestDrivers = useMemo(() => {
    const map: Record<string, any> = {};
    driverMetrics.forEach((m: any) => { if (!map[m.metric_key]) map[m.metric_key] = m; });
    return map;
  }, [driverMetrics]);

  // Channel breakdown
  const channelBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    channelMetrics.forEach((m: any) => { map[m.channel] = (map[m.channel] || 0) + (m.metric_value || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [channelMetrics]);
  const channelTotal = channelBreakdown.reduce((s, [, v]) => s + v, 0);

  // KAI Insights
  const kaiInsights = useMemo(() => {
    const ins: { text: string; type: "warning" | "success" | "info" }[] = [];
    if (latest) {
      if (latest.growth_rate > 10) ins.push({ text: `Strong growth at ${latest.growth_rate}% — ${model === "content" ? "content is driving acquisition" : model === "distribution" ? "distribution expansion is working" : "keep momentum"}`, type: "success" });
      if (latest.growth_rate < 0) ins.push({ text: `Growth declining at ${latest.growth_rate}% — review ${model === "content" ? "content strategy" : model === "sales" ? "lead pipeline" : "acquisition channels"}`, type: "warning" });
      if (latest.retention_rate < 50) ins.push({ text: `Retention at ${latest.retention_rate}% — focus on ${model === "product" ? "feature stickiness" : model === "content" ? "content quality" : "customer success"}`, type: "warning" });
      if (latest.activation_rate < 40) ins.push({ text: `Low activation (${latest.activation_rate}%) — optimize onboarding`, type: "warning" });
    }
    if (model === "content") {
      const eng = latestDrivers["engagement_rate"];
      if (eng && eng.metric_value > 5) ins.push({ text: `High content engagement at ${eng.metric_value}% — double down on top formats`, type: "success" });
    }
    if (model === "product") {
      const dau = latestDrivers["dau"]; const mau = latestDrivers["mau"];
      if (dau && mau && mau.metric_value > 0) {
        const ratio = Math.round((dau.metric_value / mau.metric_value) * 100);
        if (ratio > 30) ins.push({ text: `Strong DAU/MAU ratio at ${ratio}% — product is sticky`, type: "success" });
        if (ratio < 15) ins.push({ text: `DAU/MAU at ${ratio}% — product engagement needs work`, type: "warning" });
      }
    }
    if (model === "distribution") {
      const fill = latestDrivers["fill_rate"];
      if (fill && fill.metric_value < 70) ins.push({ text: `Fill rate at ${fill.metric_value}% — supply chain needs attention`, type: "warning" });
    }
    if (model === "sales") {
      const conv = latestDrivers["conversion_rate"];
      if (conv && conv.metric_value < 10) ins.push({ text: `Conversion at ${conv.metric_value}% — review qualification criteria`, type: "warning" });
    }
    const runningExps = experiments.filter((e: any) => e.status === "running");
    if (runningExps.length > 0) ins.push({ text: `${runningExps.length} experiment${runningExps.length > 1 ? "s" : ""} running — track results closely`, type: "info" });
    if (ins.length === 0) ins.push({ text: "Add growth snapshots and driver metrics to unlock KAI insights", type: "info" });
    return ins;
  }, [latest, model, latestDrivers, experiments]);

  const handleAddMetric = () => {
    addMetric.mutate(metricForm, {
      onSuccess: () => { setAddMetricOpen(false); setMetricForm({}); },
    });
  };

  const handleAddExp = () => {
    addExp.mutate(expForm, {
      onSuccess: () => { setAddExpOpen(false); setExpForm({}); },
    });
  };

  if (configLoading) return <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Growth Engine
        </h3>
      </div>

      {/* Growth Model Selector */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 font-semibold">Growth Model</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MODELS.map((m) => {
            const Icon = m.icon;
            const active = model === m.id;
            return (
              <button key={m.id} onClick={() => upsert.mutate({ growth_model: m.id })}
                className={cn("rounded-lg border p-3 text-left transition-all",
                  active ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
                )}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>{m.label}</span>
                </div>
                <p className="text-[9px] text-muted-foreground">{m.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Growth Snapshot */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Growth Snapshot</p>
        <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => { setMetricForm({ metric_type: "snapshot" }); setAddMetricOpen(true); }}>
          <Plus className="h-3 w-3" /> Add Snapshot
        </Button>
      </div>
      {latest ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Users", value: latest.users?.toLocaleString() || "0", icon: Users },
            { label: "Growth", value: `${latest.growth_rate}%`, icon: latest.growth_rate >= 0 ? TrendingUp : TrendingDown },
            { label: "Activation", value: `${latest.activation_rate}%`, icon: Zap },
            { label: "Retention", value: `${latest.retention_rate}%`, icon: Target },
            { label: "Revenue", value: `₹${((latest.revenue || 0) / 1000).toFixed(0)}K`, icon: DollarSign },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="rounded-xl border border-border/60 bg-card p-3.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase">{c.label}</p>
                </div>
                <p className="text-lg font-bold">{c.value}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/50 p-6 text-center">
          <BarChart3 className="h-5 w-5 mx-auto mb-2 opacity-30" />
          <p className="text-xs text-muted-foreground">No snapshots yet — add your first growth data</p>
        </div>
      )}

      {/* Growth Drivers */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          {MODELS.find((m) => m.id === model)?.label} Drivers
        </p>
        <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => { setMetricForm({ metric_type: "driver" }); setAddMetricOpen(true); }}>
          <Plus className="h-3 w-3" /> Add Driver
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {drivers.map((d) => {
          const val = latestDrivers[d.key];
          return (
            <div key={d.key} className="rounded-xl border border-border/60 bg-card p-3.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{d.label}</p>
              <p className="text-lg font-bold tabular-nums">{val ? val.metric_value : "—"}</p>
            </div>
          );
        })}
      </div>

      {/* Funnel */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 font-semibold">
          {MODELS.find((m) => m.id === model)?.label} Funnel
        </p>
        <div className="flex items-center gap-1">
          {funnel.map((stage, i) => (
            <div key={stage} className="flex-1 text-center">
              <div className="h-8 rounded flex items-center justify-center text-[10px] font-medium"
                style={{
                  background: `hsl(var(--primary) / ${0.08 + (i * 0.07)})`,
                  color: `hsl(var(--primary))`,
                }}>
                {stage}
              </div>
              {i < funnel.length - 1 && <div className="text-[8px] text-muted-foreground mt-0.5">→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Channels */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Channels</p>
        <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => { setMetricForm({ metric_type: "channel" }); setAddMetricOpen(true); }}>
          <Plus className="h-3 w-3" /> Add Channel Data
        </Button>
      </div>
      {channelBreakdown.length > 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
          {channelBreakdown.map(([ch, val]) => (
            <div key={ch} className="flex items-center gap-3">
              <span className="text-xs font-medium w-24 capitalize">{ch}</span>
              <div className="flex-1"><Progress value={channelTotal ? (val / channelTotal) * 100 : 0} className="h-1.5" /></div>
              <span className="text-[10px] tabular-nums text-muted-foreground w-16 text-right">{Math.round((val / (channelTotal || 1)) * 100)}%</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/50 p-4 text-center">
          <Globe className="h-4 w-4 mx-auto mb-1 opacity-30" />
          <p className="text-[10px] text-muted-foreground">Add channel data to see breakdown</p>
        </div>
      )}

      {/* Experiments */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Experiments</p>
        <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => setAddExpOpen(true)}>
          <Plus className="h-3 w-3" /> Add Experiment
        </Button>
      </div>
      {experiments.length > 0 ? (
        <div className="space-y-2">
          {experiments.map((exp: any) => {
            const st = EXP_STATUSES.find((s) => s.value === exp.status) || EXP_STATUSES[0];
            return (
              <div key={exp.id} className="rounded-xl border border-border/60 bg-card p-4 flex items-center justify-between group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Beaker className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium truncate">{exp.name}</p>
                    <Badge variant="outline" className={cn("text-[9px] px-1 py-0 border-current", st.color)}>{st.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="capitalize">{exp.channel}</span>
                    <span className="capitalize">{exp.experiment_type}</span>
                    {exp.result_summary && <span>Result: {exp.result_summary}</span>}
                    {exp.impact_score > 0 && <span>Impact: {exp.impact_score}/10</span>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {exp.status !== "completed" && (
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2"
                      onClick={() => updateExp.mutate({ id: exp.id, status: exp.status === "planned" ? "running" : "completed" })}>
                      {exp.status === "planned" ? "Start" : "Complete"}
                    </Button>
                  )}
                  <button onClick={() => removeExp.mutate(exp.id)} className="p-1 hover:bg-destructive/10 rounded">
                    <X className="h-3 w-3 text-destructive/70" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/50 p-4 text-center">
          <Beaker className="h-4 w-4 mx-auto mb-1 opacity-30" />
          <p className="text-[10px] text-muted-foreground">Track campaigns and growth tests</p>
        </div>
      )}

      {/* KAI Insights */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">KAI Growth Insights</p>
        </div>
        <div className="space-y-2">
          {kaiInsights.map((ins, i) => (
            <div key={i} className={cn("flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs",
              ins.type === "warning" ? "bg-amber-500/5 text-amber-300" :
              ins.type === "success" ? "bg-emerald-500/5 text-emerald-300" :
              "bg-blue-500/5 text-blue-300"
            )}>
              <Brain className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{ins.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Metric Modal */}
      <Dialog open={addMetricOpen} onOpenChange={setAddMetricOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base">Add {metricForm.metric_type === "snapshot" ? "Snapshot" : metricForm.metric_type === "driver" ? "Driver Metric" : "Channel Data"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {metricForm.metric_type === "snapshot" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs text-muted-foreground">Users</Label><Input type="number" className="h-9 text-sm" onChange={(e) => setMetricForm((f: any) => ({ ...f, users: +e.target.value }))} /></div>
                  <div><Label className="text-xs text-muted-foreground">Growth Rate (%)</Label><Input type="number" className="h-9 text-sm" onChange={(e) => setMetricForm((f: any) => ({ ...f, growth_rate: +e.target.value }))} /></div>
                  <div><Label className="text-xs text-muted-foreground">Activation (%)</Label><Input type="number" className="h-9 text-sm" onChange={(e) => setMetricForm((f: any) => ({ ...f, activation_rate: +e.target.value }))} /></div>
                  <div><Label className="text-xs text-muted-foreground">Retention (%)</Label><Input type="number" className="h-9 text-sm" onChange={(e) => setMetricForm((f: any) => ({ ...f, retention_rate: +e.target.value }))} /></div>
                  <div><Label className="text-xs text-muted-foreground">Revenue (₹)</Label><Input type="number" className="h-9 text-sm" onChange={(e) => setMetricForm((f: any) => ({ ...f, revenue: +e.target.value }))} /></div>
                  <div><Label className="text-xs text-muted-foreground">Period</Label><Input type="date" className="h-9 text-sm" onChange={(e) => setMetricForm((f: any) => ({ ...f, period: e.target.value }))} /></div>
                </div>
              </>
            )}
            {metricForm.metric_type === "driver" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Driver</Label>
                  <Select onValueChange={(v) => setMetricForm((f: any) => ({ ...f, metric_key: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select driver" /></SelectTrigger>
                    <SelectContent>{drivers.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs text-muted-foreground">Value</Label><Input type="number" className="h-9 text-sm" onChange={(e) => setMetricForm((f: any) => ({ ...f, metric_value: +e.target.value }))} /></div>
              </div>
            )}
            {metricForm.metric_type === "channel" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Channel</Label>
                  <Select onValueChange={(v) => setMetricForm((f: any) => ({ ...f, channel: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select channel" /></SelectTrigger>
                    <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs text-muted-foreground">Value</Label><Input type="number" className="h-9 text-sm" onChange={(e) => setMetricForm((f: any) => ({ ...f, metric_value: +e.target.value }))} /></div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setAddMetricOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddMetric} disabled={addMetric.isPending}>
                {addMetric.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Experiment Modal */}
      <Dialog open={addExpOpen} onOpenChange={setAddExpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base">Add Experiment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs text-muted-foreground">Name</Label><Input className="h-9 text-sm" onChange={(e) => setExpForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select onValueChange={(v) => setExpForm((f: any) => ({ ...f, experiment_type: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Campaign" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campaign">Campaign</SelectItem>
                    <SelectItem value="test">A/B Test</SelectItem>
                    <SelectItem value="feature">Feature Launch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Channel</Label>
                <Select onValueChange={(v) => setExpForm((f: any) => ({ ...f, channel: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Organic" /></SelectTrigger>
                  <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setAddExpOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddExp} disabled={addExp.isPending || !expForm.name}>
                {addExp.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
