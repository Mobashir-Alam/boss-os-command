import { useFinancialEntries, useBurnCategories, useCashFlowEntries, useFinancialForecasts } from "@/hooks/useFinancialData";
import { TrendingDown, TrendingUp, Wallet, AlertTriangle, DollarSign, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancesTabProps {
  startupId: string;
}

const FinancesTab = ({ startupId }: FinancesTabProps) => {
  const { data: entries = [] } = useFinancialEntries(startupId);
  const { data: burnCats = [] } = useBurnCategories(startupId);
  const { data: cashFlows = [] } = useCashFlowEntries(startupId);
  const { data: forecasts = [] } = useFinancialForecasts(startupId);

  const totalExpenses = entries.filter(e => e.entry_type === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const totalRevenue = entries.filter(e => e.entry_type === "revenue").reduce((s, e) => s + Number(e.amount), 0);
  const totalBurn = burnCats.reduce((s, c) => s + Number(c.monthly_amount), 0);
  const totalInflow = cashFlows.filter(c => c.flow_type === "inflow").reduce((s, c) => s + Number(c.amount), 0);
  const totalOutflow = cashFlows.filter(c => c.flow_type === "outflow").reduce((s, c) => s + Number(c.amount), 0);
  const netCashFlow = totalInflow - totalOutflow;
  const runwayMonths = totalBurn > 0 ? Math.round(netCashFlow / totalBurn) : null;

  const latestForecast = forecasts.length > 0 ? forecasts[forecasts.length - 1] : null;

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
    if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
    return `₹${n.toLocaleString("en-IN")}`;
  };

  const hasData = entries.length > 0 || burnCats.length > 0 || cashFlows.length > 0;

  if (!hasData) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
        <DollarSign className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No financial data yet. Your CFO/Finance Manager can add data from the Financial Command dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={TrendingDown} label="Monthly Burn" value={fmt(totalBurn)} color="text-red-500" />
        <SummaryCard icon={TrendingUp} label="Revenue" value={fmt(totalRevenue)} color="text-emerald-500" />
        <SummaryCard icon={Wallet} label="Net Cash Flow" value={fmt(netCashFlow)} color={netCashFlow >= 0 ? "text-emerald-500" : "text-red-500"} />
        <SummaryCard icon={BarChart3} label="Est. Runway" value={runwayMonths !== null ? `${runwayMonths} mo` : "—"} color="text-blue-500" />
      </div>

      {/* Risk Alerts */}
      {(totalBurn > totalRevenue || (runwayMonths !== null && runwayMonths < 6)) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">KAI Financial Alert</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {totalBurn > totalRevenue && <li>• Burn exceeds revenue by {fmt(totalBurn - totalRevenue)}/mo — monitor closely</li>}
              {runwayMonths !== null && runwayMonths < 6 && <li>• Estimated runway below 6 months — consider fundraise timing</li>}
              {runwayMonths !== null && runwayMonths < 3 && <li>• ⚠️ Critical: Runway under 3 months — immediate action needed</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Top Burn Categories */}
      {burnCats.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Top Burn Categories</h3>
          <div className="space-y-3">
            {burnCats.slice(0, 5).map((cat) => {
              const pct = totalBurn > 0 ? (Number(cat.monthly_amount) / totalBurn) * 100 : 0;
              return (
                <div key={cat.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{cat.category_name}</span>
                      <span className="text-xs text-muted-foreground">{fmt(Number(cat.monthly_amount))}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-red-500/70 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className={cn("text-[10px] font-medium", cat.trend === "up" ? "text-red-500" : cat.trend === "down" ? "text-emerald-500" : "text-muted-foreground")}>
                    {cat.trend === "up" ? <ArrowUpRight className="h-3 w-3 inline" /> : cat.trend === "down" ? <ArrowDownRight className="h-3 w-3 inline" /> : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Cash Flow */}
      {cashFlows.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Recent Cash Flow</h3>
          <div className="space-y-2">
            {cashFlows.slice(0, 6).map((cf) => (
              <div key={cf.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", cf.flow_type === "inflow" ? "bg-emerald-500" : "bg-red-500")} />
                  <span className="font-medium">{cf.source}</span>
                </div>
                <span className={cn("text-xs font-medium", cf.flow_type === "inflow" ? "text-emerald-500" : "text-red-500")}>
                  {cf.flow_type === "inflow" ? "+" : "−"}{fmt(Number(cf.amount))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forecast Snapshot */}
      {latestForecast && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Latest Forecast</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-emerald-500">{fmt(Number(latestForecast.projected_revenue))}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Projected Revenue</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-500">{fmt(Number(latestForecast.projected_expenses))}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Projected Expenses</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-500">{latestForecast.projected_runway_months ?? "—"} mo</p>
              <p className="text-[10px] text-muted-foreground uppercase">Projected Runway</p>
            </div>
          </div>
          {latestForecast.assumptions && (
            <p className="text-xs text-muted-foreground mt-3 italic">"{latestForecast.assumptions}"</p>
          )}
        </div>
      )}
    </div>
  );
};

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-3.5 w-3.5", color)} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

export default FinancesTab;
