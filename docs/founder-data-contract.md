# Founder Data Contract

## Purpose

This document defines the data shape the founder / CEO experience should consume.

It is not a database schema. It is the application-level contract that:

- founder pages should read
- selectors and hooks should produce
- KAI should consume later

This keeps the UI stable even if the underlying tables evolve.

## Contract 1: Founder Overview

This powers the main command center.

### Shape

```ts
type FounderOverview = {
  portfolioSummary: {
    totalCompanies: number;
    criticalCompanies: number;
    atRiskCompanies: number;
    stableCompanies: number;
    totalHeadcount: number;
    totalMonthlyBurn: number;
    totalCashInView: number | null;
    totalOpenIssues: number;
    totalBlockedTasks: number;
  };
  topAlerts: FounderAlert[];
  companies: FounderCompanyCard[];
  kaiInputs: FounderKAIContext;
};
```

### Notes

- `totalCashInView` may be nullable until we define a proper cash balance source
- `companies` should be the main CEO card list
- `kaiInputs` is internal data for GPT-backed summary generation

## Contract 2: Founder Company Card

This is the minimum data needed to render one company in the CEO dashboard.

```ts
type FounderCompanyCard = {
  startupId: string;
  slug: string;
  name: string;
  healthStatus: "critical" | "at-risk" | "stable" | "growing";
  healthScore: number;
  trendDirection: "up" | "flat" | "down";
  runwayLabel: string;
  runwayMonths: number | null;
  topRisk: string | null;
  topOpportunity: string | null;
  latestInsight: string | null;
  departmentHealth: FounderDepartmentHealth[];
  financeSnapshot: FounderFinanceSnapshot;
  ownershipSnapshot: FounderOwnershipSnapshot;
  peopleSnapshot: FounderPeopleSnapshot;
};
```

## Contract 3: Department Health

This powers department-aware CEO visibility.

```ts
type FounderDepartmentHealth = {
  departmentKey:
    | "social_media"
    | "video_production_editing"
    | "content_management"
    | "studio"
    | "tech"
    | "creators_brands_outreach"
    | "hr"
    | "graphic_designing"
    | "office_management";
  departmentName: string;
  leadName: string | null;
  status: "good" | "watch" | "critical";
  headcount: number;
  latestUpdateAt: string | null;
  summary: string | null;
  topWin: string | null;
  topBlocker: string | null;
};
```

## Contract 4: Startup Overview

This powers the company drill-down page.

```ts
type StartupOverview = {
  startup: {
    id: string;
    slug: string;
    name: string;
    status: string;
    healthScore: number;
    latestInsight: string | null;
    trendDirection: "up" | "flat" | "down";
  };
  departments: FounderDepartmentHealth[];
  finance: FounderFinanceSnapshot;
  ownership: FounderOwnershipSnapshot;
  people: FounderPeopleSnapshot;
  documents: FounderDocumentSummary;
  priorities: FounderPrioritySummary[];
  notesSummary: {
    recentCount: number;
    latestNoteAt: string | null;
  };
};
```

## Contract 5: Finance Snapshot

```ts
type FounderFinanceSnapshot = {
  totalRevenue: number;
  totalExpenses: number;
  monthlyBurn: number;
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  runwayMonths: number | null;
  cashAvailable: number | null;
  latestForecastMonth: string | null;
  financialAlertLevel: "ok" | "watch" | "critical";
  supportingDocumentCount: number;
};
```

### Notes

- `cashAvailable` may stay null until we formalize a true source of cash balance
- `supportingDocumentCount` becomes important once bills and finance records are linked

## Contract 6: Ownership Snapshot

```ts
type FounderOwnershipSnapshot = {
  stakeholderCount: number;
  founderEquityPct: number | null;
  totalExternalEquityPct: number | null;
  latestRoundName: string | null;
  latestRoundAmount: number | null;
  latestValuation: number | null;
  controlRiskLevel: "ok" | "watch" | "critical";
};
```

## Contract 7: People Snapshot

```ts
type FounderPeopleSnapshot = {
  totalHeadcount: number;
  activeHeadcount: number;
  avgKpiScore: number;
  avgProductivityScore: number;
  departmentCounts: Array<{
    departmentKey: string;
    count: number;
  }>;
  openPeopleRisks: number;
};
```

## Contract 8: Document Summary

```ts
type FounderDocumentSummary = {
  totalDocuments: number;
  financeDocuments: number;
  legalDocuments: number;
  companyRecordDocuments: number;
  recentDocuments: FounderDocumentItem[];
  missingCriticalDocuments: string[];
};
```

```ts
type FounderDocumentItem = {
  id: string;
  title: string;
  fileName: string;
  category: string;
  subcategory: string | null;
  documentDate: string | null;
  department: string | null;
  vendorName: string | null;
  amount: number | null;
  uploadedAt: string;
};
```

## Contract 9: Founder Alerts

```ts
type FounderAlert = {
  id: string;
  startupId: string;
  severity: "critical" | "warning" | "info";
  type: "runway" | "department" | "people" | "document" | "ownership" | "execution";
  title: string;
  message: string;
  source: string;
};
```

## Contract 10: Founder Priorities

```ts
type FounderPrioritySummary = {
  id: string;
  problem: string;
  severity: string;
  impactLevel: string;
  owner: string | null;
  executionStatus: string;
  deadlineIn: string | null;
};
```

## Contract 11: KAI Context

This should be the curated founder context sent into GPT-backed KAI features.

```ts
type FounderKAIContext = {
  generatedAt: string;
  portfolioSummary: FounderOverview["portfolioSummary"];
  companies: Array<{
    name: string;
    healthStatus: FounderCompanyCard["healthStatus"];
    healthScore: number;
    runwayMonths: number | null;
    topRisk: string | null;
    topOpportunity: string | null;
    departmentHealth: FounderDepartmentHealth[];
    finance: FounderFinanceSnapshot;
    ownership: FounderOwnershipSnapshot;
    people: FounderPeopleSnapshot;
    documents: {
      totalDocuments: number;
      missingCriticalDocuments: string[];
    };
  }>;
  topAlerts: FounderAlert[];
};
```

## Data Contract Rules

### Rule 1

Source tables stay internal. Founder pages should prefer these contracts over raw table reads whenever possible.

### Rule 2

KAI should use these curated objects, not unrestricted raw database dumps.

### Rule 3

Display labels like runway strings can exist, but a numeric source should be preferred for business logic.

### Rule 4

Document metadata should be present in summaries even if full preview UX is built later.

### Rule 5

Department visibility should always be part of the company-level founder contract because this is core to the CEO story.

## Initial Implementation Candidates

These contracts will likely become:

- `useFounderOverview`
- `useStartupOverview`
- `useFounderAlerts`
- `useStartupDocumentSummary`
- `useFounderKAIContext`

Those do not need to be built right now, but Phase 1 should treat them as the target API for the rest of the app.
