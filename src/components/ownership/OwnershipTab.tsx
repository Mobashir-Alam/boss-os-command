import { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useStakeholders, Stakeholder } from "@/hooks/useOwnership";

const COLORS = [
  "hsl(222, 47%, 31%)", "hsl(210, 70%, 50%)", "hsl(160, 60%, 45%)",
  "hsl(40, 80%, 55%)", "hsl(0, 65%, 55%)", "hsl(280, 50%, 55%)",
  "hsl(190, 60%, 45%)", "hsl(30, 70%, 50%)",
];

const ROLES = ["Founder", "Investor", "Advisor", "Employee"];
const EQUITY_TYPES = ["Vested", "Unvested", "Promised"];

interface StakeholderFormData {
  name: string;
  role: string;
  equity_pct: string;
  equity_type: string;
  voting_pct: string;
  vesting_schedule: string;
  notes: string;
}

const emptyForm: StakeholderFormData = {
  name: "", role: "Founder", equity_pct: "", equity_type: "Vested",
  voting_pct: "", vesting_schedule: "", notes: "",
};

export default function OwnershipTab({ startupId }: { startupId: string }) {
  const { data: stakeholders = [], upsert, remove } = useStakeholders(startupId);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<StakeholderFormData>(emptyForm);

  const totalEquity = stakeholders.reduce((s, sh) => s + Number(sh.equity_pct), 0);
  const unallocated = Math.max(0, 100 - totalEquity);

  const pieData = [
    ...stakeholders.map((s) => ({ name: s.name, value: Number(s.equity_pct), role: s.role })),
    ...(unallocated > 0 ? [{ name: "Unallocated", value: unallocated, role: "" }] : []),
  ];

  const committed = stakeholders.filter((s) => s.equity_type.toLowerCase() === "promised" || s.equity_type.toLowerCase() === "unvested");

  function openEdit(s: Stakeholder) {
    setEditId(s.id);
    setForm({
      name: s.name, role: s.role, equity_pct: String(s.equity_pct),
      equity_type: s.equity_type, voting_pct: String(s.voting_pct),
      vesting_schedule: s.vesting_schedule || "", notes: s.notes || "",
    });
    setOpen(true);
  }

  function openNew() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function handleSave() {
    upsert.mutate({
      ...(editId ? { id: editId } : {}),
      startup_id: startupId,
      name: form.name,
      role: form.role,
      equity_pct: parseFloat(form.equity_pct) || 0,
      equity_type: form.equity_type,
      voting_pct: parseFloat(form.voting_pct) || parseFloat(form.equity_pct) || 0,
      vesting_schedule: form.vesting_schedule || null,
      notes: form.notes || null,
    }, { onSuccess: () => setOpen(false) });
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Pie + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Equity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {stakeholders.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name} ${value.toFixed(1)}%`} labelLine={false}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={i < COLORS.length ? COLORS[i] : COLORS[i % COLORS.length]} opacity={pieData[i]?.name === "Unallocated" ? 0.2 : 1} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No stakeholders yet</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Summary</CardTitle>
            <Button size="sm" onClick={openNew} className="h-7 text-xs gap-1">
              <Plus className="h-3 w-3" /> Add Stakeholder
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Allocated</p>
                <p className="text-lg font-bold">{totalEquity.toFixed(1)}%</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Unallocated</p>
                <p className="text-lg font-bold">{unallocated.toFixed(1)}%</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Stakeholders</p>
                <p className="text-lg font-bold">{stakeholders.length}</p>
              </div>
            </div>
            {stakeholders.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Add your first stakeholder to begin tracking equity.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {stakeholders.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Stakeholder Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Name</th>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Role</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Equity %</th>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Type</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Voting %</th>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Vesting</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {stakeholders.map((s) => (
                    <tr key={s.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-medium">{s.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">{s.role}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{Number(s.equity_pct).toFixed(2)}%</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          s.equity_type.toLowerCase() === "vested" ? "bg-emerald-500/10 text-emerald-600" :
                          s.equity_type.toLowerCase() === "promised" ? "bg-amber-500/10 text-amber-600" :
                          "bg-blue-500/10 text-blue-600"
                        }`}>{s.equity_type}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{Number(s.voting_pct).toFixed(2)}%</td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">{s.vesting_schedule || "—"}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(s)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove.mutate(s.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Committed / Promised Section */}
      {committed.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-amber-600">Committed / Promised Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {committed.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-amber-500/10 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.role} · {s.equity_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold">{Number(s.equity_pct).toFixed(2)}%</p>
                    {s.vesting_schedule && <p className="text-xs text-muted-foreground">{s.vesting_schedule}</p>}
                  </div>
                </div>
              ))}
              <p className="text-xs text-amber-600/70 mt-2">
                Total committed: {committed.reduce((s, c) => s + Number(c.equity_pct), 0).toFixed(2)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stakeholder Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Add"} Stakeholder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Smith" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Equity Type</Label>
                <Select value={form.equity_type} onValueChange={(v) => setForm({ ...form, equity_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EQUITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Equity %</Label>
                <Input type="number" step="0.01" value={form.equity_pct} onChange={(e) => setForm({ ...form, equity_pct: e.target.value })} placeholder="e.g. 25.00" />
              </div>
              <div>
                <Label>Voting %</Label>
                <Input type="number" step="0.01" value={form.voting_pct} onChange={(e) => setForm({ ...form, voting_pct: e.target.value })} placeholder="Same as equity if blank" />
              </div>
            </div>
            <div>
              <Label>Vesting Schedule</Label>
              <Input value={form.vesting_schedule} onChange={(e) => setForm({ ...form, vesting_schedule: e.target.value })} placeholder="e.g. 4yr cliff 1yr, monthly" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." rows={2} />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={!form.name || !form.equity_pct}>
              {editId ? "Save Changes" : "Add Stakeholder"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
