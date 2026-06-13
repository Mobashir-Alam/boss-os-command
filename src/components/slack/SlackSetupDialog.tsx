import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import InfoTooltip from "@/components/social/InfoTooltip";
import {
  useSlackConfig, useSaveSlackConfig, type SlackMonitoringConfig, type SlackChannel,
} from "@/hooks/useSlack";

const TIMEZONES = [
  "Asia/Kolkata", "Asia/Karachi", "Asia/Dhaka", "Asia/Dubai",
  "Asia/Riyadh", "Asia/Jakarta", "Asia/Singapore", "UTC",
];

const DEFAULT_CONFIG: SlackMonitoringConfig = {
  attendance_channel_id: null,
  attendance_channel_name: null,
  updates_channel_suffix: "work-update",
  timezone: "Asia/Kolkata",
  day_boundary_hour: 6,
  update_backfill_cap_days: 3,
  is_enabled: true,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startupId: string;
  channels: SlackChannel[] | undefined;
}

export default function SlackSetupDialog({ open, onOpenChange, startupId, channels }: Props) {
  const { data: existing } = useSlackConfig(startupId);
  const { mutateAsync: save, isPending } = useSaveSlackConfig();
  const [form, setForm] = useState<SlackMonitoringConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (existing) setForm({ ...DEFAULT_CONFIG, ...existing });
  }, [existing]);

  const nonArchived = (channels ?? []).filter((c) => !c.is_archived);
  const matchingUpdates = nonArchived.filter((c) =>
    c.channel_name?.endsWith(form.updates_channel_suffix)
  );

  async function handleSave() {
    if (!form.attendance_channel_id) {
      toast.error("Pick an attendance channel first");
      return;
    }
    try {
      await save({ startupId, config: form });
      toast.success("Monitoring config saved — re-sync to compute attendance");
      onOpenChange(false);
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Attendance monitoring setup</DialogTitle>
          <DialogDescription>
            Tell the system which channels signal attendance and work updates.
            After saving, run a sync to compute the records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Enabled */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Monitoring enabled</Label>
              <p className="text-xs text-muted-foreground">Turn off to pause attendance computation.</p>
            </div>
            <Switch
              checked={form.is_enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}
            />
          </div>

          {/* Attendance channel */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              Attendance channel
              <InfoTooltip size="xs">The channel where people post to clock in. First message per person per day = check-in.</InfoTooltip>
            </Label>
            <Select
              value={form.attendance_channel_id ?? ""}
              onValueChange={(v) => {
                const ch = nonArchived.find((c) => c.channel_id === v);
                setForm((f) => ({ ...f, attendance_channel_id: v, attendance_channel_name: ch?.channel_name ?? null }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select #attendance channel" />
              </SelectTrigger>
              <SelectContent>
                {nonArchived.map((c) => (
                  <SelectItem key={c.channel_id} value={c.channel_id}>
                    {c.is_private ? "🔒 " : "# "}{c.channel_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Updates suffix */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              Work-update channel suffix
              <InfoTooltip size="xs">Any channel whose name ends with this counts as an updates channel (e.g. tech-work-update, design-work-update). New teams are picked up automatically.</InfoTooltip>
            </Label>
            <Input
              value={form.updates_channel_suffix}
              onChange={(e) => setForm((f) => ({ ...f, updates_channel_suffix: e.target.value }))}
              placeholder="work-update"
            />
            <p className="text-xs text-muted-foreground">
              {matchingUpdates.length} matching channel{matchingUpdates.length === 1 ? "" : "s"}
              {matchingUpdates.length > 0 && `: ${matchingUpdates.slice(0, 4).map((c) => c.channel_name).join(", ")}${matchingUpdates.length > 4 ? "…" : ""}`}
            </p>
          </div>

          {/* Timezone + boundary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                Timezone
                <InfoTooltip size="xs">Used to bucket activity into the correct local work-day.</InfoTooltip>
              </Label>
              <Select
                value={form.timezone}
                onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                Day starts at
                <InfoTooltip size="xs">The work-day runs from this hour to the same hour next day, so night shifts stay in one row instead of splitting at midnight. 6 = 6am.</InfoTooltip>
              </Label>
              <Select
                value={String(form.day_boundary_hour)}
                onValueChange={(v) => setForm((f) => ({ ...f, day_boundary_hour: parseInt(v, 10) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Update backfill cap */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              Batch-update grace
              <InfoTooltip size="xs">When someone posts one update covering several missed days, the prior gap days (up to this many) are credited as "caught up" instead of missed. 0 = strict: only the day posted counts.</InfoTooltip>
            </Label>
            <Select
              value={String(form.update_backfill_cap_days)}
              onValueChange={(v) => setForm((f) => ({ ...f, update_backfill_cap_days: parseInt(v, 10) }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Strict (no backfill)</SelectItem>
                {[1, 2, 3, 4, 5, 7].map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} day{d === 1 ? "" : "s"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Save config
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
