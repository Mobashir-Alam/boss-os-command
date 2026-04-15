export type StartupStatus = "healthy" | "at-risk" | "critical";

export interface Startup {
  id: string;
  name: string;
  status: StartupStatus;
  runway: string;
  growth: string;
  growthDirection: "up" | "down";
  insight: string;
  insightDetail: string;
  insightTrend: string;
  insightLastUpdated: string;
  sparkData: number[];
}

export const startups: Startup[] = [
  {
    id: "nasheedio",
    name: "Nasheedio",
    status: "at-risk",
    runway: "5.5 months",
    growth: "+12%",
    growthDirection: "up",
    insight: "⚠️ Retention ↓12% this week — low creator uploads",
    insightDetail: "Monthly active creators decreased from 1,240 to 1,091. Content upload frequency dropped 18% in the last 30 days.",
    insightTrend: "↓ Declining over last 2 weeks",
    insightLastUpdated: "Updated 2 hours ago",
    sparkData: [80, 78, 75, 70, 68, 62, 58],
  },
  {
    id: "gurucool",
    name: "Gurucool",
    status: "at-risk",
    runway: "8 months",
    growth: "+5%",
    growthDirection: "up",
    insight: "⚠️ Hiring delayed — backend role open 21 days",
    insightDetail: "Senior backend engineer position unfilled. 3 candidates in pipeline, 1 final round scheduled. Blocking API v2 launch.",
    insightTrend: "→ No change in 3 weeks",
    insightLastUpdated: "Updated 1 day ago",
    sparkData: [40, 42, 44, 43, 45, 46, 45],
  },
  {
    id: "levelup-climate",
    name: "LevelUp Climate",
    status: "healthy",
    runway: "10 months",
    growth: "+18%",
    growthDirection: "up",
    insight: "✅ Strong growth — new cohort driving +18% MoM",
    insightDetail: "Q1 cohort onboarded 340 new users. Activation rate at 72%, up from 58% last quarter. NPS score improved to 67.",
    insightTrend: "↑ Accelerating over last 4 weeks",
    insightLastUpdated: "Updated 5 hours ago",
    sparkData: [30, 35, 42, 50, 58, 65, 74],
  },
  {
    id: "project-x",
    name: "Project X",
    status: "critical",
    runway: "2.5 months",
    growth: "-3%",
    growthDirection: "down",
    insight: "🔥 Runway critical — 2.5 months left, funding pending",
    insightDetail: "Series A term sheet expected by end of month. Current burn rate $85K/mo. Need bridge funding if round delayed beyond 3 weeks.",
    insightTrend: "↓ Burn rate increased 12% this month",
    insightLastUpdated: "Updated 30 min ago",
    sparkData: [90, 85, 78, 70, 60, 50, 42],
  },
];

export interface CriticalAlert {
  id: string;
  startupId: string;
  icon: string;
  text: string;
  severity: "warning" | "critical";
}

export const criticalAlerts: CriticalAlert[] = [
  { id: "1", startupId: "gurucool", icon: "⚠️", text: "Gurucool: Backend hiring blocked", severity: "warning" },
  { id: "2", startupId: "project-x", icon: "🔥", text: "Project X: Runway < 3 months", severity: "critical" },
  { id: "3", startupId: "nasheedio", icon: "📉", text: "Nasheedio: Retention ↓12% this month", severity: "warning" },
  { id: "4", startupId: "project-x", icon: "💰", text: "Project X: Funding decision overdue", severity: "critical" },
];

export const statusConfig: Record<StartupStatus, { label: string; color: string; bg: string; border: string; glow: string }> = {
  healthy: {
    label: "Healthy",
    color: "hsl(142 71% 45%)",
    bg: "hsl(142 71% 45% / 0.08)",
    border: "hsl(142 71% 45% / 0.4)",
    glow: "0 0 20px hsl(142 71% 45% / 0.15)",
  },
  "at-risk": {
    label: "At Risk",
    color: "hsl(38 92% 50%)",
    bg: "hsl(38 92% 50% / 0.08)",
    border: "hsl(38 92% 50% / 0.4)",
    glow: "0 0 20px hsl(38 92% 50% / 0.15)",
  },
  critical: {
    label: "Critical",
    color: "hsl(0 84% 60%)",
    bg: "hsl(0 84% 60% / 0.08)",
    border: "hsl(0 84% 60% / 0.4)",
    glow: "0 0 20px hsl(0 84% 60% / 0.2)",
  },
};
