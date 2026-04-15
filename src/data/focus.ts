export type PrioritySeverity = "critical" | "at-risk" | "monitor";
export type ExecutionStatus = "pending" | "in-progress" | "done";

export interface FocusPriority {
  id: string;
  startupId: string;
  startupName: string;
  tag: string;
  severity: PrioritySeverity;
  problem: string;
  why: string;
  impact: string;
  impactLevel: "High" | "Medium" | "Low";
  owner: string | null;
  mfoSuggestion: string;
  mfoConfidence: "High" | "Medium";
  rank: number;
  detectedAgo: string;
  deadlineIn: string;
  executionStatus: ExecutionStatus;
}

export const focusPriorities: FocusPriority[] = [
  {
    id: "fp-1",
    rank: 1,
    startupId: "nasheedio",
    startupName: "Nasheedio",
    tag: "Retention Drop",
    severity: "critical",
    problem: "⚠️ Retention ↓12% this week",
    why: "Fewer creator uploads in last 2 weeks",
    impact: "Affects long-term growth and engagement",
    impactLevel: "High",
    owner: null,
    mfoSuggestion: "Launch creator reactivation campaign",
    mfoConfidence: "High",
    detectedAgo: "2 days ago",
    deadlineIn: "3 days",
    executionStatus: "pending",
  },
  {
    id: "fp-2",
    rank: 2,
    startupId: "project-x",
    startupName: "Project X",
    tag: "Runway Risk",
    severity: "critical",
    problem: "🔥 Runway below 3 months",
    why: "High burn, no funding yet",
    impact: "Company survival at stake",
    impactLevel: "High",
    owner: "CFO",
    mfoSuggestion: "Prepare investor outreach list",
    mfoConfidence: "High",
    detectedAgo: "5 days ago",
    deadlineIn: "Overdue by 1 day",
    executionStatus: "in-progress",
  },
  {
    id: "fp-3",
    rank: 3,
    startupId: "gurucool",
    startupName: "Gurucool",
    tag: "Hiring Delay",
    severity: "at-risk",
    problem: "⚠️ Backend role open for 21 days",
    why: "Low qualified applicants",
    impact: "Blocking API v2 launch timeline",
    impactLevel: "Medium",
    owner: "HR Head",
    mfoSuggestion: "Push referral hiring campaign",
    mfoConfidence: "Medium",
    detectedAgo: "21 days ago",
    deadlineIn: "7 days",
    executionStatus: "pending",
  },
];

export const lowerPriorities = [
  {
    id: "lp-1",
    startupName: "LevelUp Climate",
    tag: "Onboarding",
    severity: "monitor" as PrioritySeverity,
    problem: "Onboarding completion rate at 68%",
    owner: "Product Lead",
    detectedAgo: "5 days ago",
  },
  {
    id: "lp-2",
    startupName: "Nasheedio",
    tag: "Churn",
    severity: "monitor" as PrioritySeverity,
    problem: "Premium tier churn slightly elevated (4.2%)",
    owner: "CS Head",
    detectedAgo: "3 days ago",
  },
];

export interface ActivityUpdate {
  id: string;
  person: string;
  role: string;
  startupName: string;
  message: string;
  timestamp: string;
}

export const activityUpdates: ActivityUpdate[] = [
  {
    id: "au-1",
    person: "Arjun (CTO)",
    role: "CTO",
    startupName: "Gurucool",
    message: "Feature rollout delayed by 2 days — dependency on backend hire",
    timestamp: "25 min ago",
  },
  {
    id: "au-2",
    person: "Priya (Content Head)",
    role: "Content",
    startupName: "Nasheedio",
    message: "Creator uploads increased today — reactivation emails sent",
    timestamp: "1 hour ago",
  },
  {
    id: "au-3",
    person: "Ravi (CFO)",
    role: "Finance",
    startupName: "Project X",
    message: "Investor call scheduled for Thursday — deck updated",
    timestamp: "3 hours ago",
  },
  {
    id: "au-4",
    person: "Maya (Product)",
    role: "Product",
    startupName: "LevelUp Climate",
    message: "New cohort activation rate hit 74% — above target",
    timestamp: "5 hours ago",
  },
];

export const severityConfig: Record<PrioritySeverity, { label: string; icon: string; color: string; bg: string; glow: string }> = {
  critical: {
    label: "Critical",
    icon: "🔴",
    color: "hsl(0 84% 60%)",
    bg: "hsl(0 84% 60% / 0.06)",
    glow: "0 0 24px hsl(0 84% 60% / 0.12)",
  },
  "at-risk": {
    label: "At Risk",
    icon: "🟡",
    color: "hsl(38 92% 50%)",
    bg: "hsl(38 92% 50% / 0.06)",
    glow: "0 0 24px hsl(38 92% 50% / 0.1)",
  },
  monitor: {
    label: "Monitor",
    icon: "🟢",
    color: "hsl(142 71% 45%)",
    bg: "hsl(142 71% 45% / 0.06)",
    glow: "0 0 24px hsl(142 71% 45% / 0.08)",
  },
};
