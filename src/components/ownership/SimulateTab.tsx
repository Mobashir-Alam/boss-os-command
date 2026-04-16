import { useState } from "react";
import { Plus, Trash2, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStakeholders, useFundingRounds } from "@/hooks/useOwnership";

interface SimRound {
  name: string;
  valuation: number;
  raise: number;
}

const PRESET_ROUNDS: SimRound[] = [
  { name: "Pre-Seed", valuation: 2_000_000, raise: 250_000 },
  { name: "Seed", valuation: 8_000_000, raise: 1_500_000 },
  { name: "Series A", valuation: 30_000_000, raise: 5_000_000 },
];

export default function SimulateTab({ startupId }: { startupId: string }) {
  const { data: stakeholders = [] } = useStakeholders(startupId);
  const { data: savedRounds = [], upsert: saveRound, remove: removeRound } = useFundingRounds(startupId);

  const [rounds, setRounds] = useState<SimRound[]>([]);
  const [customName, setCustomName] = useState("");
  const [customVal, setCustomVal] = useState("");
  const [customRaise, setCustomRaise] = useState("");

  function addPreset(preset: SimRound) {
    if (!rounds.find((r) => r.name === preset.name)) {
      setRounds([...rounds, preset]);
    }
  }

  function addCustom() {
    if (customName && customVal && customRaise) {
      setRounds([...rounds, { name: customName, valuation: parseFloat(customVal), raise: parseFloat(customRaise) }]);
      setCustomName(""); setCustomVal(""); setCustomRaise("");
    }
  }

  function removeSimRound(idx: number) {
    setRounds(rounds.filter((_, i) => i !== idx));
  }

  // Calculate dilution
  function simulateDilution() {
    const totalEquity = stakeholders.reduce((s, sh) => s + Number(sh.equity_pct), 0);
    // Group by role for display
    const groups: Record<string, number> = {};
    stakeholders.forEach((s) => {
      const key = s.role.toLowerCase().includes("founder") ? "Founders" : s.role;
      groups[key] = (groups[key] || 0) + Number(s.equity_pct);
    });
    const unallocated = Math.max(0, 100 - totalEquity);
    if (unallocated > 0) groups["Unallocated"] = unallocated;

    const stages: { stage: string; [key: string]: number | string }[] = [
      { stage: "Current", ...groups },
    ];

    let runningGroups = { ...groups };
    rounds.forEach((round) => {
      const dilutionPct = (round.raise / (round.valuation + round.raise)) * 100;
      const factor = 1 - dilutionPct / 100;
      const newGroups: Record<string, number> = {};
      Object.entries(runningGroups).forEach(([k, v]) => {
        newGroups[k] = v * factor;
      });
      newGroups[`New (${round.name})`] = dilutionPct;
      runningGroups = newGroups;
      stages.push({ stage: round.name, ...newGroups });
    });

    return { stages, allKeys: Object.keys(stages[stages.length - 1]).filter((k) => k !== "stage") };
  }

  const { stages, allKeys } = simulateDilution();

  const founderPctAfter = rounds.length > 0
    ? Object.entries(stages[stages.length - 1]).filter(([k]) => k.toLowerCase().includes("founder")).reduce((s, [, v]) => s + (typeof v === "number" ? v : 0), 0)
    : null;

  const CHART_COLORS = ["hsl(222, 47%, 31%)", "hsl(210, 70%, 50%)", "hsl(160, 60%, 45%)", "hsl(40, 80%, 55%)", "hsl(0, 65%, 55%)", "hsl(280, 50%, 55%)", "hsl(190, 60%, 45%)", "hsl(30, 70%, 50%)"];

  return (
    <div className="space-y-6 mt-6">
      {/* Round Builder */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Round Simulator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Presets */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick add</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_ROUNDS.map((p) => (
                <Button key={p.name} size="sm" variant="outline" className="text-xs h-7" onClick={() => addPreset(p)}
                  disabled={rounds.some((r) => r.name === p.name)}>
                  <Plus className="h-3 w-3 mr-1" /> {p.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom */}
          <div className="grid grid-cols-4 gap-2 items-end">
            <div><Label className="text-xs">Round Name</Label><Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Series B" className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Valuation ($)</Label><Input type="number" value={customVal} onChange={(e) => setCustomVal(e.target.value)} placeholder="50000000" className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Raise ($)</Label><Input type="number" value={customRaise} onChange={(e) => setCustomRaise(e.target.value)} placeholder="10000000" className="h-8 text-xs" /></div>
            <Button size="sm" className="h-8 text-xs" onClick={addCustom} disabled={!customName || !customVal || !customRaise}>Add</Button>
          </div>

          {/* Rounds list */}
          {rounds.length > 0 && (
            <div className="space-y-2">
              {rounds.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2">
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Valuation: ${(r.valuation / 1_000_000).toFixed(1)}M · Raise: ${(r.raise / 1_000_000).toFixed(1)}M · Dilution: {((r.raise / (r.valuation + r.raise)) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeSimRound(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dilution Chart */}
      {rounds.length > 0 && stakeholders.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-3.5 w-3.5" /> Dilution Over Rounds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stages}>
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                <Legend />
                {allKeys.map((key, i) => (
                  <Bar key={key} dataKey={key} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>

            {founderPctAfter !== null && (
              <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${founderPctAfter < 35 ? "bg-destructive/10 text-destructive" : founderPctAfter < 50 ? "bg-amber-500/10 text-amber-700" : "bg-emerald-500/10 text-emerald-700"}`}>
                {founderPctAfter < 35
                  ? `⚠️ Founder ownership drops to ${founderPctAfter.toFixed(1)}% — below critical 35% threshold`
                  : founderPctAfter < 50
                  ? `Founder ownership at ${founderPctAfter.toFixed(1)}% — approaching minority`
                  : `Founder retains ${founderPctAfter.toFixed(1)}% ownership`}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Saved Rounds */}
      {savedRounds.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Saved Rounds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedRounds.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{r.round_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.valuation ? `$${(Number(r.valuation) / 1_000_000).toFixed(1)}M val` : "—"} · {r.raise_amount ? `$${(Number(r.raise_amount) / 1_000_000).toFixed(1)}M raise` : "—"}
                      {r.is_simulated && " · Simulated"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeRound.mutate(r.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {rounds.length > 0 && (
        <Button variant="outline" onClick={() => {
          rounds.forEach((r, i) => {
            saveRound.mutate({ startup_id: startupId, round_name: r.name, valuation: r.valuation, raise_amount: r.raise, is_simulated: true, round_order: i });
          });
        }}>
          Save Simulation
        </Button>
      )}
    </div>
  );
}
