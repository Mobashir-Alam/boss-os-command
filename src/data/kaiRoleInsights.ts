// Role-aware KAI insights

export type KaiRole = "founder" | "functional_head" | "mfo" | "project_manager";
export type InsightSeverity = "info" | "warning" | "critical" | "positive";

export interface RoleKaiInsight {
  id: string;
  label: string;
  insight: string;
  detail: string;
  severity: InsightSeverity;
  metric?: string;
  metricValue?: string;
}

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

  functional_head: [
    {
      id: "fh-1",
      label: "Domain Alert",
      insight: "Time-to-hire increased 15% this month — sourcing channels may need expansion.",
      detail: "Average time-to-hire now 24 days vs 21 day target. Local pipeline yielding fewer qualified candidates. Remote postings showing 40% faster fill rates in similar roles.",
      severity: "warning",
      metric: "Time-to-Hire",
      metricValue: "24 days (+15%)",
    },
    {
      id: "fh-2",
      label: "Domain Trend",
      insight: "Team churn trending down — retention initiatives showing impact across 3 startups.",
      detail: "Churn rate at 4.2%, down from 5.0% last quarter. Exit interview feedback improved. Continue current mentorship program.",
      severity: "positive",
      metric: "Churn Rate",
      metricValue: "4.2% (↓0.8%)",
    },
    {
      id: "fh-3",
      label: "Action Needed",
      insight: "Sprint velocity declined 10% over 3 sprints — possible scope creep or team fatigue.",
      detail: "Velocity dropped from 38 to 34 points. Two engineers context-switching across projects. Recommend sprint retrospective focused on scope management.",
      severity: "warning",
      metric: "Sprint Velocity",
      metricValue: "34 pts (↓10%)",
    },
  ],

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
};
