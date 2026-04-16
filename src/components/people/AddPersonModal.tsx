import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Person } from "@/hooks/usePeople";

const ROLES = [
  { value: "founder", label: "Founder" },
  { value: "mfo", label: "MFO" },
  { value: "functional_head", label: "Functional Head" },
  { value: "project_manager", label: "Project Manager" },
  { value: "team_member", label: "Team Member" },
  { value: "cfo", label: "CFO" },
];

const EMP_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
];

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "at_risk", label: "At Risk" },
  { value: "top_performer", label: "Top Performer" },
  { value: "inactive", label: "Inactive" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (p: Partial<Person>) => void;
  isPending: boolean;
  startups: { id: string; name: string }[];
  people: Person[];
  editPerson?: Person | null;
}

export default function AddPersonModal({ open, onOpenChange, onSubmit, isPending, startups, people, editPerson }: Props) {
  const [form, setForm] = useState<Partial<Person>>(editPerson || {
    full_name: "", role: "team_member", department: "", employment_type: "full_time",
    status: "active", salary: 0, cost_to_company: 0, linked_startups: [],
    reporting_manager_id: null, joining_date: null,
    kpi_score: 0, productivity_score: 0, weekly_output_score: 0,
    hours_committed: 0, hours_delivered: 0, tasks_assigned: 0, tasks_completed: 0,
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{editPerson ? "Edit" : "Add"} Person</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 text-sm">
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Full Name *</Label>
            <Input value={form.full_name || ""} onChange={(e) => set("full_name", e.target.value)} required className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select value={form.role || "team_member"} onValueChange={(v) => set("role", v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Department</Label>
            <Input value={form.department || ""} onChange={(e) => set("department", e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Employment Type</Label>
            <Select value={form.employment_type || "full_time"} onValueChange={(v) => set("employment_type", v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{EMP_TYPES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={form.status || "active"} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Reporting Manager</Label>
            <Select value={form.reporting_manager_id || "none"} onValueChange={(v) => set("reporting_manager_id", v === "none" ? null : v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {people.filter((p) => p.id !== editPerson?.id).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Joining Date</Label>
            <Input type="date" value={form.joining_date || ""} onChange={(e) => set("joining_date", e.target.value)} className="h-9 text-sm" />
          </div>

          <div className="col-span-2 border-t pt-3 mt-1">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Compensation</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Salary</Label>
            <Input type="number" value={form.salary || 0} onChange={(e) => set("salary", +e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cost to Company</Label>
            <Input type="number" value={form.cost_to_company || 0} onChange={(e) => set("cost_to_company", +e.target.value)} className="h-9 text-sm" />
          </div>

          <div className="col-span-2 border-t pt-3 mt-1">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Performance</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">KPI Score (%)</Label>
            <Input type="number" value={form.kpi_score || 0} onChange={(e) => set("kpi_score", +e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Productivity Score (%)</Label>
            <Input type="number" value={form.productivity_score || 0} onChange={(e) => set("productivity_score", +e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Weekly Output Score</Label>
            <Input type="number" value={form.weekly_output_score || 0} onChange={(e) => set("weekly_output_score", +e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="flex flex-col justify-end">
            <Label className="text-xs text-muted-foreground">Efficiency Ratio</Label>
            <div className="h-9 flex items-center px-3 rounded-md border bg-muted/30 text-sm text-muted-foreground">
              {form.hours_committed ? ((form.weekly_output_score || 0) / (form.hours_committed || 1)).toFixed(2) : "—"}
            </div>
          </div>

          <div className="col-span-2 border-t pt-3 mt-1">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Tracking</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Hours Committed</Label>
            <Input type="number" value={form.hours_committed || 0} onChange={(e) => set("hours_committed", +e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Hours Delivered</Label>
            <Input type="number" value={form.hours_delivered || 0} onChange={(e) => set("hours_delivered", +e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tasks Assigned</Label>
            <Input type="number" value={form.tasks_assigned || 0} onChange={(e) => set("tasks_assigned", +e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tasks Completed</Label>
            <Input type="number" value={form.tasks_completed || 0} onChange={(e) => set("tasks_completed", +e.target.value)} className="h-9 text-sm" />
          </div>

          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isPending || !form.full_name}>
              {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {editPerson ? "Save" : "Add Person"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
