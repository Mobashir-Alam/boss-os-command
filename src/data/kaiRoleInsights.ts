// Role-aware KAI insights

export type KaiRole = "founder" | "functional_head" | "mfo" | "project_manager" | "team_member";
export type FunctionalDomain = "finance" | "product" | "marketing" | "hr";
export type InsightSeverity = "info" | "warning" | "critical" | "positive";

export interface RoleKaiInsight {
  id: string;
  label: string;
  insight: string;
  detail: string;
  severity: InsightSeverity;
  metric?: string;
  metricValue?: string;
  domain?: FunctionalDomain; // Used for functional_head domain filtering
}

// Domain-specific KAI insights for functional heads
const functionalHeadInsights: RoleKaiInsight[] = [
  // CFO / Finance
  {
    id: "fh-fin-1",
    label: "Burn Alert",
    insight: "Portfolio burn rate up 12% MoM — Project X infra costs driving the spike.",
    detail: "Monthly burn increased from $165K to $185K. Cloud costs rose $8K. Recommend infra audit and reserved instance migration to save ~$5K/mo.",
    severity: "critical",
    metric: "Monthly Burn",
    metricValue: "$185K (+12%)",
    domain: "finance",
  },
  {
    id: "fh-fin-2",
    label: "Runway Risk",
    insight: "Project X runway at 2.5 months — bridge round or 20% cost cut needed by Apr 30.",
    detail: "At current $85K/mo burn, cash depletes Jul 1. Bridge round materials in progress. Parallel track: identify $17K in non-essential spend to cut.",
    severity: "critical",
    metric: "Runway",
    metricValue: "2.5 months",
    domain: "finance",
  },
  {
    id: "fh-fin-3",
    label: "Revenue Signal",
    insight: "Portfolio MRR up 8% MoM — Nasheedio and LevelUp Climate leading growth.",
    detail: "Total MRR at $42K. Nasheedio contributing $18K (+6%), LevelUp Climate $12K (+15%). Project X flat. Gurucool pre-revenue.",
    severity: "positive",
    metric: "MRR Growth",
    metricValue: "+8% MoM",
    domain: "finance",
  },

  // CTO / Product
  {
    id: "fh-tech-1",
    label: "Tech Debt",
    insight: "Sprint velocity declined 10% over 3 sprints — possible scope creep or team fatigue.",
    detail: "Velocity dropped from 38 to 34 points. Two engineers context-switching across projects. Recommend sprint retrospective focused on scope management.",
    severity: "warning",
    metric: "Sprint Velocity",
    metricValue: "34 pts (↓10%)",
    domain: "product",
  },
  {
    id: "fh-tech-2",
    label: "Bug Spike",
    insight: "Open bugs at 23 — up 5 this sprint. Nasheedio mobile crash rate at 2.1%.",
    detail: "Top crash: media upload on Android 12+. Hotfix estimated at 2 dev-days. Prioritize before next release to protect retention.",
    severity: "critical",
    metric: "Open Bugs",
    metricValue: "23 (+5)",
    domain: "product",
  },
  {
    id: "fh-tech-3",
    label: "Infra Health",
    insight: "Uptime consistently above SLA at 99.7% — infrastructure stability is strong.",
    detail: "No P0 incidents in 30 days. Monitoring coverage at 94%. Consider expanding APM to Gurucool staging environment.",
    severity: "positive",
    metric: "Uptime (30d)",
    metricValue: "99.7%",
    domain: "product",
  },

  // CMO / Marketing
  {
    id: "fh-mkt-1",
    label: "CAC Rising",
    insight: "Paid acquisition costs rising across 2 startups — review channel mix before next spend cycle.",
    detail: "Nasheedio paid CPA at $28 (+$4 vs target). LevelUp Climate CPA at $22 (+$3). Organic channels showing 2× better ROI. Consider 30% budget shift.",
    severity: "warning",
    metric: "CAC",
    metricValue: "$28 (+$4)",
    domain: "marketing",
  },
  {
    id: "fh-mkt-2",
    label: "Growth Win",
    insight: "Organic traffic +18% MoM — SEO investments from Q1 paying off across portfolio.",
    detail: "Total organic sessions at 12.4K. Top performers: LevelUp Climate (+24%), Nasheedio (+14%). Continue doubling down on content strategy.",
    severity: "positive",
    metric: "Organic Traffic",
    metricValue: "12.4K (+18%)",
    domain: "marketing",
  },
  {
    id: "fh-mkt-3",
    label: "Campaign Alert",
    insight: "Creator reactivation email open rate at 18% — below 25% benchmark. Test subject lines.",
    detail: "Reactivation campaign sent to 200 creators. 18% open rate, 4% click-through. A/B test with personalized subject lines could improve by 30-40%.",
    severity: "warning",
    metric: "Email Open Rate",
    metricValue: "18% (target 25%)",
    domain: "marketing",
  },

  // CHRO / HR
  {
    id: "fh-hr-1",
    label: "Hiring Delay",
    insight: "Time-to-hire increased 15% this month — sourcing channels need expansion.",
    detail: "Average time-to-hire now 24 days vs 21 day target. Local pipeline yielding fewer qualified candidates. Remote postings showing 40% faster fill rates.",
    severity: "warning",
    metric: "Time-to-Hire",
    metricValue: "24 days (+15%)",
    domain: "hr",
  },
  {
    id: "fh-hr-2",
    label: "Attrition Trend",
    insight: "Team churn trending down to 4.2% — retention initiatives showing impact.",
    detail: "Churn rate down from 5.0% last quarter. Exit interview feedback improved. Mentorship program contributing. Continue current approach.",
    severity: "positive",
    metric: "Churn Rate",
    metricValue: "4.2% (↓0.8%)",
    domain: "hr",
  },
  {
    id: "fh-hr-3",
    label: "Pipeline Gap",
    insight: "7 open positions across portfolio — Gurucool backend role critical at 21 days.",
    detail: "Gurucool backend: 21 days open, blocking API v2. Nasheedio content: 14 days. Recommend expanding to remote candidates and contractor bridge.",
    severity: "critical",
    metric: "Open Roles",
    metricValue: "7 positions",
    domain: "hr",
  },
];

export const roleKaiInsights: Record<KaiRole, RoleKaiInsight[]> = {
  founder: [
    {
      id: "f-1",
      label: "Portfolio Risk",
      insight: "Project X runway critical — 2.5 months left. Funding decision overdue.",
      detail: "At current $85K/mo burn, cash depletes by Jul 1. Bridge round or 20% cost cut needed within 2 weeks. Consider kill/maintain threshold.",
      severity: "critical",
      metric: "Portfolio Runway Risk",
      metricValue: "1 of 4 critical",
    },
    {
      id: "f-2",
      label: "Cross-Startup",
      insight: "Nasheedio retention drop may reduce MRR by ~18% next month if unaddressed.",
      detail: "Creator churn accelerating — 12% drop this month. Revenue impact estimated at $7.5K MRR loss. Reactivation campaign in progress but early results mixed.",
      severity: "warning",
      metric: "Revenue Impact",
      metricValue: "−$7.5K MRR",
    },
    {
      id: "f-3",
      label: "Capital Allocation",
      insight: "LevelUp Climate shows strongest ROI — consider doubling growth investment.",
      detail: "+18% MoM growth, 72% activation, NPS 67. Organic acquisition cost 40% below portfolio average. Best candidate for scaling capital.",
      severity: "positive",
      metric: "Growth Signal",
      metricValue: "+18% MoM",
    },
    {
      id: "f-4",
      label: "Strategic Signal",
      insight: "Gurucool blocked by single backend hire for 21 days. API v2 and 2 partner deals waiting.",
      detail: "Downstream impact: 3 tasks blocked, 2 partner integrations delayed. Remote hiring pipeline added but no offer yet. Consider contractor bridge.",
      severity: "warning",
      metric: "Blocked Duration",
      metricValue: "21 days",
    },
  ],

  functional_head: functionalHeadInsights,

  mfo: [
    {
      id: "m-1",
      label: "Resource Gap",
      insight: "Nasheedio needs additional content support — creator tickets up 35% with no staffing change.",
      detail: "Support response time increased from 4h to 9h. 2 contract hires could bridge the gap while full-time search continues. Budget available from Q2 contingency.",
      severity: "warning",
      metric: "Support Load",
      metricValue: "+35% tickets",
    },
    {
      id: "m-2",
      label: "Blocker Chain",
      insight: "Task 'Push referral hiring' blocks 2 downstream tasks across Gurucool.",
      detail: "Referral campaign (pending) → Schedule interviews (blocked) → Backend hire (blocked). Unblocking this single task would free the entire Gurucool hiring pipeline.",
      severity: "critical",
      metric: "Downstream Impact",
      metricValue: "2 tasks blocked",
    },
    {
      id: "m-3",
      label: "Reallocation",
      insight: "Consider moving a backend dev from LevelUp Climate to Nasheedio for 2 weeks.",
      detail: "LevelUp Climate is ahead of sprint targets with buffer. Nasheedio mobile crash hotfix needs backend support. Temporary reallocation would unblock 3 tasks.",
      severity: "info",
      metric: "Reallocation Opportunity",
      metricValue: "3 tasks unblocked",
    },
    {
      id: "m-4",
      label: "Coordination",
      insight: "3 tasks due in next 3 days across 2 startups — ensure owner availability.",
      detail: "CFO has 2 tasks due (Project X). Alice Chen has 1 task due (Nasheedio). Both owners confirmed available. No conflicts detected.",
      severity: "info",
      metric: "Upcoming Deadlines",
      metricValue: "3 tasks, 3 days",
    },
  ],

  project_manager: [
    {
      id: "pm-1",
      label: "Unblock",
      insight: "Complete 'Push referral hiring campaign' to unblock 2 dependent tasks.",
      detail: "This task is the top of a dependency chain: Referral campaign → Schedule interviews → Backend hire. Completing it today would free the Gurucool pipeline.",
      severity: "critical",
      metric: "Dependency Chain",
      metricValue: "2 tasks waiting",
    },
    {
      id: "pm-2",
      label: "Deadline Alert",
      insight: "2 tasks are nearing their deadlines — 'Investor outreach list' due tomorrow.",
      detail: "'Prepare investor outreach list' due Apr 16. 'Cut non-essential spend' due Apr 17. Both assigned to CFO. Ensure progress updates are logged.",
      severity: "warning",
      metric: "Due Soon",
      metricValue: "2 tasks, 1-2 days",
    },
    {
      id: "pm-3",
      label: "Today's Focus",
      insight: "3 tasks in progress, 2 pending, 1 blocked. Focus on the blocked task first.",
      detail: "'Cut non-essential spend' is blocked on budget approval. Escalate to Founder if not resolved by EOD. Remaining in-progress tasks are on track.",
      severity: "info",
      metric: "Task Summary",
      metricValue: "6 active tasks",
    },
  ],

  team_member: [
    {
      id: "tm-1",
      label: "Priority",
      insight: "Complete 'Cut non-essential spend' first — deadline is tomorrow.",
      detail: "This task is due Apr 17. It's currently blocked on budget approval. If the blocker is resolved, prioritize this immediately.",
      severity: "critical",
      metric: "Deadline",
      metricValue: "Tomorrow",
    },
    {
      id: "tm-2",
      label: "Blocker Impact",
      insight: "Your blocked task is holding up 2 other tasks downstream.",
      detail: "Resolving 'Schedule backend engineer interviews' will unblock the hiring pipeline for Gurucool. Report the blocker if you need help.",
      severity: "warning",
      metric: "Impact",
      metricValue: "2 tasks waiting",
    },
    {
      id: "tm-3",
      label: "Progress",
      insight: "You're making good progress — 1 task completed this week.",
      detail: "'Analyze premium tier churn reasons' was completed. Keep the momentum going with your remaining active tasks.",
      severity: "positive",
      metric: "Completed",
      metricValue: "1 this week",
    },
  ],
};

// Helper to get domain-filtered insights for functional heads
export function getDomainKaiInsights(domain: FunctionalDomain): RoleKaiInsight[] {
  return functionalHeadInsights.filter((i) => i.domain === domain);
}
