import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useStartups, type DbStartup } from "@/hooks/useStartups";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Building2 } from "lucide-react";

interface StartupFormData {
  name: string;
  slug: string;
  status: string;
  runway: string;
  growth: string;
  growth_direction: string;
  insight: string;
  insight_detail: string;
}

const emptyForm: StartupFormData = {
  name: "", slug: "", status: "healthy", runway: "", growth: "",
  growth_direction: "up", insight: "", insight_detail: "",
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const AddStartupModal = () => {
  const { isFounder } = useAuth();
  const { addStartup } = useStartups();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StartupFormData>(emptyForm);
  const [loading, setLoading] = useState(false);

  if (!isFounder) return null;

  const handleSubmit = async () => {
    if (!form.name) return;
    setLoading(true);
    try {
      await addStartup.mutateAsync({
        name: form.name,
        slug: form.slug || slugify(form.name),
        status: form.status,
        runway: form.runway,
        growth: form.growth,
        growth_direction: form.growth_direction,
        insight: form.insight,
        insight_detail: form.insight_detail,
        spark_data: [] as any,
      });
      toast.success(`${form.name} added`);
      setForm(emptyForm);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add startup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Startup
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Startup</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))} placeholder="Startup name" />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="at-risk">At Risk</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Runway</Label>
              <Input value={form.runway} onChange={e => setForm(f => ({ ...f, runway: e.target.value }))} placeholder="e.g. 8 months" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Growth</Label>
              <Input value={form.growth} onChange={e => setForm(f => ({ ...f, growth: e.target.value }))} placeholder="e.g. +12%" />
            </div>
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select value={form.growth_direction} onValueChange={v => setForm(f => ({ ...f, growth_direction: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="up">Up</SelectItem>
                  <SelectItem value="down">Down</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Key Insight</Label>
            <Input value={form.insight} onChange={e => setForm(f => ({ ...f, insight: e.target.value }))} placeholder="Short insight headline" />
          </div>
          <div className="space-y-1.5">
            <Label>Insight Detail</Label>
            <Textarea value={form.insight_detail} onChange={e => setForm(f => ({ ...f, insight_detail: e.target.value }))} placeholder="Detailed context..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading || !form.name}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add Startup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const EditStartupModal = ({ startup, onClose }: { startup: DbStartup; onClose: () => void }) => {
  const { updateStartup } = useStartups();
  const [form, setForm] = useState<StartupFormData>({
    name: startup.name,
    slug: startup.slug,
    status: startup.status,
    runway: startup.runway,
    growth: startup.growth,
    growth_direction: startup.growth_direction,
    insight: startup.insight,
    insight_detail: startup.insight_detail,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateStartup.mutateAsync({
        id: startup.id,
        name: form.name,
        slug: form.slug,
        status: form.status,
        runway: form.runway,
        growth: form.growth,
        growth_direction: form.growth_direction,
        insight: form.insight,
        insight_detail: form.insight_detail,
      });
      toast.success(`${form.name} updated`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Edit {startup.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="at-risk">At Risk</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Runway</Label>
            <Input value={form.runway} onChange={e => setForm(f => ({ ...f, runway: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Growth</Label>
            <Input value={form.growth} onChange={e => setForm(f => ({ ...f, growth: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Direction</Label>
            <Select value={form.growth_direction} onValueChange={v => setForm(f => ({ ...f, growth_direction: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="up">Up</SelectItem>
                <SelectItem value="down">Down</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Key Insight</Label>
          <Input value={form.insight} onChange={e => setForm(f => ({ ...f, insight: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Insight Detail</Label>
          <Textarea value={form.insight_detail} onChange={e => setForm(f => ({ ...f, insight_detail: e.target.value }))} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading || !form.name}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export const DeleteStartupButton = ({ startup, onDone }: { startup: DbStartup; onDone?: () => void }) => {
  const { deleteStartup } = useStartups();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${startup.name}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await deleteStartup.mutateAsync(startup.id);
      toast.success(`${startup.name} deleted`);
      onDone?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleDelete} disabled={loading} className="h-7 w-7 text-destructive hover:text-destructive">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </Button>
  );
};

export const StartupManagementPanel = () => {
  const { isFounder } = useAuth();
  const { dbStartups, isLoading } = useStartups();
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!isFounder) return null;

  const statusColors: Record<string, string> = {
    healthy: "bg-green-500/20 text-green-600",
    "at-risk": "bg-amber-500/20 text-amber-600",
    critical: "bg-red-500/20 text-red-600",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Manage Startups</h3>
          <span className="text-xs text-muted-foreground">({dbStartups.length})</span>
        </div>
        <AddStartupModal />
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
      ) : (
        <div className="space-y-2">
          {dbStartups.map((s) => (
            <Dialog key={s.id} open={editingId === s.id} onOpenChange={(open) => setEditingId(open ? s.id : null)}>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[s.status] || ""}`}>
                    {s.status}
                  </span>
                  <span className="text-sm font-medium">{s.name}</span>
                  {s.runway && <span className="text-xs text-muted-foreground">{s.runway}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(s.id)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <DeleteStartupButton startup={s} />
                </div>
              </div>
              {editingId === s.id && <EditStartupModal startup={s} onClose={() => setEditingId(null)} />}
            </Dialog>
          ))}
        </div>
      )}
    </div>
  );
};
