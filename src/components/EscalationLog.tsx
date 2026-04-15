import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEscalations, type Escalation, type EscalationStatus } from "@/contexts/EscalationContext";
import { useStartups } from "@/hooks/useStartups";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Megaphone,
} from "lucide-react";

const statusConfig: Record<EscalationStatus, { label: string; color: string; dot: string; bg: string }> = {
  pending: {
    label: "Pending",
    color: "text-destructive",
    dot: "bg-destructive",
    bg: "bg-destructive/10 border-destructive/20",
  },
  acknowledged: {
    label: "Acknowledged",
    color: "text-amber-500",
    dot: "bg-amber-500",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  resolved: {
    label: "Resolved",
    color: "text-emerald-500",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
};

interface EscalationLogProps {
  className?: string;
  canAct?: boolean; // Founder can acknowledge/resolve
}

const EscalationLog = ({ className, canAct = false }: EscalationLogProps) => {
  const { escalations, updateStatus, pendingCount } = useEscalations();
  const { startups } = useStartups();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = escalations.filter((e) =>
    filterStatus === "all" ? true : e.status === filterStatus
  );

  const startupName = (id: string) => startups.find((s) => s.id === id)?.name || id;

  const handleAcknowledge = (esc: Escalation) => {
    updateStatus(esc.id, "acknowledged", "Founder");
    toast.success(`Acknowledged escalation for "${esc.taskTitle}"`);
  };

  const handleResolve = (esc: Escalation) => {
    updateStatus(esc.id, "resolved", "Founder");
    toast.success(`Resolved escalation for "${esc.taskTitle}"`);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-destructive" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Escalations
          </h2>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-2 py-1">
          <Filter className="h-2.5 w-2.5 text-muted-foreground" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent text-[11px] font-medium outline-none cursor-pointer"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No escalations.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((esc) => {
            const cfg = statusConfig[esc.status];
            return (
              <Card key={esc.id} className={cn("border-l-2", `border-l-${esc.status === "pending" ? "destructive" : esc.status === "acknowledged" ? "amber-500" : "emerald-500"}`, "border-border/40")}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{esc.taskTitle}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                        <span className="bg-muted/50 rounded px-1.5 py-0.5">{startupName(esc.linkedStartupId)}</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />{esc.timestamp}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] flex-shrink-0", cfg.bg, cfg.color)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full mr-1", cfg.dot)} />
                      {cfg.label}
                    </Badge>
                  </div>

                  {/* Raised by + reason */}
                  <div className="rounded-lg bg-muted/30 px-2.5 py-2 mt-2">
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-semibold">Raised by:</span> {esc.raisedBy}
                    </p>
                    <p className="text-xs text-foreground/80 mt-0.5">{esc.reason}</p>
                  </div>

                  {/* Resolution info */}
                  {esc.status === "resolved" && esc.resolvedAt && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Resolved by {esc.resolvedBy} · {esc.resolvedAt}
                    </div>
                  )}

                  {/* Actions — only for Founder */}
                  {canAct && esc.status !== "resolved" && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/20">
                      {esc.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => handleAcknowledge(esc)}
                        >
                          <Eye className="h-3 w-3 mr-0.5" /> Acknowledge
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                        onClick={() => handleResolve(esc)}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> Resolve
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EscalationLog;
