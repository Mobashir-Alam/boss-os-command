import { Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useStakeholders, useBoardSeats, useSpecialRights } from "@/hooks/useOwnership";

export default function OwnershipKaiInsights({ startupId }: { startupId: string }) {
  const { data: stakeholders = [] } = useStakeholders(startupId);
  const { data: seats = [] } = useBoardSeats(startupId);
  const { data: rights = [] } = useSpecialRights(startupId);

  if (stakeholders.length === 0) return null;

  const insights: string[] = [];

  const founderEquity = stakeholders.filter((s) => s.role.toLowerCase() === "founder").reduce((sum, s) => sum + Number(s.equity_pct), 0);
  const totalVoting = stakeholders.reduce((s, sh) => s + Number(sh.voting_pct), 0);
  const founderVoting = stakeholders.filter((s) => s.role.toLowerCase() === "founder").reduce((sum, s) => sum + Number(s.voting_pct), 0);
  const committed = stakeholders.filter((s) => ["promised", "unvested"].includes(s.equity_type.toLowerCase())).reduce((sum, s) => sum + Number(s.equity_pct), 0);
  const founderSeats = seats.filter((s) => s.seat_type.toLowerCase() === "founder").length;
  const investorSeats = seats.filter((s) => s.seat_type.toLowerCase() === "investor").length;

  if (founderEquity < 35) insights.push(`Founder ownership at ${founderEquity.toFixed(1)}% — consider protecting equity before the next round.`);
  if (founderEquity >= 35 && founderEquity < 50) insights.push(`Founder at ${founderEquity.toFixed(1)}% — one more round may push below critical threshold.`);
  if (founderVoting > 0 && founderVoting < founderEquity) insights.push("Voting power is lower than ownership — review voting structure.");
  if (committed > 10) insights.push(`${committed.toFixed(1)}% equity is committed/promised — factor into dilution planning.`);
  if (seats.length > 0 && founderSeats <= investorSeats) insights.push("Investors match or exceed founder board seats — control risk emerging.");
  if (rights.filter((r) => r.right_type.toLowerCase() === "veto").length > 2) insights.push("Multiple veto rights in place — may slow decision-making.");
  if (stakeholders.length > 0 && founderEquity > 60) insights.push("Strong founder position — consider expanding ESOP pool for key hires.");

  if (insights.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Brain className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">KAI Strategic Insight</p>
            {insights.map((ins, i) => (
              <p key={i} className="text-sm text-foreground/80">{ins}</p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
