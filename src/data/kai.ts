// KAI — Portfolio Intelligence & Decision Engine

// --- Types ---

export interface KaiInsightData {
  id: string;
  startupId?: string;
  insight: string;
  convertible?: boolean;
}

export interface KaiPredictionData {
  prediction: string;
  timeframe: string;
  confidence: "High" | "Medium" | "Low";
}

export interface KaiRecommendationData {
  action: string;
  why: string;
  confidence: "High" | "Medium" | "Low";
}

export interface KaiSimulationData {
  condition: string;
  outcome: string;
}

export interface KaiScoreData {
  impact: number;
  urgency: number;
  effort: number;
  total: number;
}

export interface KaiDecisionData {
  action: string;
  impact: string;
  confidence: "High" | "Medium" | "Low";
  timeToImpact: string;
}

export interface KaiFullInsight {
  insight: string;
  predictions: KaiPredictionData[];
  recommendation: KaiRecommendationData;
  simulations: KaiSimulationData[];
  score: KaiScoreData;
  decision?: KaiDecisionData;
}

export type StartupSignal = "double-down" | "maintain" | "kill";

export interface KaiStartupSignalData {
  signal: StartupSignal;
  reason: string;
}

export interface KaiCrossInsight {
  id: string;
  insight: string;
  startups: string[];
  type: "synergy" | "capital" | "resource" | "opportunity";
}

export interface KaiFounderPattern {
  pattern: string;
  suggestion: string;
}

export interface KaiWeeklyBrief {
  status: string;
  biggestRisk: string;
  biggestOpportunity: string;
  timeAllocation: { startup: string; current: string; recommended: string }[];
  strategicDecisions: string[];
}

// --- Global data ---

export const globalKaiInsight: KaiInsightData = {
  id: "kai-global",
  insight: "Nasheedio retention drop linked to reduced creator activity. Fix before scaling.",
  convertible: true,
};

export const globalKaiPredictions: KaiPredictionData[] = [
  { prediction: "Retention may drop another 8–10% in 2 weeks if unchanged.", timeframe: "14 days", confidence: "High" },
  { prediction: "Runway will end in ~73 days at current burn.", timeframe: "73 days", confidence: "High" },
];

export const globalKaiRecommendation: KaiRecommendationData = {
  action: "Pause scaling. Fix retention first.",
  why: "Retention drop will compound and reduce long-term growth by ~25%.",
  confidence: "High",
};

// --- Cross-startup intelligence ---

export const crossStartupInsights: KaiCrossInsight[] = [
  { id: "cx-1", insight: "Nasheedio creator base can support Gurucool content growth. Cross-promote.", startups: ["nasheedio", "gurucool"], type: "synergy" },
  { id: "cx-2", insight: "LevelUp growth is strongest — consider reallocating 20% of Project X budget.", startups: ["levelup-climate", "project-x"], type: "capital" },
  { id: "cx-3", insight: "Gurucool backend hire could temporarily support Project X API needs.", startups: ["gurucool", "project-x"], type: "resource" },
  { id: "cx-4", insight: "Monetize Nasheedio creator base via premium subscriptions. Est. $12K/mo potential.", startups: ["nasheedio"], type: "opportunity" },
];

// --- Capital allocation ---

export const capitalAllocations: { startup: string; action: string; roi: string }[] = [
  { startup: "Nasheedio", action: "Invest $5K/mo in creator incentives", roi: "3.2x estimated ROI via retention recovery" },
  { startup: "LevelUp Climate", action: "Increase marketing budget by 30%", roi: "Growth acceleration to +25% MoM" },
  { startup: "Project X", action: "Avoid new funding until risk resolved", roi: "Preserve capital. Focus on bridge." },
  { startup: "Gurucool", action: "Spend on agency recruiter ($15K one-time)", roi: "Unblocks $200K+ product roadmap value" },
];

// --- Founder focus ---

export const founderTimeAllocation = {
  current: [
    { startup: "Nasheedio", percent: 25 },
    { startup: "Gurucool", percent: 25 },
    { startup: "LevelUp Climate", percent: 25 },
    { startup: "Project X", percent: 25 },
  ],
  recommended: [
    { startup: "Nasheedio", percent: 40 },
    { startup: "Project X", percent: 30 },
    { startup: "Gurucool", percent: 20 },
    { startup: "LevelUp Climate", percent: 10 },
  ],
  insight: "You're spreading time equally. Nasheedio and Project X need disproportionate attention this week.",
};

// --- Kill / Maintain / Double Down signals ---

export const startupSignals: Record<string, KaiStartupSignalData> = {
  nasheedio: { signal: "double-down", reason: "Strong fundamentals. Fix retention and this becomes your best performer." },
  gurucool: { signal: "maintain", reason: "Stable but blocked. Unblock hiring, then reassess." },
  "levelup-climate": { signal: "double-down", reason: "Best growth trajectory. Low risk. Increase investment." },
  "project-x": { signal: "kill", reason: "Runway critical. High burn. No clear path to funding. Consider shutting down or radical pivot." },
};

// --- Founder patterns ---

export const founderPatterns: KaiFounderPattern[] = [
  { pattern: "You delay hiring decisions by an average of 2 weeks.", suggestion: "Set a 7-day decision deadline for open roles." },
  { pattern: "You prioritize low-impact tasks over critical fires.", suggestion: "Start each day with the Focus screen. Act on #1 first." },
  { pattern: "You spread time equally across startups regardless of urgency.", suggestion: "Allocate time proportional to risk and opportunity." },
];

// --- Weekly strategic brief ---

export const weeklyBrief: KaiWeeklyBrief = {
  status: "2 critical issues. 1 startup thriving. Portfolio needs rebalancing.",
  biggestRisk: "Project X runway — 73 days at current burn. Decision needed this week.",
  biggestOpportunity: "LevelUp Climate growth — +18% MoM. Double down on marketing.",
  timeAllocation: [
    { startup: "Nasheedio", current: "25%", recommended: "40%" },
    { startup: "Project X", current: "25%", recommended: "30%" },
    { startup: "Gurucool", current: "25%", recommended: "20%" },
    { startup: "LevelUp Climate", current: "25%", recommended: "10%" },
  ],
  strategicDecisions: [
    "Double down on Nasheedio — fix retention, then scale.",
    "Pause Project X — resolve funding or consider shutdown.",
    "Increase LevelUp Climate marketing budget by 30%.",
    "Unblock Gurucool hiring this week.",
  ],
};

// --- Per-priority (Focus) ---

export const focusKaiData: Record<string, KaiFullInsight> = {
  "fp-1": {
    insight: "If unresolved, retention drop may reduce growth by ~18% next month.",
    predictions: [
      { prediction: "Retention may drop another 8–10% in 2 weeks if unchanged.", timeframe: "14 days", confidence: "High" },
      { prediction: "Creator churn could reach 25% by end of month.", timeframe: "30 days", confidence: "Medium" },
    ],
    recommendation: { action: "Launch creator reactivation campaign immediately.", why: "Every week of delay compounds the retention loss.", confidence: "High" },
    simulations: [
      { condition: "If creator uploads increase by 20%", outcome: "Retention may recover in ~3 weeks." },
      { condition: "If no action taken", outcome: "Growth drops to ~-5% by next month." },
    ],
    score: { impact: 9, urgency: 9, effort: 4, total: 9.2 },
    decision: { action: "Launch creator incentive program this week.", impact: "Could recover 30% of churned creators within 3 weeks.", confidence: "High", timeToImpact: "7 days" },
  },
  "fp-2": {
    insight: "At current burn, runway hits zero in ~70 days. Bridge funding decision is urgent.",
    predictions: [
      { prediction: "Runway will end in ~73 days at current burn.", timeframe: "73 days", confidence: "High" },
      { prediction: "Without bridge, forced to cut 40% of team.", timeframe: "60 days", confidence: "Medium" },
    ],
    recommendation: { action: "Start bridge fundraising this week. Parallel: cut non-essential spend.", why: "Waiting reduces negotiation leverage.", confidence: "High" },
    simulations: [
      { condition: "If bridge secured within 2 weeks", outcome: "Runway extends to 6 months." },
      { condition: "If burn cut by 30%", outcome: "Runway extends to ~4.5 months without bridge." },
    ],
    score: { impact: 10, urgency: 10, effort: 7, total: 9.5 },
    decision: { action: "Initiate bridge round immediately. Target $300K.", impact: "Extends runway by 3+ months.", confidence: "High", timeToImpact: "3 days" },
  },
  "fp-3": {
    insight: "Hiring delay could slow product roadmap by 2–3 weeks.",
    predictions: [
      { prediction: "API v2 launch delayed by 3 weeks if role stays open.", timeframe: "21 days", confidence: "High" },
    ],
    recommendation: { action: "Use recruiting agency or offer contractor bridge.", why: "Organic pipeline isn't producing.", confidence: "Medium" },
    simulations: [
      { condition: "If agency engaged this week", outcome: "Role filled in 1–2 weeks." },
      { condition: "If hiring delay continues", outcome: "Roadmap slips by 1 month." },
    ],
    score: { impact: 6, urgency: 7, effort: 3, total: 7.1 },
    decision: { action: "Engage recruiting agency for backend role.", impact: "Unblocks API v2 launch.", confidence: "Medium", timeToImpact: "14 days" },
  },
};

// --- Per-startup (Startup Detail) ---

export const startupKaiData: Record<string, KaiFullInsight> = {
  nasheedio: {
    insight: "Growth is strong, but retention risk may slow momentum if creator activity stays low.",
    predictions: [
      { prediction: "Retention may drop another 8–10% in 2 weeks if unchanged.", timeframe: "14 days", confidence: "High" },
      { prediction: "Premium churn could rise to 6% if retention isn't fixed.", timeframe: "30 days", confidence: "Medium" },
    ],
    recommendation: { action: "Pause scaling. Fix retention first.", why: "Scaling with a leaky bucket wastes capital.", confidence: "High" },
    simulations: [
      { condition: "If creator uploads increase by 20%", outcome: "Retention may recover in ~3 weeks." },
      { condition: "If scaling continues without fix", outcome: "CAC will rise 30%+ as churn offsets growth." },
    ],
    score: { impact: 9, urgency: 8, effort: 4, total: 8.8 },
    decision: { action: "Launch creator incentive program. Pause paid acquisition.", impact: "Expected 30% creator reactivation within 3 weeks.", confidence: "High", timeToImpact: "7 days" },
  },
  gurucool: {
    insight: "Product velocity depends on filling the backend role.",
    predictions: [
      { prediction: "API v2 launch delayed 3 weeks if role stays open.", timeframe: "21 days", confidence: "High" },
    ],
    recommendation: { action: "Engage recruiting agency this week.", why: "Organic pipeline exhausted.", confidence: "Medium" },
    simulations: [
      { condition: "If agency engaged now", outcome: "Role filled in 1–2 weeks." },
      { condition: "If no change", outcome: "Roadmap slips 1 month." },
    ],
    score: { impact: 6, urgency: 7, effort: 3, total: 7.1 },
    decision: { action: "Engage recruiting agency.", impact: "Unblocks API v2. Cost: ~$15K.", confidence: "Medium", timeToImpact: "14 days" },
  },
  "levelup-climate": {
    insight: "Healthy trajectory. Onboarding is the leading indicator to watch.",
    predictions: [
      { prediction: "If onboarding stays at 68%, growth may plateau in 6 weeks.", timeframe: "42 days", confidence: "Medium" },
    ],
    recommendation: { action: "Optimize onboarding flow. Target 80% completion.", why: "Strongest lever for sustainable growth.", confidence: "Medium" },
    simulations: [
      { condition: "If onboarding hits 80%", outcome: "Growth could accelerate to +25% MoM." },
      { condition: "If onboarding stays at 68%", outcome: "Growth plateaus at +15% within 6 weeks." },
    ],
    score: { impact: 5, urgency: 4, effort: 3, total: 5.4 },
  },
  "project-x": {
    insight: "Survival mode. Every decision should optimize for runway or closing funding.",
    predictions: [
      { prediction: "Runway will end in ~73 days at current burn.", timeframe: "73 days", confidence: "High" },
      { prediction: "Without bridge, forced to cut 40% of team.", timeframe: "60 days", confidence: "Medium" },
    ],
    recommendation: { action: "Start bridge fundraising immediately. Cut non-essential spend.", why: "Delay reduces leverage.", confidence: "High" },
    simulations: [
      { condition: "If bridge secured in 2 weeks", outcome: "Runway extends to 6 months." },
      { condition: "If no bridge + no cuts", outcome: "Company runs out of money in ~73 days." },
    ],
    score: { impact: 10, urgency: 10, effort: 7, total: 9.5 },
    decision: { action: "Initiate bridge round. Target $300K. Cut 20% non-essential spend.", impact: "Extends runway 3+ months.", confidence: "High", timeToImpact: "3 days" },
  },
};

// --- Suggested prompts ---

export const kaiSuggestedPrompts = [
  "What's the biggest risk?",
  "What should I focus on?",
  "What's slowing growth?",
  "Predict next month's trajectory",
  "Where should I allocate capital?",
];

// --- Signal config ---

export const signalConfig: Record<StartupSignal, { label: string; color: string; bg: string; icon: string }> = {
  "double-down": { label: "Double Down", color: "hsl(142 71% 45%)", bg: "hsl(142 71% 45% / 0.08)", icon: "🚀" },
  maintain: { label: "Maintain", color: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.08)", icon: "⏸️" },
  kill: { label: "Kill / At Risk", color: "hsl(0 84% 60%)", bg: "hsl(0 84% 60% / 0.08)", icon: "🛑" },
};
