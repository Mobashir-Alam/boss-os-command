import type { KaiScoreData } from "@/data/kai";

interface KaiScoreCardProps {
  score: KaiScoreData;
}

const KaiScoreCard = ({ score }: KaiScoreCardProps) => {
  const getScoreColor = (total: number) => {
    if (total >= 8) return "text-destructive";
    if (total >= 6) return "text-amber-500";
    return "text-muted-foreground";
  };

  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
        Priority Score
      </p>
      <div className="flex items-end gap-4">
        <div>
          <p className={`text-3xl font-bold tabular-nums ${getScoreColor(score.total)}`}>
            {score.total.toFixed(1)}
          </p>
          <p className="text-[10px] text-muted-foreground">/ 10</p>
        </div>
        <div className="flex gap-4 pb-1">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Impact</p>
            <p className="text-sm font-semibold tabular-nums">{score.impact}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Urgency</p>
            <p className="text-sm font-semibold tabular-nums">{score.urgency}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Effort</p>
            <p className="text-sm font-semibold tabular-nums">{score.effort}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KaiScoreCard;
