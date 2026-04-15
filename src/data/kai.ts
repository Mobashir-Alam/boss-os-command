// KAI — Strategic Intelligence Data

export interface KaiInsightData {
  id: string;
  startupId?: string;
  insight: string;
  convertible?: boolean;
}

// Global insight (Home screen)
export const globalKaiInsight: KaiInsightData = {
  id: "kai-global",
  insight: "Nasheedio retention drop linked to reduced creator activity. Fix before scaling.",
  convertible: true,
};

// Per-priority insights (Focus screen)
export const focusKaiInsights: Record<string, string> = {
  "fp-1": "If unresolved, retention drop may reduce growth by ~18% next month.",
  "fp-2": "At current burn, runway hits zero in ~70 days. Bridge funding decision is urgent.",
  "fp-3": "Hiring delay could slow product roadmap by 2–3 weeks.",
};

// Per-startup insights (Startup Detail screen)
export const startupKaiInsights: Record<string, string> = {
  nasheedio: "Growth is strong, but retention risk may slow momentum if creator activity stays low.",
  gurucool: "Product velocity depends on filling the backend role. Consider agency or contractor bridge.",
  "levelup-climate": "Healthy trajectory. Monitor onboarding completion — it's the leading indicator.",
  "project-x": "Survival mode. Every decision should optimize for extending runway or closing funding.",
};

// Suggested prompts for Ask KAI
export const kaiSuggestedPrompts = [
  "What's the biggest risk?",
  "What should I focus on?",
  "What's slowing growth?",
];
