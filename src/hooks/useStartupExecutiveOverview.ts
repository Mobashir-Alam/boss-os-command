import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTaskContext } from "@/contexts/TaskContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { usePeople } from "@/hooks/usePeople";
import type { DbStartup } from "@/hooks/useStartups";
import type {
  KaiFullInsight,
  KaiStartupSignalData,
} from "@/data/kai";

type StartupDepartmentRow = Tables<"startup_departments">;
type DepartmentUpdateRow = Tables<"department_updates">;
type StartupDocumentRow = Tables<"startup_documents">;
type BurnCategoryRow = Tables<"burn_categories">;
type FinancialEntryRow = Tables<"financial_entries">;
type CashFlowEntryRow = Tables<"cash_flow_entries">;
type FinancialForecastRow = Tables<"financial_forecasts">;
type StakeholderRow = Tables<"stakeholders">;
type FundingRoundRow = Tables<"funding_rounds">;

type SupportData = {
  startupDepartments: StartupDepartmentRow[];
  departmentUpdates: DepartmentUpdateRow[];
  startupDocuments: StartupDocumentRow[];
  burnCategories: BurnCategoryRow[];
  financialEntries: FinancialEntryRow[];
  cashFlowEntries: CashFlowEntryRow[];
  financialForecasts: FinancialForecastRow[];
  stakeholders: StakeholderRow[];
  fundingRounds: FundingRoundRow[];
};

export type StartupExecutiveProblem = {
  id: string;
  problem: string;
  why: string;
  impact: string;
  impactLevel: "High" | "Medium" | "Low";
  owner: string | null;
  status: "pending" | "in-progress" | "done";
  detectedAgo: string;
  lastUpdated: string;
};

const safeArrayQuery = async <T>(
  label: string,
  promise: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> => {
  const { data, error } = await promise;
  if (error) {
    console.warn(`Startup executive overview failed to load ${label}: ${error.message}`);
    return [];
  }
  return data ?? [];
};

const parseRunwayMonths = (label?: string | null): number | null => {
  if (!label) return null;
  const match = label.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
};

const parseGrowthPercent = (label?: string | null): number | null => {
  if (!label) return null;
  const match = label.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return label.includes("-") ? -Math.abs(value) : value;
};

export function useStartupExecutiveOverview(
  startup:
    | {
        id: string;
        name: string;
        status: string;
        runway: string;
        growth: string;
        insight: string;
        lastUpdated: string;
        detectedAgo: string;
      }
    | undefined,
  dbStartup: DbStartup | undefined,
) {
  const { people } = usePeople();
  const { getTasksByStartup } = useTaskContext();

  const supportQuery = useQuery({
    queryKey: ["startup-executive-overview", dbStartup?.id],
    queryFn: async (): Promise<SupportData> => {
      if (!dbStartup?.id) {
        return {
          startupDepartments: [],
          departmentUpdates: [],
          startupDocuments: [],
          burnCategories: [],
          financialEntries: [],
          cashFlowEntries: [],
          financialForecasts: [],
          stakeholders: [],
          fundingRounds: [],
        };
      }

      const startupId = dbStartup.id;

      const [
        startupDepartments,
        departmentUpdates,
        startupDocuments,
        burnCategories,
        financialEntries,
        cashFlowEntries,
        financialForecasts,
        stakeholders,
        fundingRounds,
      ] = await Promise.all([
        safeArrayQuery<StartupDepartmentRow>(
          "startup_departments",
          supabase.from("startup_departments").select("*").eq("startup_id", startupId),
        ),
        safeArrayQuery<DepartmentUpdateRow>(
          "department_updates",
          supabase
            .from("department_updates")
            .select("*")
            .eq("startup_id", startupId)
            .order("update_date", { ascending: false })
            .order("created_at", { ascending: false }),
        ),
        safeArrayQuery<StartupDocumentRow>(
          "startup_documents",
          supabase.from("startup_documents").select("*").eq("startup_id", startupId),
        ),
        safeArrayQuery<BurnCategoryRow>(
          "burn_categories",
          supabase.from("burn_categories").select("*").eq("startup_id", startupId),
        ),
        safeArrayQuery<FinancialEntryRow>(
          "financial_entries",
          supabase.from("financial_entries").select("*").eq("startup_id", startupId),
        ),
        safeArrayQuery<CashFlowEntryRow>(
          "cash_flow_entries",
          supabase.from("cash_flow_entries").select("*").eq("startup_id", startupId),
        ),
        safeArrayQuery<FinancialForecastRow>(
          "financial_forecasts",
          supabase
            .from("financial_forecasts")
            .select("*")
            .eq("startup_id", startupId)
            .order("forecast_month", { ascending: false }),
        ),
        safeArrayQuery<StakeholderRow>(
          "stakeholders",
          supabase.from("stakeholders").select("*").eq("startup_id", startupId),
        ),
        safeArrayQuery<FundingRoundRow>(
          "funding_rounds",
          supabase
            .from("funding_rounds")
            .select("*")
            .eq("startup_id", startupId)
            .order("round_order", { ascending: false }),
        ),
      ]);

      return {
        startupDepartments,
        departmentUpdates,
        startupDocuments,
        burnCategories,
        financialEntries,
        cashFlowEntries,
        financialForecasts,
        stakeholders,
        fundingRounds,
      };
    },
    enabled: !!dbStartup?.id,
  });

  const summary = useMemo(() => {
    if (!startup || !dbStartup) {
      return {
        signal: null as KaiStartupSignalData | null,
        kaiData: null as KaiFullInsight | null,
        problems: [] as StartupExecutiveProblem[],
      };
    }

    const support = supportQuery.data;
    if (!support) {
      return {
        signal: null as KaiStartupSignalData | null,
        kaiData: null as KaiFullInsight | null,
        problems: [] as StartupExecutiveProblem[],
      };
    }

    const startupTasks = getTasksByStartup(startup.id);
    const blockedTasks = startupTasks.filter((task) => task.status === "blocked");
    const overdueTasks = startupTasks.filter(
      (task) => task.status !== "completed" && !!task.deadline,
    );
    const criticalDepartments = support.startupDepartments.filter(
      (department) => department.status === "critical",
    );
    const watchDepartments = support.startupDepartments.filter(
      (department) => department.status === "watch",
    );
    const latestUpdatesByDepartment = new Map<string, DepartmentUpdateRow>();
    for (const update of support.departmentUpdates) {
      if (!latestUpdatesByDepartment.has(update.department_key)) {
        latestUpdatesByDepartment.set(update.department_key, update);
      }
    }

    const activePeople = people.filter(
      (person) =>
        person.status === "active" &&
        (person.linked_startups ?? []).some(
          (linkedStartupId) => linkedStartupId === startup.id || linkedStartupId === dbStartup.id,
        ),
    );

    const runwayMonths =
      support.financialForecasts[0]?.projected_runway_months ?? parseRunwayMonths(startup.runway);
    const growthPercent = parseGrowthPercent(startup.growth) ?? 0;
    const burn = support.burnCategories.reduce(
      (sum, category) => sum + Number(category.monthly_amount || 0),
      0,
    );
    const revenue = support.financialEntries
      .filter((entry) => entry.entry_type === "revenue")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const expenses = support.financialEntries
      .filter((entry) => entry.entry_type === "expense")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const inflow = support.cashFlowEntries
      .filter((entry) => entry.flow_type === "inflow")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const outflow = support.cashFlowEntries
      .filter((entry) => entry.flow_type === "outflow")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const financeDocs = support.startupDocuments.filter((document) => document.category === "finance");
    const legalDocs = support.startupDocuments.filter((document) => document.category === "legal");
    const founderEquity = support.stakeholders
      .filter((stakeholder) => stakeholder.role.toLowerCase() === "founder")
      .reduce((sum, stakeholder) => sum + Number(stakeholder.equity_pct || 0), 0);
    const founderVoting = support.stakeholders
      .filter((stakeholder) => stakeholder.role.toLowerCase() === "founder")
      .reduce((sum, stakeholder) => sum + Number(stakeholder.voting_pct || 0), 0);

    let signal: KaiStartupSignalData;
    if (
      startup.status === "critical" ||
      (runwayMonths ?? Infinity) < 3 ||
      criticalDepartments.length > 0
    ) {
      signal = {
        signal: "kill",
        reason:
          (runwayMonths ?? Infinity) < 3
            ? `Runway is compressed at ${startup.runway}; protect capital and force a decision now.`
            : `${criticalDepartments.length} department ${
                criticalDepartments.length === 1 ? "is" : "are"
              } in critical state and needs direct intervention.`,
      };
    } else if (
      startup.status === "healthy" &&
      growthPercent > 0 &&
      (runwayMonths ?? 0) >= 6 &&
      blockedTasks.length === 0
    ) {
      signal = {
        signal: "double-down",
        reason: `${startup.growth} growth and ${startup.runway} runway make this the strongest company to compound.`,
      };
    } else {
      signal = {
        signal: "maintain",
        reason: "The company is moving, but execution quality and reporting still need active oversight.",
      };
    }

    const problems: StartupExecutiveProblem[] = [];

    if ((runwayMonths ?? Infinity) < 3) {
      problems.push({
        id: `${startup.id}-runway`,
        problem: `Runway is below 3 months`,
        why: `Current visible runway is ${startup.runway}, which leaves little room for execution slippage or fundraising delay.`,
        impact: "This is a company survival issue, not just a finance issue.",
        impactLevel: "High",
        owner: "Founder / Finance",
        status: "pending",
        detectedAgo: startup.detectedAgo || "Current cycle",
        lastUpdated: startup.lastUpdated || "Today",
      });
    }

    if (criticalDepartments.length > 0) {
      const department = criticalDepartments[0];
      const update = latestUpdatesByDepartment.get(department.department_key);
      problems.push({
        id: `${startup.id}-${department.department_key}-critical`,
        problem: `${department.name} is operating in critical status`,
        why:
          update?.summary ||
          department.summary ||
          "Department reporting is surfacing critical pressure without a clean recovery path yet.",
        impact: "Department breakdown will spill into company delivery, founder trust, and execution speed.",
        impactLevel: "High",
        owner: "Department Lead",
        status: "in-progress",
        detectedAgo: startup.detectedAgo || "Current cycle",
        lastUpdated: startup.lastUpdated || "Today",
      });
    }

    if (blockedTasks.length > 0) {
      problems.push({
        id: `${startup.id}-blocked-tasks`,
        problem: `${blockedTasks.length} blocked task${blockedTasks.length === 1 ? "" : "s"} are slowing execution`,
        why: "Blocked tasks are the clearest live signal that execution is waiting on a decision or unblocker.",
        impact: "This creates delivery drag and compounds risk in the departments already under pressure.",
        impactLevel: blockedTasks.length >= 3 ? "High" : "Medium",
        owner: blockedTasks[0]?.assignee || null,
        status: "pending",
        detectedAgo: "This cycle",
        lastUpdated: startup.lastUpdated || "Today",
      });
    }

    if (financeDocs.length === 0 && (burn > 0 || expenses > 0 || outflow > 0)) {
      problems.push({
        id: `${startup.id}-finance-docs`,
        problem: `Finance activity is visible but supporting documents are missing`,
        why: "The document repository does not yet support the financial activity showing up in burn or cash flow.",
        impact: "This weakens review quality and makes founder or CFO decisions less auditable.",
        impactLevel: "Medium",
        owner: "Finance / Office",
        status: "pending",
        detectedAgo: "Current cycle",
        lastUpdated: startup.lastUpdated || "Today",
      });
    }

    if (founderVoting > 0 && founderVoting < 50) {
      problems.push({
        id: `${startup.id}-control-risk`,
        problem: `Founder voting control is under 50%`,
        why: `Current visible founder voting is ${founderVoting.toFixed(1)}%, which may constrain strategic flexibility.`,
        impact: "Control pressure can change negotiation leverage during the next funding decision.",
        impactLevel: founderVoting < 35 ? "High" : "Medium",
        owner: "Founder",
        status: "pending",
        detectedAgo: "Ownership review",
        lastUpdated: startup.lastUpdated || "Today",
      });
    }

    const highestImpactProblem = problems[0];
    const bestOpportunity =
      growthPercent > 0 && (runwayMonths ?? 0) >= 6
        ? `${startup.growth} growth with ${startup.runway} runway gives room to press the advantage.`
        : founderEquity >= 50
          ? "Founder control is still strong enough to move quickly on the next strategic decision."
          : "The best near-term upside comes from cleaning up reporting and execution discipline.";

    const kaiData: KaiFullInsight = {
      insight:
        highestImpactProblem
          ? `${highestImpactProblem.problem}. ${bestOpportunity}`
          : `${startup.insight} ${bestOpportunity}`,
      predictions: [
        {
          prediction:
            (runwayMonths ?? Infinity) < 6
              ? `At the current burn profile, runway remains around ${startup.runway}.`
              : `If execution stays stable, the company can keep operating from a ${startup.runway} position.`,
          timeframe: "Current quarter",
          confidence: "High",
        },
        {
          prediction:
            blockedTasks.length > 0
              ? `If ${blockedTasks.length} blocked task${blockedTasks.length === 1 ? "" : "s"} stay unresolved, delivery will slip further.`
              : watchDepartments.length > 0
                ? `Watch-state departments are the most likely source of next-month drag.`
                : `With no major blockers in view, growth or efficiency is the next lever to improve.`,
          timeframe: "Next 30 days",
          confidence: blockedTasks.length > 0 || criticalDepartments.length > 0 ? "High" : "Medium",
        },
      ],
      recommendation: {
        action:
          signal.signal === "kill"
            ? "Protect runway, resolve the biggest blocker, and force a decision on the next financing step."
            : signal.signal === "double-down"
              ? "Back current traction while tightening reporting quality."
              : "Maintain pace, but actively remove execution bottlenecks.",
        why:
          highestImpactProblem?.impact ||
          "The recommendation is based on current runway, execution drag, and ownership visibility.",
        confidence:
          signal.signal === "kill" || criticalDepartments.length > 0 ? "High" : "Medium",
      },
      simulations: [
        {
          condition: "If the main blocker is resolved this cycle",
          outcome:
            blockedTasks.length > 0
              ? "Execution velocity improves first; the health narrative follows after that."
              : "The company gains room to shift founder attention toward growth instead of firefighting.",
        },
        {
          condition: "If reporting quality and documents stay incomplete",
          outcome:
            "Founder, finance, and KAI decisions all become less reliable even if the company keeps operating.",
        },
      ],
      score: {
        impact: Math.min(10, Math.max(4, problems.filter((problem) => problem.impactLevel === "High").length * 3 + 4)),
        urgency: Math.min(10, (runwayMonths ?? Infinity) < 3 ? 10 : blockedTasks.length > 0 ? 8 : 6),
        effort: Math.min(10, criticalDepartments.length > 0 || blockedTasks.length > 0 ? 6 : 4),
        total: Math.min(
          10,
          Number(
            (
              ((problems.filter((problem) => problem.impactLevel === "High").length * 3 + 4) +
                ((runwayMonths ?? Infinity) < 3 ? 10 : blockedTasks.length > 0 ? 8 : 6) +
                (criticalDepartments.length > 0 || blockedTasks.length > 0 ? 6 : 4)) /
              3
            ).toFixed(1),
          ),
        ),
      },
      decision:
        signal.signal === "double-down"
          ? {
              action: `Increase attention and selective investment in ${startup.name}.`,
              impact: "Compounds the company with the cleanest upside profile right now.",
              confidence: "Medium",
              timeToImpact: "2-4 weeks",
            }
          : {
              action: `Resolve the core operating risk in ${startup.name} before making broader scaling decisions.`,
              impact: "Contains downside and creates a cleaner path for the next strategic move.",
              confidence: "High",
              timeToImpact: "This week",
            },
    };

    const departmentContextLines = support.startupDepartments.map((d) => {
      const latestUpdate = latestUpdatesByDepartment.get(d.department_key);
      const parts = [`${d.name}: ${d.headcount ?? 0} people`];
      if (d.status && d.status !== "healthy") parts.push(`status=${d.status}`);
      if (latestUpdate?.summary) parts.push(latestUpdate.summary.slice(0, 80));
      return parts.join(", ");
    });

    return {
      signal,
      kaiData,
      problems: problems.slice(0, 4),
      activePeopleCount: activePeople.length,
      departmentContextLines,
      financials: { burn, revenue, expenses, inflow, outflow },
    };
  }, [dbStartup, getTasksByStartup, people, startup, supportQuery.data]);

  return {
    loading: supportQuery.isLoading,
    ...summary,
  };
}
