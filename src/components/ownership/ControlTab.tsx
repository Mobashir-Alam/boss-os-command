import { useState } from "react";
import { Plus, Edit2, Trash2, ShieldCheck, Crown, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useStakeholders, useBoardSeats, useSpecialRights, BoardSeat, SpecialRight } from "@/hooks/useOwnership";

const SEAT_TYPES = ["Founder", "Investor", "Independent"];
const RIGHT_TYPES = ["Veto", "Approval", "Information", "Anti-dilution", "Drag-along", "Tag-along"];
const BAR_COLORS = ["hsl(222, 47%, 31%)", "hsl(210, 70%, 50%)", "hsl(160, 60%, 45%)", "hsl(40, 80%, 55%)", "hsl(0, 65%, 55%)"];

export default function ControlTab({ startupId }: { startupId: string }) {
  const { data: stakeholders = [] } = useStakeholders(startupId);
  const { data: seats = [], upsert: upsertSeat, remove: removeSeat } = useBoardSeats(startupId);
  const { data: rights = [], upsert: upsertRight, remove: removeRight } = useSpecialRights(startupId);

  const [seatOpen, setSeatOpen] = useState(false);
  const [seatForm, setSeatForm] = useState({ holder_name: "", seat_type: "Founder", holder_role: "", notes: "", id: "" });
  const [rightOpen, setRightOpen] = useState(false);
  const [rightForm, setRightForm] = useState({ holder_name: "", right_type: "Veto", description: "", conditions: "", id: "" });

  // Voting power data
  const votingData = stakeholders
    .filter((s) => Number(s.voting_pct) > 0)
    .map((s) => ({ name: s.name, voting: Number(s.voting_pct), equity: Number(s.equity_pct) }))
    .sort((a, b) => b.voting - a.voting);

  // Control insights
  const founderVoting = stakeholders.filter((s) => s.role.toLowerCase() === "founder").reduce((sum, s) => sum + Number(s.voting_pct), 0);
  const investorVoting = stakeholders.filter((s) => s.role.toLowerCase() === "investor").reduce((sum, s) => sum + Number(s.voting_pct), 0);
  const founderSeats = seats.filter((s) => s.seat_type.toLowerCase() === "founder").length;
  const investorSeats = seats.filter((s) => s.seat_type.toLowerCase() === "investor").length;
  const totalSeats = seats.length;

  const insights: { icon: typeof Crown; text: string; type: "good" | "warn" | "danger" }[] = [];
  if (founderVoting > 50) insights.push({ icon: Crown, text: "Founder retains majority voting control", type: "good" });
  else if (founderVoting > 0) insights.push({ icon: AlertTriangle, text: `Founder voting power at ${founderVoting.toFixed(1)}% — below majority`, type: "danger" });
  if (investorVoting > founderVoting && founderVoting > 0) insights.push({ icon: AlertTriangle, text: "Investor influence exceeds founder voting power", type: "warn" });
  if (totalSeats > 0 && founderSeats <= investorSeats) insights.push({ icon: AlertTriangle, text: "Founder does not hold board majority", type: "warn" });
  if (rights.filter((r) => r.right_type.toLowerCase() === "veto").length > 0) insights.push({ icon: ShieldCheck, text: `${rights.filter((r) => r.right_type.toLowerCase() === "veto").length} veto right(s) in place`, type: "warn" });

  function openSeatEdit(s?: BoardSeat) {
    setSeatForm(s ? { holder_name: s.holder_name, seat_type: s.seat_type, holder_role: s.holder_role || "", notes: s.notes || "", id: s.id } : { holder_name: "", seat_type: "Founder", holder_role: "", notes: "", id: "" });
    setSeatOpen(true);
  }

  function openRightEdit(r?: SpecialRight) {
    setRightForm(r ? { holder_name: r.holder_name, right_type: r.right_type, description: r.description || "", conditions: r.conditions || "", id: r.id } : { holder_name: "", right_type: "Veto", description: "", conditions: "", id: "" });
    setRightOpen(true);
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Control Summary */}
      {insights.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Control Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm ${
                ins.type === "good" ? "bg-emerald-500/10 text-emerald-700" :
                ins.type === "warn" ? "bg-amber-500/10 text-amber-700" :
                "bg-destructive/10 text-destructive"
              }`}>
                <ins.icon className="h-4 w-4 shrink-0" />
                {ins.text}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Voting Power */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Voting Power</CardTitle>
        </CardHeader>
        <CardContent>
          {votingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={votingData} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                <Bar dataKey="voting" radius={[0, 4, 4, 0]} barSize={20}>
                  {votingData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Add stakeholders with voting percentages to see the chart.</p>
          )}
        </CardContent>
      </Card>

      {/* Board Structure */}
      <Card className="border-border/50">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Board Structure</CardTitle>
          <Button size="sm" onClick={() => openSeatEdit()} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Add Seat
          </Button>
        </CardHeader>
        <CardContent>
          {seats.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {SEAT_TYPES.map((type) => {
                const count = seats.filter((s) => s.seat_type.toLowerCase() === type.toLowerCase()).length;
                return (
                  <div key={type} className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">{type}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="space-y-2">
            {seats.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                <div>
                  <p className="text-sm font-medium">{s.holder_name}</p>
                  <p className="text-xs text-muted-foreground">{s.seat_type} seat{s.holder_role ? ` · ${s.holder_role}` : ""}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openSeatEdit(s)}><Edit2 className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeSeat.mutate(s.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
            {seats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No board seats defined yet.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Special Rights */}
      <Card className="border-border/50">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Special Rights</CardTitle>
          <Button size="sm" onClick={() => openRightEdit()} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Add Right
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rights.map((r) => (
              <div key={r.id} className="flex items-start justify-between py-2 border-b border-border/20 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-destructive/10 text-destructive">{r.right_type}</span>
                    <span className="text-sm font-medium">{r.holder_name}</span>
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                  {r.conditions && <p className="text-xs text-muted-foreground/70 mt-0.5">Conditions: {r.conditions}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openRightEdit(r)}><Edit2 className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeRight.mutate(r.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
            {rights.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No special rights recorded.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Board Seat Dialog */}
      <Dialog open={seatOpen} onOpenChange={setSeatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{seatForm.id ? "Edit" : "Add"} Board Seat</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Holder Name</Label><Input value={seatForm.holder_name} onChange={(e) => setSeatForm({ ...seatForm, holder_name: e.target.value })} /></div>
            <div>
              <Label>Seat Type</Label>
              <Select value={seatForm.seat_type} onValueChange={(v) => setSeatForm({ ...seatForm, seat_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEAT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Role / Title</Label><Input value={seatForm.holder_role} onChange={(e) => setSeatForm({ ...seatForm, holder_role: e.target.value })} placeholder="e.g. CEO, Lead Investor" /></div>
            <Button className="w-full" disabled={!seatForm.holder_name} onClick={() => {
              upsertSeat.mutate({ ...(seatForm.id ? { id: seatForm.id } : {}), startup_id: startupId, holder_name: seatForm.holder_name, seat_type: seatForm.seat_type, holder_role: seatForm.holder_role || null, notes: seatForm.notes || null }, { onSuccess: () => setSeatOpen(false) });
            }}>{seatForm.id ? "Save" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Special Right Dialog */}
      <Dialog open={rightOpen} onOpenChange={setRightOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{rightForm.id ? "Edit" : "Add"} Special Right</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Holder</Label><Input value={rightForm.holder_name} onChange={(e) => setRightForm({ ...rightForm, holder_name: e.target.value })} /></div>
            <div>
              <Label>Right Type</Label>
              <Select value={rightForm.right_type} onValueChange={(v) => setRightForm({ ...rightForm, right_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RIGHT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={rightForm.description} onChange={(e) => setRightForm({ ...rightForm, description: e.target.value })} rows={2} /></div>
            <div><Label>Conditions</Label><Input value={rightForm.conditions} onChange={(e) => setRightForm({ ...rightForm, conditions: e.target.value })} placeholder="e.g. Above $500K" /></div>
            <Button className="w-full" disabled={!rightForm.holder_name} onClick={() => {
              upsertRight.mutate({ ...(rightForm.id ? { id: rightForm.id } : {}), startup_id: startupId, holder_name: rightForm.holder_name, right_type: rightForm.right_type, description: rightForm.description || null, conditions: rightForm.conditions || null }, { onSuccess: () => setRightOpen(false) });
            }}>{rightForm.id ? "Save" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
