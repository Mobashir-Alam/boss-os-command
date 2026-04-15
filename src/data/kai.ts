// KAI — Predictive Intelligence & Decision Engine Data

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

// Global insight (Home screen)
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

// Per-priority insights (Focus screen)
export const focusKaiData: Record<string, KaiFullInsight> = {
  "fp-1": {
    insight: "If unresolved, retention drop may reduce growth by ~18% next month.",
    predictions: [
      { prediction: "Retention may drop another 8–10% in 2 weeks if unchanged.", timeframe: "14 days", confidence: "High" },
      { prediction: "Creator churn could reach 25% by end of month.", timeframe: "30 days", confidence: "Medium" },
    ],
    recommendation: {
      action: "Launch creator reactivation campaign immediately.",
      why: "Every week of delay compounds the retention loss.",
      confidence: "High",
    },
    simulations: [
      { condition: "If creator uploads increase by 20%", outcome: "Retention may recover in ~3 weeks." },
      { condition: "If no action taken", outcome: "Growth drops to ~-5% by next month." },
    ],
    score: { impact: 9, urgency: 9, effort: 4, total: 9.2 },
    decision: {
      action: "Launch creator incentive program this week.",
      impact: "Could recover 30% of churned creators within 3 weeks.",
      confidence: "High",
      timeToImpact: "7 days",
    },
  },
  "fp-2": {
    insight: "At current burn, runway hits zero in ~70 days. Bridge funding decision is urgent.",
    predictions: [
      { prediction: "Runway will end in ~73 days at current burn.", timeframe: "73 days", confidence: "High" },
      { prediction: "Without bridge, forced to cut 40% of team.", timeframe: "60 days", confidence: "Medium" },
    ],
    recommendation: {
      action: "Start bridge fundraising this week. Parallel path: cut non-essential spend.",
      why: "Waiting reduces negotiation leverage and limits options.",
      confidence: "High",
    },
    simulations: [
      { condition: "If bridge secured within 2 weeks", outcome: "Runway extends to 6 months. Series A timeline preserved." },
      { condition: "If burn cut by 30%", outcome: "Runway extends to ~4.5 months without bridge." },
    ],
    score: { impact: 10, urgency: 10, effort: 7, total: 9.5 },
    decision: {
      action: "Initiate bridge round immediately. Target $300K.",
      impact: "Extends runway by 3+ months. Preserves team and momentum.",
      confidence: "High",
      timeToImpact: "3 days",
    },
  },
  "fp-3": {
    insight: "Hiring delay could slow product roadmap by 2–3 weeks.",
    predictions: [
      { prediction: "API v2 launch delayed by 3 weeks if role stays open.", timeframe: "21 days", confidence: "High" },
      { prediction: "Competitor may ship similar feature first.", timeframe: "45 days", confidence: "Low" },
    ],
    recommendation: {
      action: "Use recruiting agency or offer contractor bridge.",
      why: "Organic pipeline isn't producing. Time cost exceeds agency fee.",
      confidence: "Medium",
    },
    simulations: [
      { condition: "If agency engaged this week", outcome: "Role filled in 1–2 weeks. Roadmap back on track." },
      { condition: "If hiring delay continues", outcome: "Roadmap slips by 1 month. Team morale risk." },
    ],
    score: { impact: 6, urgency: 7, effort: 3, total: 7.1 },
    decision: {
      action: "Engage recruiting agency for backend role.",
      impact: "Unblocks API v2 launch. Agency fee ~$15K.",
      confidence: "Medium",
      timeToImpact: "14 days",
    },
  },
};

// Per-startup full insights (Startup Detail screen)
export const startupKaiData: Record<string, KaiFullInsight> = {
  nasheedio: {
    insight: "Growth is strong, but retention risk may slow momentum if creator activity stays low.",
    predictions: [
      { prediction: "Retention may drop another 8–10% in 2 weeks if unchanged.", timeframe: "14 days", confidence: "High" },
      { prediction: "Premium churn could rise to 6% if retention isn't fixed.", timeframe: "30 days", confidence: "Medium" },
    ],
    recommendation: {
      action: "Pause scaling. Fix retention first.",
      why: "Scaling with a leaky bucket wastes capital.",
      confidence: "High",
    },
    simulations: [
      { condition: "If creator uploads increase by 20%", outcome: "Retention may recover in ~3 weeks." },
      { condition: "If scaling continues without fix", outcome: "CAC will rise 30%+ as churn offsets growth." },
    ],
    score: { impact: 9, urgency: 8, effort: 4, total: 8.8 },
    decision: {
      action: "Launch creator incentive program. Pause paid acquisition.",
      impact: "Expected 30% creator reactivation within 3 weeks.",
      confidence: "High",
      timeToImpact: "7 days",
    },
  },
  gurucool: {
    insight: "Product velocity depends on filling the backend role. Consider agency or contractor bridge.",
    predictions: [
      { prediction: "API v2 launch delayed 3 weeks if role stays open.", timeframe: "21 days", confidence: "High" },
    ],
    recommendation: {
      action: "Engage recruiting agency this week.",
      why: "Organic pipeline exhausted. Agency fee is cheaper than delay cost.",
      confidence: "Medium",
    },
    simulations: [
      { condition: "If agency engaged now", outcome: "Role filled in 1–2 weeks." },
      { condition: "If no change", outcome: "Roadmap slips 1 month. Team frustration rises." },
    ],
    score: { impact: 6, urgency: 7, effort: 3, total: 7.1 },
    decision: {
      action: "Engage recruiting agency for backend role.",
      impact: "Unblocks API v2. Cost: ~$15K agency fee.",
      confidence: "Medium",
      timeToImpact: "14 days",
    },
  },
  "levelup-climate": {
    insight: "Healthy trajectory. Monitor onboarding completion — it's the leading indicator.",
    predictions: [
      { prediction: "If onboarding stays at 68%, growth may plateau in 6 weeks.", timeframe: "42 days", confidence: "Medium" },
    ],
    recommendation: {
      action: "Optimize onboarding flow. Target 80% completion.",
      why: "Onboarding is the strongest lever for sustainable growth.",
      confidence: "Medium",
    },
    simulations: [
      { condition: "If onboarding hits 80%", outcome: "Growth could accelerate to +25% MoM." },
      { condition: "If onboarding stays at 68%", outcome: "Growth plateaus at +15% within 6 weeks." },
    ],
    score: { impact: 5, urgency: 4, effort: 3, total: 5.4 },
  },
  "project-x": {
    insight: "Survival mode. Every decision should optimize for extending runway or closing funding.",
    predictions: [
      { prediction: "Runway will end in ~73 days at current burn.", timeframe: "73 days", confidence: "High" },
      { prediction: "Without bridge, forced to cut 40% of team.", timeframe: "60 days", confidence: "Medium" },
    ],
    recommendation: {
      action: "Start bridge fundraising immediately. Cut non-essential spend now.",
      why: "Delay reduces leverage. Every day matters.",
      confidence: "High",
    },
    simulations: [
      { condition: "If bridge secured in 2 weeks", outcome: "Runway extends to 6 months." },
      { condition: "If no bridge + no cuts", outcome: "Company runs out of money in ~73 days." },
    ],
    score: { impact: 10, urgency: 10, effort: 7, total: 9.5 },
    decision: {
      action: "Initiate bridge round. Target $300K. Parallel: cut 20% non-essential spend.",
      impact: "Extends runway 3+ months. Preserves core team.",
      confidence: "High",
      timeToImpact: "3 days",
    },
  },
};

// Suggested prompts for Ask KAI
export const kaiSuggestedPrompts = [
  "What's the biggest risk?",
  "What should I focus on?",
  "What's slowing growth?",
  "Predict next month's trajectory",
];
