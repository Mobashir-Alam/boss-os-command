import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { CONNECTOR_REGISTRY } from "@/connectors/types";
import type { ConnectorCredentialRow, ConnectorType } from "@/connectors/types";
import { useSaveConnectorCredential } from "@/hooks/useConnectors";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  startupId: string;
  existingCredentials: ConnectorCredentialRow[];
}

export default function ConnectorSetupModal({ open, onOpenChange, startupId, existingCredentials }: Props) {
  const [selected, setSelected] = useState<ConnectorType>("github");
  const [fields, setFields] = useState<Record<string, string>>({});

  const saveCredential = useSaveConnectorCredential();

  const connector = CONNECTOR_REGISTRY.find((c) => c.type === selected)!;
  const existing = existingCredentials.find((c) => c.connector_type === selected);

  const handleSave = () => {
    if (!startupId) return;
    const missingFields = connector.credentialFields.filter((f) => !fields[f.key]?.trim());
    if (missingFields.length > 0) {
      toast.error(`Fill in: ${missingFields.map((f) => f.label).join(", ")}`);
      return;
    }

    const processedFields: Record<string, string | string[]> = { ...fields };
    // Slack channel_ids is a comma-separated string → array
    if (selected === "slack" && fields.channel_ids) {
      processedFields.channel_ids = fields.channel_ids.split(",").map((s) => s.trim()).filter(Boolean);
    }

    saveCredential.mutate(
      {
        startupId,
        connectorType: selected,
        label: `${connector.label} — Nasheedio`,
        credentials: processedFields as Record<string, string>,
      },
      {
        onSuccess: () => {
          toast.success(`${connector.label} connected`);
          setFields({});
        },
        onError: (e: any) => toast.error(e.message ?? "Failed to save"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Connector setup</DialogTitle>
        </DialogHeader>

        {/* Connector picker */}
        <div className="flex gap-2 flex-wrap">
          {CONNECTOR_REGISTRY.map((c) => {
            const isConnected = !!existingCredentials.find((e) => e.connector_type === c.type && e.is_active);
            return (
              <button
                key={c.type}
                onClick={() => { setSelected(c.type); setFields({}); }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selected === c.type
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {isConnected
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  : <Circle className="h-3.5 w-3.5" />}
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{connector.description}</p>
          {existing && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">Connected</Badge>
              {existing.last_synced_at && (
                <span className="text-xs">Last sync: {new Date(existing.last_synced_at).toLocaleString()}</span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 py-2">
          {connector.credentialFields.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {f.label}
              </label>
              <Input
                type={f.secret ? "password" : "text"}
                placeholder={f.placeholder}
                value={fields[f.key] ?? ""}
                onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="mt-1 font-mono text-sm"
              />
            </div>
          ))}
        </div>

        {selected === "github" && (
          <p className="text-xs text-muted-foreground">
            Create a PAT at github.com/settings/tokens with <code className="bg-muted px-1 rounded">repo</code>{" "}
            and <code className="bg-muted px-1 rounded">read:org</code> scopes.
          </p>
        )}
        {selected === "slack" && (
          <p className="text-xs text-muted-foreground">
            Create a Slack bot at api.slack.com, add it to channels, and use the Bot Token (xoxb-…).
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saveCredential.isPending}>
            {saveCredential.isPending ? "Saving…" : existing ? "Update credentials" : "Save & connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
