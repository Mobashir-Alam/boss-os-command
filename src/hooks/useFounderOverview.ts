import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTaskContext } from "@/contexts/TaskContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { usePeople } from "@/hooks/usePeople";
import { useStartups } from "@/hooks/useStartups";
import {
  startupDepartmentCatalog,
  type StartupDepartmentKey,
} from "@/hooks/useStartupHub";

type StartupDepartmentRow = Tables<"startup_departments">;
type DepartmentUpdateRow = Tables<"department_updates">;
type StartupDocumentRow = Tables<"startup_documents">;
type BurnCategoryRow = Tables<"burn_categories">;
type FinancialEntryRow = Tables<"financial_entries">;
type CashFlowEntryRow = Tables<"cash_flow_entries">;
type FinancialForecastRow = Tables<"financial_forecasts">;
type StakeholderRow = Tables<"stakeholders">;
type FundingRoundRow = Tables<"funding_rounds">;

type SignalTone = "positive" | "warning" | "critical";
type AlertSeverity = "critical" | "warning" | "info";

type FounderAlert = {
  id: string;
  startupSlug: string;
  severity: AlertSeverity;
  text: string;
};

type FounderDecision = {
  id: string;
  text: string;
  severity: AlertSeverity;
  startupSlug?: string;
};

type FounderPatternSignal = {
  id: string;
  pattern: string;
  suggestion: string;
  tone: SignalTone;
};

type FounderCompanySignal = "double-down" | "maintain" | "stabilize";

type FounderCompanyOverview = {
  startupSlug: string;
  startupUuid: string;
  name: string;
  status: string;
  runwayLabel: string;
  runwayMonths: number | null;
  growthLabel: string;
  growthPercent: number | null;
  topRisk: string;
  topOpportunity: string;
  signal: FounderCompanySignal;
  signalTone: SignalTone;
  sparkData: number[];
  insight: string;
  blockedTasks: number;
  financeDocs: number;
  monthlyBurn: number;
  headcount: number;
};

type FounderDepartmentIntel = {
  key: StartupDepartmentKey;
  name: string;
  headcount: number;
  avgScore: number;
  tone: SignalTone | "neutral";
  startupCount: number;
  summary: string;
};

type FounderCapitalSignal = {
  id: string;
  startupSlug: string;
  startupName: string;
  action: string;
  metric: string;
};

type ExecutiveSummaries = {
  finance: {
    primary: string;
    secondary: string;
    insight: string;
  };
  people: {
    primary: string;
    secondary: string;
    insight: string;
  };
  ownership: {
    primary: string;
    secondary: string;
    insight: string;
  };
};

type FounderStrategicBrief = {
  status: string;
  biggestRisk: string;
  biggestOpportunity: string;
  founderFocus: string;
  topDecisions: FounderDecision[];
  patternSignals: FounderPatternSignal[];
};

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

const departmentAliases: Record<string, StartupDepartmentKey> = {
  social_media: "social_media",
  social: "social_media",
  video_production_editing: "video_production_editing",
  video: "video_production_editing",
  content_management: "content_management",
  content: "content_management",
  studio: "studio",
  tech: "tech",
  technology: "tech",
  creators_brands_outreach: "creators_brands_outreach",
  creators: "creators_brands_outreach",
  outreach: "creators_brands_outreach",
  hr: "hr",
  human_resources: "hr",
  graphic_designing: "graphic_designing",
  graphic: "graphic_designing",
  design: "graphic_designing",
  office_management: "office_management",
  office: "office_management",
};

const severityRank: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const safeArrayQuery = async <T>(
  label: string,
  promise: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> => {
  const { data, error } = await promise;
  if (error) {
    console.warn(`Founder overview failed to load ${label}: ${error.message}`);
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

const formatCompactCurrency = (amount: number): string => {
  if (!Number.isFinite(amount)) return "INR 0";
  const abs = Math.abs(amount);
  const prefix = amount < 0 ? "-" : "";
  if (abs >= 1e7) return `${prefix}INR ${(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${prefix}INR ${(abs / 1e5).toFixed(1)}L`;
  return `${prefix}INR ${abs.toLocaleString("en-IN")}`;
};

const normalizeDepartmentKey = (value?: string | null): StartupDepartmentKey | null => {
  if (!value) return null;
  const normalized = value.toLowerCase().trim().replace(/[^\w]+/g, "_");
  return departmentAliases[normalized] ?? null;
};

export function useFounderOverview() {
  const { startups, dbStartups, isLoading: startupsLoading } = useStartups();
  const { people, isLoading: peopleLoading } = usePeople();
  const { tasks } = useTaskContext();

  const supportQuery = useQuery({
    queryKey: ["founder-overview-support"],
    queryFn: async (): Promise<SupportData> => {
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
          supabase.from("startup_departments").select("*"),
        ),
        safeArrayQuery<DepartmentUpdateRow>(
          "department_updates",
          supabase
            .from("department_updates")
            .select("*")
            .order("update_date", { ascending: false })
            .order("created_at", { ascending: false }),
        ),
        safeArrayQuery<StartupDocumentRow>(
          "startup_documents",
          supabase.from("startup_documents").select("*"),
        ),
        safeArrayQuery<BurnCategoryRow>(
          "burn_categories",
          supabase.from("burn_categories").select("*"),
        ),
        safeArrayQuery<FinancialEntryRow>(
          "financial_entries",
          supabase.from("financial_entries").select("*"),
        ),
        safeArrayQuery<CashFlowEntryRow>(
          "cash_flow_entries",
          supabase.from("cash_flow_entries").select("*"),
        ),
        safeArrayQuery<FinancialForecastRow>(
          "financial_forecasts",
          supabase
            .from("financial_forecasts")
            .select("*")
            .order("forecast_month", { ascending: false }),
        ),
        safeArrayQuery<StakeholderRow>(
          "stakeholders",
          supabase.from("stakeholders").select("*"),
        ),
        safeArrayQuery<FundingRoundRow>(
          "funding_rounds",
          supabase
            .from("funding_rounds")
            .select("*")
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
  });

  const activePeople = useMemo(
    () => people.filter((person) => person.status === "active"),
    [people],
  );

  const summary = useMemo(() => {
    const support = supportQuery.data;
    if (!support) {
      return {
        totalCompanies: startups.length,
        totalHeadcount: activePeople.length,
        totalSalaryBurn: activePeople.reduce((sum, person) => sum + Number(person.salary || 0), 0),
        avgEfficiency: activePeople.length
          ? Math.round(
              activePeople.reduce((sum, person) => sum + Number(person.productivity_score || 0), 0) /
                activePeople.length,
            )
          : 0,
        portfolioStatusLine:
          startups.length === 0 ? "No companies in view yet" : `Tracking ${startups.length} companies`,
        alerts: [] as FounderAlert[],
        companies: [] as FounderCompanyOverview[],
        departmentIntel: startupDepartmentCatalog.map((department) => ({
          key: department.key,
          name: department.name,
          headcount: 0,
          avgScore: 0,
          tone: "neutral" as const,
          startupCount: 0,
          summary: "Awaiting department data",
        })),
        capitalSignals: [] as FounderCapitalSignal[],
        strategicBrief: {
          status: "Waiting for portfolio data to build the founder brief.",
          biggestRisk: "No portfolio risk data available yet.",
          biggestOpportunity: "Add startup, department, and finance data to unlock signal quality.",
          founderFocus: "Start by connecting live company, task, and reporting data.",
          topDecisions: [] as FounderDecision[],
          patternSignals: [] as FounderPatternSignal[],
        },
        executiveSummaries: {
          finance: {
            primary: "No finance data",
            secondary: "0 finance docs",
            insight: "Finance signals will appear once burn, revenue, or cash flow entries are added.",
          },
          people: {
            primary: `${activePeople.length} active operators`,
            secondary: "0 blocked tasks",
            insight: "People capacity is waiting for startup-linked headcount and delivery metrics.",
          },
          ownership: {
            primary: "No ownership data",
            secondary: "0 rounds logged",
            insight: "Ownership pulse will appear once stakeholders and rounds are connected.",
          },
        } satisfies ExecutiveSummaries,
      };
    }

    const startupByUuid = new Map(dbStartups.map((startup) => [startup.id, startup]));
    const latestUpdateByKey = new Map<string, DepartmentUpdateRow>();

    for (const update of support.departmentUpdates) {
      const mapKey = `${update.startup_id}:${update.department_key}`;
      if (!latestUpdateByKey.has(mapKey)) {
        latestUpdateByKey.set(mapKey, update);
      }
    }

    const companies = startups
      .map((startup) => {
        const dbStartup = dbStartups.find((entry) => entry.slug === startup.id);
        if (!dbStartup) return null;

        const matchesStartup = (linkedStartupId?: string | null) =>
          linkedStartupId === startup.id || linkedStartupId === dbStartup.id;

        const startupPeople = activePeople.filter((person) =>
          (person.linked_startups ?? []).some((linkedStartupId) => matchesStartup(linkedStartupId)),
        );
        const startupTasks = tasks.filter((task) => task.linkedStartupId === startup.id);
        const blockedTasks = startupTasks.filter((task) => task.status === "blocked").length;
        const startupDepartments = support.startupDepartments.filter(
          (department) => department.startup_id === dbStartup.id,
        );
        const startupDocuments = support.startupDocuments.filter(
          (document) => document.startup_id === dbStartup.id,
        );
        const financeDocs = startupDocuments.filter((document) => document.category === "finance").length;
        const startupBurn = support.burnCategories
          .filter((entry) => entry.startup_id === dbStartup.id)
          .reduce((sum, entry) => sum + Number(entry.monthly_amount || 0), 0);
        const revenue = support.financialEntries
          .filter((entry) => entry.startup_id === dbStartup.id && entry.entry_type === "revenue")
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const expenses = support.financialEntries
          .filter((entry) => entry.startup_id === dbStartup.id && entry.entry_type === "expense")
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const inflow = support.cashFlowEntries
          .filter((entry) => entry.startup_id === dbStartup.id && entry.flow_type === "inflow")
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const outflow = support.cashFlowEntries
          .filter((entry) => entry.startup_id === dbStartup.id && entry.flow_type === "outflow")
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const latestForecast = support.financialForecasts.find(
          (forecast) => forecast.startup_id === dbStartup.id,
        );
        const runwayMonths =
          latestForecast?.projected_runway_months ?? parseRunwayMonths(startup.runway);
        const growthPercent = parseGrowthPercent(startup.growth);
        const criticalDepartments = startupDepartments.filter((department) => department.status === "critical");
        const watchDepartments = startupDepartments.filter((department) => department.status === "watch");
        const stakeholders = support.stakeholders.filter((stakeholder) => stakeholder.startup_id === dbStartup.id);
        const founderEquity = stakeholders
          .filter((stakeholder) => stakeholder.role.toLowerCase() === "founder")
          .reduce((sum, stakeholder) => sum + Number(stakeholder.equity_pct || 0), 0);

        let topRisk = startup.insight;
        if ((runwayMonths ?? Infinity) < 3) {
          topRisk = `Runway pressure is acute at ${startup.runway}.`;
        } else if (criticalDepartments.length > 0) {
          topRisk = `${criticalDepartments.length} department ${
            criticalDepartments.length === 1 ? "is" : "are"
          } in critical state.`;
        } else if (blockedTasks > 0) {
          topRisk = `${blockedTasks} blocked task${blockedTasks === 1 ? "" : "s"} are slowing execution.`;
        } else if (financeDocs === 0 && (startupBurn > 0 || expenses > 0 || outflow > 0)) {
          topRisk = "Finance activity exists, but supporting documents are missing.";
        }

        let topOpportunity = "Tighten operating rhythm and keep the company moving.";
        if ((growthPercent ?? 0) > 0 && (runwayMonths ?? 0) >= 6) {
          topOpportunity = `${startup.growth} growth with ${startup.runway} runway gives room to lean in.`;
        } else if (revenue > expenses && revenue > 0) {
          topOpportunity = "Revenue is outrunning expenses; there is room to compound momentum.";
        } else if (founderEquity >= 50) {
          topOpportunity = "Founder control remains strong enough to move decisively on the next step.";
        }

        let signal: FounderCompanySignal = "maintain";
        let signalTone: SignalTone = "warning";
        if (startup.status === "critical" || (runwayMonths ?? Infinity) < 3 || criticalDepartments.length > 0) {
          signal = "stabilize";
          signalTone = "critical";
        } else if (
          startup.status === "healthy" &&
          (growthPercent ?? 0) > 0 &&
          (runwayMonths ?? 0) >= 6 &&
          blockedTasks === 0
        ) {
          signal = "double-down";
          signalTone = "positive";
        }

        return {
          startupSlug: startup.id,
          startupUuid: dbStartup.id,
          name: startup.name,
          status: startup.status,
          runwayLabel: startup.runway,
          runwayMonths,
          growthLabel: startup.growth,
          growthPercent,
          topRisk,
          topOpportunity,
          signal,
          signalTone,
          sparkData: startup.sparkData,
          insight:
            signal === "stabilize"
              ? topRisk
              : signal === "double-down"
                ? topOpportunity
                : startup.insight,
          blockedTasks,
          financeDocs,
          monthlyBurn: startupBurn || expenses || outflow,
          headcount: startupPeople.length,
        } satisfies FounderCompanyOverview;
      })
      .filter((company): company is FounderCompanyOverview => !!company)
      .sort((a, b) => {
        const signalRank = { stabilize: 0, maintain: 1, "double-down": 2 };
        if (signalRank[a.signal] !== signalRank[b.signal]) {
          return signalRank[a.signal] - signalRank[b.signal];
        }
        return (a.runwayMonths ?? 999) - (b.runwayMonths ?? 999);
      });

    const alerts: FounderAlert[] = companies
      .flatMap((company) => {
        const startupDepartments = support.startupDepartments.filter(
          (department) => department.startup_id === company.startupUuid,
        );
        const criticalDepartments = startupDepartments.filter((department) => department.status === "critical").length;
        const watchDepartments = startupDepartments.filter((department) => department.status === "watch").length;
        const localAlerts: FounderAlert[] = [];

        if ((company.runwayMonths ?? Infinity) < 3) {
          localAlerts.push({
            id: `${company.startupSlug}-runway`,
            startupSlug: company.startupSlug,
            severity: "critical",
            text: `${company.name}: runway below 3 months (${company.runwayLabel}).`,
          });
        }
        if (criticalDepartments > 0) {
          localAlerts.push({
            id: `${company.startupSlug}-departments`,
            startupSlug: company.startupSlug,
            severity: "critical",
            text: `${company.name}: ${criticalDepartments} department ${
              criticalDepartments === 1 ? "is" : "are"
            } marked critical.`,
          });
        } else if (watchDepartments >= 3) {
          localAlerts.push({
            id: `${company.startupSlug}-watch`,
            startupSlug: company.startupSlug,
            severity: "warning",
            text: `${company.name}: ${watchDepartments} departments are sitting in watch status.`,
          });
        }
        if (company.blockedTasks > 0) {
          localAlerts.push({
            id: `${company.startupSlug}-tasks`,
            startupSlug: company.startupSlug,
            severity: company.blockedTasks >= 3 ? "critical" : "warning",
            text: `${company.name}: ${company.blockedTasks} blocked task${
              company.blockedTasks === 1 ? "" : "s"
            } need intervention.`,
          });
        }
        if (company.financeDocs === 0 && company.monthlyBurn > 0) {
          localAlerts.push({
            id: `${company.startupSlug}-docs`,
            startupSlug: company.startupSlug,
            severity: "warning",
            text: `${company.name}: finance burn exists without supporting finance documents.`,
          });
        }

        return localAlerts;
      })
      .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
      .slice(0, 6);

    const departmentIntel = startupDepartmentCatalog.map((definition) => {
      const departments = support.startupDepartments.filter(
        (department) => department.department_key === definition.key,
      );
      const latestUpdates = departments
        .map((department) =>
          latestUpdateByKey.get(`${department.startup_id}:${definition.key}`) ?? null,
        )
        .filter((update): update is DepartmentUpdateRow => !!update);
      const matchedPeople = activePeople.filter(
        (person) => normalizeDepartmentKey(person.department) === definition.key,
      );
      const headcountFromDepartments = departments.reduce(
        (sum, department) => sum + Number(department.headcount || 0),
        0,
      );
      const headcount = headcountFromDepartments > 0 ? headcountFromDepartments : matchedPeople.length;
      const avgScore = matchedPeople.length
        ? Math.round(
            matchedPeople.reduce((sum, person) => sum + Number(person.productivity_score || 0), 0) /
              matchedPeople.length,
          )
        : 0;
      const criticalCount = departments.filter((department) => department.status === "critical").length;
      const watchCount = departments.filter((department) => department.status === "watch").length;
      const blockerCount = latestUpdates.reduce(
        (sum, update) => sum + ((update.blockers as string[] | null)?.length ?? 0),
        0,
      );

      let tone: FounderDepartmentIntel["tone"] = "neutral";
      if (criticalCount > 0 || (avgScore > 0 && avgScore < 50)) tone = "critical";
      else if (watchCount > 0 || (avgScore > 0 && avgScore < 70)) tone = "warning";
      else if (headcount > 0) tone = "positive";

      let summaryText = "Awaiting reporting from this department.";
      if (criticalCount > 0) {
        summaryText = `${criticalCount} compan${criticalCount === 1 ? "y" : "ies"} reporting critical pressure here.`;
      } else if (blockerCount > 0) {
        summaryText = `${blockerCount} blocker${blockerCount === 1 ? "" : "s"} logged across current updates.`;
      } else if (watchCount > 0) {
        summaryText = `${watchCount} compan${watchCount === 1 ? "y is" : "ies are"} in watch mode here.`;
      } else if (headcount > 0) {
        summaryText = `Operating across ${departments.length || 0} compan${
          (departments.length || 0) === 1 ? "y" : "ies"
        } with ${headcount} people in view.`;
      }

      return {
        key: definition.key,
        name: definition.name,
        headcount,
        avgScore,
        tone,
        startupCount: departments.length,
        summary: summaryText,
      } satisfies FounderDepartmentIntel;
    });

    const criticalCompanies = companies.filter((company) => company.signal === "stabilize").length;
    const atRiskCompanies = companies.filter((company) => company.signal === "maintain").length;
    const healthyCompanies = companies.filter((company) => company.signal === "double-down").length;
    const totalSalaryBurn = activePeople.reduce((sum, person) => sum + Number(person.salary || 0), 0);
    const avgEfficiency = activePeople.length
      ? Math.round(
          activePeople.reduce((sum, person) => sum + Number(person.productivity_score || 0), 0) /
            activePeople.length,
        )
      : 0;

    const portfolioStatusLine =
      criticalCompanies > 0
        ? `${criticalCompanies} critical, ${atRiskCompanies} watch, ${healthyCompanies} compounding`
        : `All ${companies.length} companies are in motion`;

    const topRiskCompany = companies.find((company) => company.signal === "stabilize") ?? companies[0] ?? null;
    const topOpportunityCompany =
      companies
        .filter((company) => company.signal === "double-down")
        .sort((a, b) => (b.growthPercent ?? -999) - (a.growthPercent ?? -999))[0] ??
      companies.find((company) => (company.growthPercent ?? 0) > 0) ??
      null;

    const documentCoverageCount = new Set(
      support.startupDocuments
        .filter((document) => document.category === "finance")
        .map((document) => startupByUuid.get(document.startup_id)?.slug)
        .filter((slug): slug is string => !!slug),
    ).size;

    const totalBurnInView = companies.reduce((sum, company) => sum + Number(company.monthlyBurn || 0), 0);
    const totalRevenueInView = support.financialEntries
      .filter((entry) => entry.entry_type === "revenue")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const totalInflow = support.cashFlowEntries
      .filter((entry) => entry.flow_type === "inflow")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const totalOutflow = support.cashFlowEntries
      .filter((entry) => entry.flow_type === "outflow")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const netCashFlow = totalInflow - totalOutflow;

    const foundersAtRisk = dbStartups.filter((startup) => {
      const localStakeholders = support.stakeholders.filter((stakeholder) => stakeholder.startup_id === startup.id);
      if (localStakeholders.length === 0) return false;
      const founderVoting = localStakeholders
        .filter((stakeholder) => stakeholder.role.toLowerCase() === "founder")
        .reduce((sum, stakeholder) => sum + Number(stakeholder.voting_pct || 0), 0);
      return founderVoting > 0 && founderVoting < 50;
    }).length;

    const totalRaised = support.fundingRounds.reduce(
      (sum, round) => sum + Number(round.raise_amount || 0),
      0,
    );
    const latestRound = [...support.fundingRounds].sort((a, b) => {
      if ((b.round_order ?? 0) !== (a.round_order ?? 0)) {
        return (b.round_order ?? 0) - (a.round_order ?? 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })[0];

    const patternSignals: FounderPatternSignal[] = [];
    if (alerts.length > 0) {
      patternSignals.push({
        id: "risk-cluster",
        pattern: "Risk is clustering around a small number of companies instead of the full portfolio.",
        suggestion: "Concentrate founder review time on the red companies first, not evenly across all of them.",
        tone: "critical",
      });
    }
    const weakestDepartment = [...departmentIntel]
      .filter((department) => department.headcount > 0)
      .sort((a, b) => {
        const toneRank = { critical: 0, warning: 1, positive: 2, neutral: 3 };
        if (toneRank[a.tone] !== toneRank[b.tone]) {
          return toneRank[a.tone] - toneRank[b.tone];
        }
        return a.avgScore - b.avgScore;
      })[0];
    if (weakestDepartment) {
      patternSignals.push({
        id: "department-pressure",
        pattern: `${weakestDepartment.name} is the weakest operating layer in current portfolio reporting.`,
        suggestion: "Review its blockers first and assign a direct owner for the next reporting cycle.",
        tone:
          weakestDepartment.tone === "neutral"
            ? "warning"
            : (weakestDepartment.tone as SignalTone),
      });
    }
    if (documentCoverageCount < companies.length) {
      patternSignals.push({
        id: "document-coverage",
        pattern: "Document coverage is thinner than the financial activity visible in the portfolio.",
        suggestion: "Backfill finance and legal support files before relying on KAI or capital decisions.",
        tone: "warning",
      });
    }
    if (patternSignals.length === 0) {
      patternSignals.push({
        id: "steady-state",
        pattern: "The portfolio is relatively steady, with more upside than acute fire-fighting.",
        suggestion: "Use the next cycle to improve reporting quality and shift more attention to compounding winners.",
        tone: "positive",
      });
    }

    const topDecisions: FounderDecision[] = [];
    if (topRiskCompany) {
      topDecisions.push({
        id: "risk-company",
        startupSlug: topRiskCompany.startupSlug,
        severity: "critical",
        text: `Decide the stabilization path for ${topRiskCompany.name}: ${topRiskCompany.topRisk}`,
      });
    }
    if (topOpportunityCompany) {
      topDecisions.push({
        id: "opportunity-company",
        startupSlug: topOpportunityCompany.startupSlug,
        severity: "warning",
        text: `Back the momentum in ${topOpportunityCompany.name}: ${topOpportunityCompany.topOpportunity}`,
      });
    }
    const docGapCompany = companies.find((company) => company.financeDocs === 0 && company.monthlyBurn > 0);
    if (docGapCompany) {
      topDecisions.push({
        id: "document-gap",
        startupSlug: docGapCompany.startupSlug,
        severity: "warning",
        text: `Close the finance-document gap in ${docGapCompany.name} before the next review cycle.`,
      });
    }

    const capitalSignals = companies
      .slice(0, 4)
      .map((company) => {
        if (company.signal === "stabilize") {
          return {
            id: `${company.startupSlug}-capital`,
            startupSlug: company.startupSlug,
            startupName: company.name,
            action: "Protect runway before adding new spend",
            metric: `${company.runwayLabel} runway in view`,
          };
        }
        if (company.signal === "double-down") {
          return {
            id: `${company.startupSlug}-capital`,
            startupSlug: company.startupSlug,
            startupName: company.name,
            action: "Lean into traction while the company is healthy",
            metric: `${company.growthLabel} growth with ${company.runwayLabel} runway`,
          };
        }
        return {
          id: `${company.startupSlug}-capital`,
          startupSlug: company.startupSlug,
          startupName: company.name,
          action: "Hold allocation, but fund the unblocker",
          metric: `${company.blockedTasks} blocked task${company.blockedTasks === 1 ? "" : "s"} in view`,
        };
      });

    const strategicBrief: FounderStrategicBrief = {
      status:
        criticalCompanies > 0
          ? `${criticalCompanies} critical companies, ${alerts.filter((alert) => alert.severity === "critical").length} critical alerts, and ${tasks.filter((task) => task.status === "blocked").length} blocked tasks need attention.`
          : `Portfolio is steadier today: ${healthyCompanies} companies are ready to compound if the watch items stay contained.`,
      biggestRisk: alerts[0]?.text ?? "No acute portfolio risk is surfacing yet.",
      biggestOpportunity:
        topOpportunityCompany
          ? `${topOpportunityCompany.name} is the best compounding opportunity right now. ${topOpportunityCompany.topOpportunity}`
          : "The clearest opportunity is to improve reporting quality and capital visibility.",
      founderFocus:
        topRiskCompany && topOpportunityCompany && topRiskCompany.startupSlug !== topOpportunityCompany.startupSlug
          ? `Bias founder time toward ${topRiskCompany.name} for damage control and ${topOpportunityCompany.name} for compounding upside.`
          : topRiskCompany
            ? `Spend disproportionate founder time on ${topRiskCompany.name} until the main risk is contained.`
            : "Use this cycle to improve reporting quality and sharpen investment decisions.",
      topDecisions: topDecisions.slice(0, 3),
      patternSignals: patternSignals.slice(0, 3),
    };

    const executiveSummaries: ExecutiveSummaries = {
      finance: {
        primary: formatCompactCurrency(totalBurnInView),
        secondary: `${formatCompactCurrency(netCashFlow)} net cash flow`,
        insight:
          totalBurnInView > totalRevenueInView && totalRevenueInView > 0
            ? "Portfolio burn is outrunning visible revenue. Tighten capital allocation."
            : `${documentCoverageCount}/${companies.length || 0} companies have finance documents on file.`,
      },
      people: {
        primary: `${activePeople.length} active operators`,
        secondary: `${tasks.filter((task) => task.status === "blocked").length} blocked tasks`,
        insight:
          avgEfficiency >= 70
            ? "Team efficiency is healthy enough to scale the best bets."
            : "Productivity is mixed. Execution quality still needs active founder oversight.",
      },
      ownership: {
        primary: formatCompactCurrency(totalRaised),
        secondary: `${support.fundingRounds.length} rounds logged`,
        insight:
          foundersAtRisk > 0
            ? `${foundersAtRisk} compan${foundersAtRisk === 1 ? "y has" : "ies have"} founder control pressure building.`
            : latestRound
              ? `Latest visible round: ${latestRound.round_name}.`
              : "Ownership data is still sparse; add more cap-table detail for sharper signals.",
      },
    };

    return {
      totalCompanies: companies.length,
      totalHeadcount: activePeople.length,
      totalSalaryBurn,
      avgEfficiency,
      portfolioStatusLine,
      alerts,
      companies,
      departmentIntel,
      capitalSignals,
      strategicBrief,
      executiveSummaries,
    };
  }, [activePeople, dbStartups, people, startups, supportQuery.data, tasks]);

  return {
    loading: startupsLoading || peopleLoading || supportQuery.isLoading,
    startupsLoading,
    peopleLoading,
    ...summary,
  };
}
