import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useCeoInsights,
  useRefreshCeoInsights,
  type InsightCard,
  type InsightTone,
} from "@/hooks/useCeoInsights";
import { toast } from "sonner";

const TONE_BORDER: Record<InsightTone, string> = {
  positive: "border-l-emerald-500",
  warning: "border-l-amber-500",
  critical: "border-l-red-500",
  neutral: "border-l-slate-400",
};

const SOURCE_LABEL: Record<string, string> = {
  youtube: "YouTube",
  slack: "Slack",
  github: "GitHub",
  cross: "Cross-Source",
};

const SOURCE_CHIP: Record<string, string> = {
  youtube: "bg-red-500/10 text-red-600",
  slack: "bg-purple-500/10 text-purple-600 dark:text-purple-300",
  github: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  cross: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
};

function Card({ card }: { card: InsightCard }) {
  return (
    <article
      className={cn(
        "rounded-lg border border-[hsl(var(--border))] border-l-4 bg-[hsl(var(--card))] p-4",
        TONE_BORDER[card.tone] ?? TONE_BORDER.neutral
      )}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">
          {String(card.priority).padStart(2, "0")}
        </span>
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
            SOURCE_CHIP[card.source] ?? SOURCE_CHIP.cross
          )}
        >
          {SOURCE_LABEL[card.source] ?? card.source}
        </span>
      </div>
      <h3 className="text-sm font-bold leading-snug">{card.headline}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">{card.finding}</p>
      <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">→ {card.action}</p>
    </article>
  );
}

// Section B — the star feature: a scrolling feed of 6 AI-generated insight
// cards per period, ranked by priority.
export default function InsightsFeed({
  startupId,
  periodDays,
}: {
  startupId: string | undefined;
  periodDays: 7 | 15 | 30;
}) {
  const { data, isLoading, error } = useCeoInsights(startupId, periodDays);
  const refresh = useRefreshCeoInsights();

  const handleRefresh = () => {
    if (!startupId) return;
    refresh.mutate(
      { startupId, periodDays },
      {
        onSuccess: () => toast.success("Insights regenerated"),
        onError: (e) => toast.error((e as Error).message),
      }
    );
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Insights Feed
          </span>
          {data && (
            <span className="ml-2 text-[10px] text-muted-foreground">
              generated {new Date(data.generated_at).toLocaleTimeString()} {data.cached ? "· cached" : ""}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs"
          onClick={handleRefresh}
          disabled={refresh.isPending || !startupId}
        >
          {refresh.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Refresh insights
        </Button>
      </div>

      {isLoading || refresh.isPending ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-amber-300/60 bg-amber-500/5 p-4 text-xs text-amber-700 dark:text-amber-400">
          Couldn't generate insights: {(error as Error).message}. Make sure the connectors
          have synced data, then hit Refresh.
        </div>
      ) : (
        <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {(data?.insights ?? []).map((card, i) => (
            <Card key={`${card.priority}-${i}`} card={card} />
          ))}
          {(data?.insights ?? []).length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No insights yet — sync your connectors and refresh.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
