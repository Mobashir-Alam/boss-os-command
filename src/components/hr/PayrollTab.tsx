import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { IndianRupee, Loader2, RefreshCw, CheckCircle2, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useMonthlyPayroll,
  useGenerateMonthlyPayroll,
  useUpdatePayrollEntry,
  useMarkPayrollPaid,
  currentMonthYear,
  type PayrollPaymentRow,
  type PayrollStatus,
} from "@/hooks/usePayroll";
import { useEmployeeDirectory } from "@/hooks/useEmployeeDirectory";

const STATUS_CHIP: Record<PayrollStatus, string> = {
  draft:     "bg-muted text-muted-foreground border-border",
  finalised: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  paid:      "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

function fmtINR(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function monthLabel(monthYear: string): string {
  const [y, m] = monthYear.split("-");
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export default function PayrollTab() {
  const [monthYear, setMonthYear] = useState(currentMonthYear());
  const { data: entries = [], isLoading } = useMonthlyPayroll(monthYear);
  const { data: directory = [] } = useEmployeeDirectory();
  const generate = useGenerateMonthlyPayroll();
  const updateEntry = useUpdatePayrollEntry();
  const markPaid = useMarkPayrollPaid();

  // Per-profile name lookup
  const nameById = useMemo(() => {
    const m = new Map<string, { name: string; dept: string | null }>();
    directory.forEach((e) => m.set(e.id, { name: e.full_name, dept: e.department }));
    return m;
  }, [directory]);

  // Aggregates
  const totals = useMemo(() => {
    const t = { gross: 0, deductions: 0, bonus: 0, net: 0, paidNet: 0, draftCount: 0, paidCount: 0 };
    entries.forEach((e) => {
      t.gross += Number(e.base_salary);
      t.deductions += Number(e.deductions);
      t.bonus += Number(e.bonus);
      t.net += Number(e.net_pay);
      if (e.status === "paid") {
        t.paidCount += 1;
        t.paidNet += Number(e.net_pay);
      }
      if (e.status === "draft") t.draftCount += 1;
    });
    return t;
  }, [entries]);

  const handleGenerate = () => {
    generate.mutate(monthYear, {
      onSuccess: (r) => {
        if (r.created > 0) toast.success(`Generated ${r.created} entries`);
        else toast.info(`All ${r.skipped} active employees already have entries for ${monthLabel(monthYear)}`);
      },
      onError: (e: any) => toast.error(e?.message ?? "Couldn't generate"),
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Payroll · {monthLabel(monthYear)}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Generate the monthly run, adjust deductions or bonus per person, mark as paid.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            className="h-9 w-40"
          />
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generate.isPending}
            variant="outline"
            className="gap-1.5"
          >
            {generate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Generate / sync
          </Button>
        </div>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total payable" value={fmtINR(totals.net)} icon={Banknote} />
        <Stat label="Paid out" value={fmtINR(totals.paidNet)} icon={CheckCircle2} tone="text-emerald-600" />
        <Stat label="Pending entries" value={String(totals.draftCount)} />
        <Stat label="Paid · count" value={String(totals.paidCount)} />
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-10 text-center">
          <Banknote className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No payroll entries for {monthLabel(monthYear)} yet.</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Click "Generate / sync" to create entries from each employee's salary.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Person</th>
                <th className="text-right px-2 py-2 font-medium">Base</th>
                <th className="text-right px-2 py-2 font-medium">Deductions</th>
                <th className="text-right px-2 py-2 font-medium">Bonus</th>
                <th className="text-right px-2 py-2 font-medium">Net</th>
                <th className="text-left px-2 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <PayrollRow
                  key={e.id}
                  entry={e}
                  applicantName={nameById.get(e.profile_id)?.name ?? "Unknown"}
                  applicantDept={nameById.get(e.profile_id)?.dept ?? null}
                  monthYear={monthYear}
                  onUpdate={(patch) =>
                    updateEntry.mutate(
                      { id: e.id, monthYear, patch },
                      { onError: (err: any) => toast.error(err?.message ?? "Couldn't update") }
                    )
                  }
                  onTogglePaid={() =>
                    markPaid.mutate(
                      { id: e.id, monthYear, paid: e.status !== "paid" },
                      {
                        onSuccess: () => toast.success(e.status === "paid" ? "Reverted to finalised" : "Marked paid"),
                        onError: (err: any) => toast.error(err?.message ?? "Couldn't update"),
                      }
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone = "text-foreground",
}: {
  label: string;
  value: string;
  icon?: typeof Banknote;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className={cn("h-3.5 w-3.5", tone)} />}
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className={cn("text-xl font-bold tabular-nums mt-1 flex items-center", tone)}>
        {value.match(/^\d/) && <IndianRupee className="h-3.5 w-3.5 inline opacity-60" />}
        {value}
      </p>
    </div>
  );
}

function PayrollRow({
  entry,
  applicantName,
  applicantDept,
  onUpdate,
  onTogglePaid,
}: {
  entry: PayrollPaymentRow;
  applicantName: string;
  applicantDept: string | null;
  monthYear: string;
  onUpdate: (patch: Partial<Pick<PayrollPaymentRow, "base_salary" | "deductions" | "bonus" | "notes">>) => void;
  onTogglePaid: () => void;
}) {
  const isPaid = entry.status === "paid";
  return (
    <tr className={cn("border-t border-border/30 hover:bg-muted/20", isPaid && "bg-emerald-500/[0.02]")}>
      <td className="px-4 py-2">
        <Link to={`/profile/${entry.profile_id}`} className="flex items-center gap-2 hover:underline">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px]">{initials(applicantName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{applicantName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{applicantDept ?? "—"}</p>
          </div>
        </Link>
      </td>
      <td className="px-2 py-1">
        <NumInput
          value={entry.base_salary}
          disabled={isPaid}
          onCommit={(v) => onUpdate({ base_salary: v })}
        />
      </td>
      <td className="px-2 py-1">
        <NumInput
          value={entry.deductions}
          disabled={isPaid}
          tone="text-rose-700"
          onCommit={(v) => onUpdate({ deductions: v })}
        />
      </td>
      <td className="px-2 py-1">
        <NumInput
          value={entry.bonus}
          disabled={isPaid}
          tone="text-emerald-700"
          onCommit={(v) => onUpdate({ bonus: v })}
        />
      </td>
      <td className="px-2 py-1 text-right tabular-nums font-bold text-sm">
        ₹{fmtINR(Number(entry.net_pay))}
      </td>
      <td className="px-2 py-1">
        <Badge variant="outline" className={cn("text-[10px]", STATUS_CHIP[entry.status])}>
          {entry.status}
        </Badge>
      </td>
      <td className="px-4 py-1 text-right">
        <Button
          size="sm"
          variant={isPaid ? "outline" : "default"}
          onClick={onTogglePaid}
          className={cn("h-7 text-[11px] gap-1", isPaid && "text-muted-foreground")}
        >
          {isPaid ? "Undo" : "Mark paid"}
        </Button>
      </td>
    </tr>
  );
}

// Tiny inline number editor — commits on blur or Enter.
function NumInput({
  value,
  disabled,
  tone = "",
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  tone?: string;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState<string>(String(value));
  const original = String(value);
  if (local !== original && !document.activeElement?.matches("input")) {
    // sync if external change while not focused
    setLocal(original);
  }
  return (
    <input
      type="number"
      min={0}
      step={1}
      value={local}
      disabled={disabled}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = Number(local);
        if (!Number.isFinite(n) || n < 0) { setLocal(original); return; }
        if (n !== Number(value)) onCommit(n);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={cn(
        "w-24 rounded-md border border-border/40 bg-card px-2 py-1 text-right text-xs tabular-nums focus:border-primary focus:outline-none",
        disabled && "opacity-60",
        tone
      )}
    />
  );
}
