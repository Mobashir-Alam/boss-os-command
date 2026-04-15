import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { type KaiRole, type InsightSeverity, roleKaiInsights } from "@/data/kaiRoleInsights";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const severityStyles: Record<InsightSeverity, { border: string; badge: string; dot: string }> = {
  critical: {
    border: "border-l-red-500",
    badge: "bg-red-500/10 text-red-500 border-red-500/30",
    dot: "bg-red-500",
  },
  warning: {
    border: "border-l-amber-500",
    badge: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    dot: "bg-amber-500",
  },
  info: {
    border: "border-l-blue-500",
    badge: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    dot: "bg-blue-500",
  },
  positive: {
    border: "border-l-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
};

interface KaiRoleInsightsProps {
  role: KaiRole;
  className?: string;
  compact?: boolean;
}

const KaiRoleInsights = ({ role, className, compact = false }: KaiRoleInsightsProps) => {
  const insights = roleKaiInsights[role] || [];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (insights.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          KAI Insights
        </h3>
      </div>
      <div className="space-y-2">
        {insights.map((item) => {
          const s = severityStyles[item.severity];
          const isOpen = expandedId === item.id;

          return (
            <Collapsible
              key={item.id}
              open={isOpen}
              onOpenChange={() => setExpandedId(isOpen ? null : item.id)}
            >
              <Card className={cn("border-l-2 border-border/40", s.border)}>
                <CollapsibleTrigger className="w-full">
                  <CardContent className={cn("p-3", compact && "py-2")}>
                    <div className="flex items-start gap-2">
                      <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0", s.dot)} />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 border-border/40 text-muted-foreground"
                          >
                            KAI · {item.label}
                          </Badge>
                          {item.metric && (
                            <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                              {item.metricValue}
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed">{item.insight}</p>
                      </div>
                      <div className="flex-shrink-0 mt-0.5">
                        {isOpen ? (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0">
                    <div className="rounded-lg bg-muted/30 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};

export default KaiRoleInsights;
