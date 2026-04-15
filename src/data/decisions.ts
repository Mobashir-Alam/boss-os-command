export type DecisionStatus = "pending" | "in-progress" | "resolved" | "re-evaluate";

export interface DecisionNote {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface LinkedTaskRef {
  taskId: string;
  title: string;
  status: "pending" | "in-progress" | "completed" | "blocked";
}

export interface KaiResolution {
  status: "watching" | "resolved" | "resurfaced";
  metric: string;
  message: string;
  lastChecked: string;
}

export interface DecisionEntry {
  id: string;
  title: string;
  dateAccepted: string;
  startupId: string;
  startupName: string;
  owner: string;
  reasoning: string;
  linkedTasks: LinkedTaskRef[];
  status: DecisionStatus;
  outcome?: string;
  kaiResolution: KaiResolution;
  notes: DecisionNote[];
}

export const decisionEntries: DecisionEntry[] = [
  {
    id: "dec-1",
    title: "Fix retention before scaling",
    dateAccepted: "Apr 8, 2026",
    startupId: "nasheedio",
    startupName: "Nasheedio",
    owner: "Founder",
    reasoning: "KAI detected retention ↓12%. Scaling with leaky funnel wastes capital. Fix retention first, then resume growth.",
    linkedTasks: [
      { taskId: "task-1", title: "Launch creator reactivation campaign", status: "in-progress" },
      { taskId: "task-5", title: "Analyze premium tier churn reasons", status: "completed" },
    ],
    status: "in-progress",
    kaiResolution: {
      status: "watching",
      metric: "Monthly retention rate",
      message: "Retention currently at 68% — target is 75%. Watching weekly trend.",
      lastChecked: "2 hours ago",
    },
    notes: [
      { id: "dn-1", author: "Founder", text: "Pausing all paid acquisition until retention hits 75%.", timestamp: "Apr 8, 2026" },
      { id: "dn-2", author: "Alice Chen (MFO)", text: "Reactivation campaign live — early signals positive.", timestamp: "Apr 13, 2026" },
    ],
  },
  {
    id: "dec-2",
    title: "Cut non-essential spend by 20%",
    dateAccepted: "Apr 11, 2026",
    startupId: "project-x",
    startupName: "Project X",
    owner: "CFO",
    reasoning: "Runway below 3 months. Need to extend by 2+ months while bridge round is arranged.",
    linkedTasks: [
      { taskId: "task-3", title: "Cut non-essential spend by 20%", status: "blocked" },
      { taskId: "task-2", title: "Prepare investor outreach list", status: "in-progress" },
    ],
    status: "pending",
    kaiResolution: {
      status: "watching",
      metric: "Monthly burn rate & runway",
      message: "Burn at $185K/mo, runway 2.5 months. No improvement yet.",
      lastChecked: "30 min ago",
    },
    notes: [
      { id: "dn-3", author: "CFO", text: "Waiting on budget approval to proceed with cuts.", timestamp: "Apr 12, 2026" },
    ],
  },
  {
    id: "dec-3",
    title: "Expand backend search to remote candidates",
    dateAccepted: "Apr 12, 2026",
    startupId: "gurucool",
    startupName: "Gurucool",
    owner: "HR Head",
    reasoning: "Backend role open 21 days, local pipeline exhausted. Remote hires fill 40% faster in similar roles.",
    linkedTasks: [
      { taskId: "task-4", title: "Push referral hiring campaign", status: "pending" },
      { taskId: "task-6", title: "Schedule backend engineer interviews", status: "blocked" },
    ],
    status: "in-progress",
    kaiResolution: {
      status: "watching",
      metric: "Time-to-hire for backend role",
      message: "Role still open. 3 remote candidates added to pipeline.",
      lastChecked: "1 day ago",
    },
    notes: [
      { id: "dn-4", author: "HR Head", text: "Posted on 3 remote job boards. 12 applications received.", timestamp: "Apr 13, 2026" },
    ],
  },
  {
    id: "dec-4",
    title: "Prioritize Android crash hotfix",
    dateAccepted: "Apr 12, 2026",
    startupId: "nasheedio",
    startupName: "Nasheedio",
    owner: "CTO",
    reasoning: "2.1% crash rate on Android 12+ impacting retention. Hotfix estimated at 2 dev-days.",
    linkedTasks: [],
    status: "resolved",
    outcome: "Crash rate reduced to 0.3% after hotfix deployed Apr 14. No further reports.",
    kaiResolution: {
      status: "resolved",
      metric: "Android crash rate",
      message: "Crash rate at 0.3% — below 0.5% threshold. Marked resolved.",
      lastChecked: "6 hours ago",
    },
    notes: [
      { id: "dn-5", author: "CTO", text: "Hotfix shipped. Monitoring for 48 hours.", timestamp: "Apr 14, 2026" },
      { id: "dn-6", author: "KAI", text: "Crash rate stable at 0.3%. Auto-resolved.", timestamp: "Apr 15, 2026" },
    ],
  },
  {
    id: "dec-5",
    title: "Shift 30% paid budget to organic content",
    dateAccepted: "Apr 11, 2026",
    startupId: "levelup-climate",
    startupName: "LevelUp Climate",
    owner: "Marketing Lead",
    reasoning: "Paid CPA rising. Organic showing 2× ROI. Reallocate before next spend cycle.",
    linkedTasks: [],
    status: "pending",
    kaiResolution: {
      status: "watching",
      metric: "CAC & organic traffic share",
      message: "Organic at 60% of traffic. CAC trending down — watching for sustained improvement.",
      lastChecked: "5 hours ago",
    },
    notes: [],
  },
  {
    id: "dec-6",
    title: "Ship reduced-scope API v2",
    dateAccepted: "Apr 13, 2026",
    startupId: "gurucool",
    startupName: "Gurucool",
    owner: "CTO",
    reasoning: "Full v2 blocked by backend hire. Partners waiting. Ship core endpoints first.",
    linkedTasks: [],
    status: "re-evaluate",
    kaiResolution: {
      status: "resurfaced",
      metric: "API v2 partner dependency",
      message: "2 partners escalated — reduced scope may not meet their integration needs. Re-evaluate scope.",
      lastChecked: "3 hours ago",
    },
    notes: [
      { id: "dn-7", author: "CTO", text: "Partner feedback suggests we need at least 3 more endpoints.", timestamp: "Apr 14, 2026" },
    ],
  },
];
