// Domain-specific data for Functional Head / C-Suite dashboards

export type Domain = "hr" | "finance" | "product" | "marketing";

export interface DomainConfig {
  label: string;
  title: string;
  icon: string;
}

export const domainConfigs: Record<Domain, DomainConfig> = {
  hr: { label: "HR", title: "HR Dashboard", icon: "👥" },
  finance: { label: "Finance", title: "Finance Dashboard", icon: "💰" },
  product: { label: "Product / Tech", title: "Product Dashboard", icon: "⚙️" },
  marketing: { label: "Marketing", title: "Marketing Dashboard", icon: "📣" },
};

export interface SnapshotMetric {
  label: string;
  value: string;
  change?: string;
  changeDirection?: "up" | "down" | "neutral";
}

export const domainMetrics: Record<Domain, SnapshotMetric[]> = {
  hr: [
    { label: "Open Positions", value: "7", change: "+2 this week", changeDirection: "up" },
    { label: "Avg Time-to-Hire", value: "24 days", change: "+3 days vs target", changeDirection: "up" },
    { label: "Team Churn Rate", value: "4.2%", change: "↓ 0.8% vs last quarter", changeDirection: "down" },
    { label: "Offer Acceptance", value: "82%", change: "On target", changeDirection: "neutral" },
  ],
  finance: [
    { label: "Monthly Burn", value: "$185K", change: "+12% vs last month", changeDirection: "up" },
    { label: "Runway", value: "6.2 months", change: "↓ from 7.5 months", changeDirection: "down" },
    { label: "Revenue (MRR)", value: "$42K", change: "+8% MoM", changeDirection: "up" },
    { label: "Gross Margin", value: "64%", change: "Stable", changeDirection: "neutral" },
  ],
  product: [
    { label: "Open Bugs", value: "23", change: "+5 this sprint", changeDirection: "up" },
    { label: "Sprint Velocity", value: "34 pts", change: "↓ 4 pts vs avg", changeDirection: "down" },
    { label: "Uptime (30d)", value: "99.7%", change: "Above SLA", changeDirection: "neutral" },
    { label: "Feature Releases", value: "3", change: "This month", changeDirection: "neutral" },
  ],
  marketing: [
    { label: "CAC", value: "$28", change: "+$4 vs target", changeDirection: "up" },
    { label: "Organic Traffic", value: "12.4K", change: "+18% MoM", changeDirection: "up" },
    { label: "Paid Traffic", value: "8.1K", change: "−6% MoM", changeDirection: "down" },
    { label: "Campaign ROI", value: "3.2×", change: "Above benchmark", changeDirection: "neutral" },
  ],
};

export interface DomainIssue {
  id: string;
  startupId: string;
  startupName: string;
  title: string;
  severity: "Critical" | "At Risk";
  impact: string;
  kaiInsight: string;
}

export const domainIssues: Record<Domain, DomainIssue[]> = {
  hr: [
    { id: "hi-1", startupId: "gurucool", startupName: "Gurucool", title: "Backend engineer role open 21 days", severity: "At Risk", impact: "Blocking API v2 launch", kaiInsight: "Recommend expanding search to remote candidates — similar roles filled 40% faster with remote." },
    { id: "hi-2", startupId: "nasheedio", startupName: "Nasheedio", title: "Content team understaffed", severity: "At Risk", impact: "Creator support lagging", kaiInsight: "2 contract hires could bridge the gap while full-time search continues." },
  ],
  finance: [
    { id: "fi-1", startupId: "project-x", startupName: "Project X", title: "Runway below 3 months", severity: "Critical", impact: "Funding decision overdue", kaiInsight: "At current burn, runway expires Jul 1. Bridge round or 20% cost cut needed by Apr 30." },
    { id: "fi-2", startupId: "project-x", startupName: "Project X", title: "Burn rate up 12%", severity: "At Risk", impact: "Infra costs spiked", kaiInsight: "Cloud costs rose $8K this month. Recommend infra audit and reserved instance migration." },
  ],
  product: [
    { id: "pi-1", startupId: "gurucool", startupName: "Gurucool", title: "API v2 launch delayed", severity: "At Risk", impact: "Dependent on backend hire", kaiInsight: "Consider shipping reduced-scope v2 with existing team to unblock partners." },
    { id: "pi-2", startupId: "nasheedio", startupName: "Nasheedio", title: "Mobile app crash rate at 2.1%", severity: "Critical", impact: "User retention affected", kaiInsight: "Top crash: media upload on Android 12+. Hotfix estimated at 2 dev-days." },
  ],
  marketing: [
    { id: "mi-1", startupId: "nasheedio", startupName: "Nasheedio", title: "Creator reactivation campaign underperforming", severity: "At Risk", impact: "Retention ↓12%", kaiInsight: "Email open rate 18% — below 25% benchmark. Test subject line personalization." },
    { id: "mi-2", startupId: "levelup-climate", startupName: "LevelUp Climate", title: "Paid ads CPA rising", severity: "At Risk", impact: "CAC above target", kaiInsight: "Shift 30% of paid budget to organic content — projected 2× ROI improvement." },
  ],
};

export interface DecisionLogEntry {
  id: string;
  decision: string;
  context: string;
  date: string;
  status: "Implemented" | "In Progress" | "Planned";
  linkedTaskId?: string;
}

export const domainDecisions: Record<Domain, DecisionLogEntry[]> = {
  hr: [
    { id: "d-hr-1", decision: "Expand backend search to remote", context: "Gurucool backend role open 21 days, local pipeline exhausted", date: "Apr 12, 2026", status: "In Progress", linkedTaskId: "task-4" },
    { id: "d-hr-2", decision: "Hire 2 contract content moderators", context: "Nasheedio creator support tickets up 35%", date: "Apr 10, 2026", status: "Planned" },
  ],
  finance: [
    { id: "d-fi-1", decision: "Cut non-essential spend by 20%", context: "Project X runway critical — need to extend by 2+ months", date: "Apr 11, 2026", status: "In Progress", linkedTaskId: "task-3" },
    { id: "d-fi-2", decision: "Prepare bridge round materials", context: "Series A delayed, need $200K bridge", date: "Apr 8, 2026", status: "In Progress", linkedTaskId: "task-2" },
  ],
  product: [
    { id: "d-pr-1", decision: "Ship reduced-scope API v2", context: "Full v2 blocked by backend hire, partners waiting", date: "Apr 13, 2026", status: "Planned" },
    { id: "d-pr-2", decision: "Prioritize Android crash hotfix", context: "2.1% crash rate impacting retention", date: "Apr 12, 2026", status: "In Progress" },
  ],
  marketing: [
    { id: "d-mk-1", decision: "Shift 30% budget to organic", context: "Paid CPA rising, organic showing 2× ROI", date: "Apr 11, 2026", status: "Planned" },
    { id: "d-mk-2", decision: "A/B test reactivation email subjects", context: "Open rate 18% — below 25% benchmark", date: "Apr 10, 2026", status: "In Progress" },
  ],
};

export interface DomainKaiInsight {
  id: string;
  insight: string;
  severity: "info" | "warning" | "critical";
}

export const domainKaiInsights: Record<Domain, DomainKaiInsight[]> = {
  hr: [
    { id: "k-hr-1", insight: "Time-to-hire increased by 15% this month — recommend revisiting sourcing channels.", severity: "warning" },
    { id: "k-hr-2", insight: "Team churn trending down — retention initiatives showing impact across 3 startups.", severity: "info" },
  ],
  finance: [
    { id: "k-fi-1", insight: "Portfolio burn rate up 12% MoM — driven primarily by Project X infrastructure costs.", severity: "warning" },
    { id: "k-fi-2", insight: "Revenue growth across portfolio at 8% MoM — Nasheedio and LevelUp Climate leading.", severity: "info" },
  ],
  product: [
    { id: "k-pr-1", insight: "Sprint velocity declined 10% over last 3 sprints — possible team fatigue or scope creep.", severity: "warning" },
    { id: "k-pr-2", insight: "Uptime consistently above SLA — infrastructure stability is strong.", severity: "info" },
  ],
  marketing: [
    { id: "k-mk-1", insight: "Organic traffic +18% — SEO investments from Q1 paying off. Continue doubling down.", severity: "info" },
    { id: "k-mk-2", insight: "Paid acquisition costs rising across 2 startups — review channel mix before next spend cycle.", severity: "warning" },
  ],
};

// Map assignees to domains
export function inferDomain(assignee?: string): Domain {
  const name = (assignee || "").toLowerCase();
  if (name.includes("hr") || name.includes("people")) return "hr";
  if (name.includes("cfo") || name.includes("finance")) return "finance";
  if (name.includes("cto") || name.includes("product") || name.includes("tech")) return "product";
  if (name.includes("marketing") || name.includes("growth")) return "marketing";
  return "hr"; // default
}
