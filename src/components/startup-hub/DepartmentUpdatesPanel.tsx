import { CircleAlert, CircleCheckBig, Clock3, Users } from "lucide-react";
import {
  startupDepartmentCatalog,
  useDepartmentUpdates,
  useStartupDepartments,
} from "@/hooks/useStartupHub";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, { chip: string; dot: string }> = {
  good: {
    chip: "bg-signal-positive-soft text-signal-positive border-signal-positive/30",
    dot: "bg-signal-positive",
  },
  watch: {
    chip: "bg-signal-warning-soft text-signal-warning border-signal-warning/30",
    dot: "bg-signal-warning",
  },
  critical: {
    chip: "bg-signal-critical-soft text-signal-critical border-signal-critical/30",
    dot: "bg-signal-critical",
  },
};

const statusLabels: Record<string, string> = {
  good: "On track",
  watch: "Watch",
  critical: "Critical",
};

export default function DepartmentUpdatesPanel({ startupId }: { startupId: string }) {
  const { departments, loading: departmentsLoading } = useStartupDepartments(startupId);
  const { updates, loading: updatesLoading } = useDepartmentUpdates(startupId);

  const latestByDepartment = new Map<string, (typeof updates)[number]>();
  for (const update of updates) {
    if (!latestByDepartment.has(update.department_key)) {
      latestByDepartment.set(update.department_key, update);
    }
  }

  const departmentCards = startupDepartmentCatalog.map((definition) => {
    const department = departments.find((entry) => entry.department_key === definition.key);
    const latestUpdate = latestByDepartment.get(definition.key);

    return {
      key: definition.key,
      name: definition.name,
      status: department?.status ?? "watch",
      headcount: department?.headcount ?? 0,
      leadName: department?.lead?.full_name ?? null,
      summary: latestUpdate?.summary ?? department?.summary ?? null,
      blockers: latestUpdate?.blockers_list ?? [],
      wins: latestUpdate?.wins_list ?? [],
      updatedAt: latestUpdate?.update_date ?? null,
    };
  });

  if (departmentsLoading || updatesLoading) {
    return <div className="text-sm text-muted-foreground">Loading department radar…</div>;
  }

  // Aggregate header stats
  const totalCritical = departmentCards.filter((d) => d.status === "critical").length;
  const totalWatch = departmentCards.filter((d) => d.status === "watch").length;
  const totalGood = departmentCards.filter((d) => d.status === "good").length;
  const totalPeople = departmentCards.reduce((s, d) => s + d.headcount, 0);

  return (
    <div className="paper-card overflow-hidden">
      {/* Editorial header strip */}
      <div className="flex items-center justify-between border-b border-border bg-paper px-5 py-4">
        <div>
          <span className="eyebrow">Department Operations Radar</span>
          <p className="font-display text-lg leading-tight mt-1">
            {departmentCards.length} departments · {totalPeople} operators
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px] uppercase tracking-wider font-semibold">
          {totalCritical > 0 && (
            <span className="flex items-center gap-1.5 text-signal-critical">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-critical" />
              {totalCritical} critical
            </span>
          )}
          {totalWatch > 0 && (
            <span className="flex items-center gap-1.5 text-signal-warning">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-warning" />
              {totalWatch} watch
            </span>
          )}
          {totalGood > 0 && (
            <span className="flex items-center gap-1.5 text-signal-positive">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-positive" />
              {totalGood} on track
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
        {departmentCards.map((department) => {
          const styles = statusStyles[department.status] ?? statusStyles.watch;
          const topBlocker = department.blockers[0];
          return (
            <article key={department.key} className="bg-card p-5 flex flex-col gap-3 min-h-[180px]">
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      {statusLabels[department.status] ?? "Watch"}
                    </span>
                  </div>
                  <h3 className="font-display text-base mt-1 leading-tight">{department.name}</h3>
                </div>
                <span className="numeric text-xl text-foreground/80 shrink-0">{department.headcount}</span>
              </header>

              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Users className="h-3 w-3" />
                {department.leadName ? `Lead · ${department.leadName}` : "Lead unassigned"}
              </div>

              {department.summary ? (
                <p className="text-xs text-foreground/75 leading-relaxed line-clamp-3 flex-1">
                  {department.summary}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic flex-1">No update logged yet.</p>
              )}

              {topBlocker ? (
                <div className="flex items-start gap-1.5 border-t border-border pt-2.5 text-[11px] text-signal-critical">
                  <CircleAlert className="h-3 w-3 mt-px shrink-0" />
                  <span className="line-clamp-2">{topBlocker}</span>
                </div>
              ) : department.wins[0] ? (
                <div className="flex items-start gap-1.5 border-t border-border pt-2.5 text-[11px] text-signal-positive">
                  <CircleCheckBig className="h-3 w-3 mt-px shrink-0" />
                  <span className="line-clamp-2">{department.wins[0]}</span>
                </div>
              ) : (
                <div className="border-t border-border pt-2.5" />
              )}

              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                <Clock3 className="h-3 w-3" />
                {department.updatedAt
                  ? new Date(department.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "No update"}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
