import { Building2, CircleAlert, CircleCheckBig, Clock3 } from "lucide-react";
import {
  startupDepartmentCatalog,
  useDepartmentUpdates,
  useStartupDepartments,
} from "@/hooks/useStartupHub";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  good: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600",
  watch: "border-amber-500/30 bg-amber-500/5 text-amber-600",
  critical: "border-destructive/30 bg-destructive/5 text-destructive",
};

const statusLabels: Record<string, string> = {
  good: "Good",
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
      summary: latestUpdate?.summary ?? department?.summary ?? "No department update yet.",
      blockers: latestUpdate?.blockers_list ?? [],
      updatedAt: latestUpdate?.update_date ?? null,
    };
  });

  if (departmentsLoading || updatesLoading) {
    return <div className="text-sm text-muted-foreground">Loading department updates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <div>
          <h3 className="text-sm font-semibold">Department Updates</h3>
          <p className="text-xs text-muted-foreground">
            CEO-facing summaries from the current company department structure.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {departmentCards.map((department) => (
          <div key={department.key} className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{department.name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  <span>{department.headcount} people</span>
                  <span>{department.leadName ? `Lead: ${department.leadName}` : "Lead not assigned"}</span>
                </div>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2 py-1 text-[10px] font-medium",
                  statusStyles[department.status] ?? statusStyles.watch
                )}
              >
                {statusLabels[department.status] ?? "Watch"}
              </span>
            </div>

            <p className="text-sm text-foreground/80">{department.summary}</p>

            {department.blockers.length > 0 ? (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 mb-1">
                  <CircleAlert className="h-3 w-3" />
                  Top blocker
                </div>
                <p className="text-xs text-foreground/75">{department.blockers[0]}</p>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                  <CircleCheckBig className="h-3 w-3" />
                  No blockers reported
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock3 className="h-3 w-3" />
              {department.updatedAt
                ? `Latest update: ${new Date(department.updatedAt).toLocaleDateString()}`
                : "No dated department update yet"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
