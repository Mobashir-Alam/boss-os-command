export type ConnectorType = "github" | "slack" | "youtube" | "google_sheets" | "spotify" | "drive";

export interface ConnectorMeta {
  type: ConnectorType;
  label: string;
  description: string;
  credentialFields: { key: string; label: string; placeholder: string; secret?: boolean }[];
}

export const CONNECTOR_REGISTRY: ConnectorMeta[] = [
  {
    type: "github",
    label: "GitHub",
    description: "Sync PRs, issues, and commits from your GitHub org",
    credentialFields: [
      { key: "token", label: "Personal Access Token", placeholder: "ghp_...", secret: true },
      { key: "org", label: "GitHub Org name", placeholder: "nasheedio" },
    ],
  },
  {
    type: "slack",
    label: "Slack",
    description: "Sync messages and activity from key channels",
    credentialFields: [
      { key: "token", label: "Bot Token", placeholder: "xoxb-...", secret: true },
      { key: "channel_ids", label: "Channel IDs (comma-separated)", placeholder: "C0123ABC,C0456DEF" },
    ],
  },
];

export interface ConnectorCredentialRow {
  id: string;
  startup_id: string;
  connector_type: ConnectorType;
  label: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  last_sync_error: string | null;
  created_at: string;
}

export interface GithubRecord {
  id: string;
  startup_id: string;
  record_type: "pull_request" | "issue" | "commit";
  external_id: string;
  repo_name: string;
  author_login: string | null;
  author_profile_id: string | null;
  title: string | null;
  state: string | null;
  labels: string[];
  created_at_source: string | null;
  updated_at_source: string | null;
  merged_at_source: string | null;
  synced_at: string;
}

export interface MetricRow {
  id: string;
  startup_id: string;
  connector_type: string;
  department_key: string | null;
  metric_name: string;
  metric_value: number | null;
  metric_text: string | null;
  period_start: string;
  period_end: string;
  granularity: string;
  synced_at: string;
}

export interface KaiInsight {
  id: string;
  startup_id: string;
  department_key: string | null;
  insight_type: "summary" | "risk" | "opportunity" | "action" | "prediction";
  title: string | null;
  body: string;
  confidence: "high" | "medium" | "low" | null;
  data_sources: string[];
  is_read: boolean;
  is_dismissed: boolean;
  generated_at: string;
  expires_at: string | null;
}
