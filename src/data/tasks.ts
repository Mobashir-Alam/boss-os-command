export type TaskStatus = "pending" | "in-progress" | "completed";

export interface Task {
  id: string;
  title: string;
  linkedIssueId: string;
  linkedStartupId: string;
  assignee: string;
  status: TaskStatus;
  deadline: string | null;
  instructions: string;
  lastUpdated: string;
  createdAt: string;
}

export interface MfoUpdate {
  id: string;
  startupId: string;
  person: string;
  message: string;
  timestamp: string;
}

export interface ActivityLogEntry {
  id: string;
  startupId: string;
  action: string;
  actor: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  type: "assigned" | "deadline-near" | "overdue";
  message: string;
  read: boolean;
  timestamp: string;
}

export const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "Launch creator reactivation campaign",
    linkedIssueId: "fp-1",
    linkedStartupId: "nasheedio",
    assignee: "Alice Chen",
    status: "in-progress",
    deadline: "Apr 18, 2026",
    instructions: "Send re-engagement emails to top 200 inactive creators. Offer incentive for 3 uploads this week.",
    lastUpdated: "1 hour ago",
    createdAt: "2 days ago",
  },
  {
    id: "task-2",
    title: "Prepare investor outreach list",
    linkedIssueId: "fp-2",
    linkedStartupId: "project-x",
    assignee: "CFO",
    status: "in-progress",
    deadline: "Apr 16, 2026",
    instructions: "Compile 15 potential bridge investors. Include warm intros from existing board.",
    lastUpdated: "3 hours ago",
    createdAt: "5 days ago",
  },
  {
    id: "task-3",
    title: "Cut non-essential spend by 20%",
    linkedIssueId: "fp-2",
    linkedStartupId: "project-x",
    assignee: "CFO",
    status: "pending",
    deadline: "Apr 17, 2026",
    instructions: "Review all recurring costs. Pause non-critical SaaS tools and contractor engagements.",
    lastUpdated: "1 day ago",
    createdAt: "3 days ago",
  },
  {
    id: "task-4",
    title: "Push referral hiring campaign",
    linkedIssueId: "fp-3",
    linkedStartupId: "gurucool",
    assignee: "HR Head",
    status: "pending",
    deadline: "Apr 20, 2026",
    instructions: "Offer $2K referral bonus. Post in 5 backend-focused communities.",
    lastUpdated: "2 days ago",
    createdAt: "5 days ago",
  },
  {
    id: "task-5",
    title: "Analyze premium tier churn reasons",
    linkedIssueId: "p2-nasheedio",
    linkedStartupId: "nasheedio",
    assignee: "CS Head",
    status: "completed",
    deadline: "Apr 14, 2026",
    instructions: "Survey churned premium users. Identify top 3 reasons.",
    lastUpdated: "6 hours ago",
    createdAt: "1 week ago",
  },
];

export const initialMfoUpdates: MfoUpdate[] = [
  { id: "mfo-1", startupId: "nasheedio", person: "Alice Chen (MFO)", message: "Reached out to 10 top creators today — 4 responded positively.", timestamp: "25 min ago" },
  { id: "mfo-2", startupId: "project-x", person: "Bob Kumar (MFO)", message: "Investor deck updated. 3 warm intros scheduled this week.", timestamp: "1 hour ago" },
  { id: "mfo-3", startupId: "gurucool", person: "Carol Martinez (MFO)", message: "Backend candidates shortlisted — 2 final round interviews set.", timestamp: "3 hours ago" },
  { id: "mfo-4", startupId: "nasheedio", person: "Alice Chen (MFO)", message: "Creator reactivation emails sent to batch 1 (50 creators).", timestamp: "5 hours ago" },
  { id: "mfo-5", startupId: "levelup-climate", person: "Dave Singh (MFO)", message: "New cohort activation rate hit 74% — above target.", timestamp: "1 day ago" },
];

export const initialActivityLog: ActivityLogEntry[] = [
  { id: "al-1", startupId: "nasheedio", action: "Task 'Launch creator reactivation campaign' assigned to Alice Chen", actor: "Founder", timestamp: "2 days ago" },
  { id: "al-2", startupId: "nasheedio", action: "Status changed to In Progress", actor: "Alice Chen", timestamp: "1 day ago" },
  { id: "al-3", startupId: "project-x", action: "Task 'Prepare investor outreach list' assigned to CFO", actor: "Founder", timestamp: "5 days ago" },
  { id: "al-4", startupId: "project-x", action: "Status changed to In Progress", actor: "CFO", timestamp: "3 days ago" },
  { id: "al-5", startupId: "gurucool", action: "Task 'Push referral hiring campaign' assigned to HR Head", actor: "Founder", timestamp: "5 days ago" },
  { id: "al-6", startupId: "nasheedio", action: "Update added by Alice Chen (MFO)", actor: "Alice Chen", timestamp: "25 min ago" },
  { id: "al-7", startupId: "project-x", action: "Update added by Bob Kumar (MFO)", actor: "Bob Kumar", timestamp: "1 hour ago" },
  { id: "al-8", startupId: "nasheedio", action: "Task 'Analyze premium tier churn reasons' completed", actor: "CS Head", timestamp: "6 hours ago" },
];

export const initialNotifications: Notification[] = [
  { id: "n-1", type: "overdue", message: "Task 'Prepare investor outreach list' is overdue (Project X)", read: false, timestamp: "1 hour ago" },
  { id: "n-2", type: "deadline-near", message: "Task 'Cut non-essential spend' due tomorrow (Project X)", read: false, timestamp: "2 hours ago" },
  { id: "n-3", type: "assigned", message: "Task 'Push referral hiring campaign' assigned to HR Head", read: false, timestamp: "5 hours ago" },
  { id: "n-4", type: "deadline-near", message: "Task 'Launch creator reactivation' due in 3 days (Nasheedio)", read: true, timestamp: "1 day ago" },
];

export const taskStatusConfig: Record<TaskStatus, { label: string; color: string; dot: string }> = {
  pending: { label: "Pending", color: "text-muted-foreground", dot: "bg-muted-foreground" },
  "in-progress": { label: "In Progress", color: "text-blue-500", dot: "bg-blue-500" },
  completed: { label: "Completed", color: "text-emerald-500", dot: "bg-emerald-500" },
};

export const assigneeOptions = [
  "Alice Chen (MFO)",
  "Bob Kumar (MFO)",
  "Carol Martinez (MFO)",
  "Dave Singh (MFO)",
  "HR Head",
  "CFO",
  "CTO",
  "CS Head",
  "Product Lead",
];
