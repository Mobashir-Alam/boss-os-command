import { Link } from "react-router-dom";
import { GitCommit, CalendarCheck2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePeoplePulse } from "@/hooks/usePeoplePulse";

function scoreColor(score: number): string {
  if (score > 0.7) return "bg-emerald-500";
  if (score >= 0.4) return "bg-amber-500";
  return "bg-red-500";
}

// Section D — compact activity card per linked employee (7-day window).
// combo score = attendance*0.4 + normalized commits*0.6
export default function PeoplePulse({ startupId }: { startupId: string | undefined }) {
  const { data, isLoading } = usePeoplePulse(startupId);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          People Pulse · last 7 days
        </span>
        <Link
          to="/people"
          className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-accent hover:underline underline-offset-2"
        >
          People OS <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Link employees in People OS to see their activity here.
          </p>
          <Link
            to="/people"
            className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline underline-offset-2"
          >
            Link employees <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {data.map((p) => (
            <div
              key={p.personId}
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[10px] font-semibold">
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">{p.name}</span>
                <span
                  title={`Combo score ${(p.comboScore * 100).toFixed(0)}%`}
                  className={cn("h-2.5 w-2.5 shrink-0 rounded-full", scoreColor(p.comboScore))}
                />
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <GitCommit className="h-3 w-3" />
                  <span className="tabular-nums font-medium text-foreground">{p.commits7d}</span>
                  commits
                  {!p.githubLogin && <span className="text-[9px]">(not linked)</span>}
                </p>
                <p className="flex items-center gap-1.5">
                  <CalendarCheck2 className="h-3 w-3" />
                  <span className="tabular-nums font-medium text-foreground">
                    {p.attendanceDays7d}/{p.workDays7d || "—"}
                  </span>
                  days present
                  {!p.slackUserId && <span className="text-[9px]">(not linked)</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
