import { TableCell, TableRow } from "@/components/ui/table";
import { GitCommit, GitPullRequest, CalendarCheck2 } from "lucide-react";
import { usePersonLink, usePersonActivity } from "@/hooks/useConnectorLinks";

// Compact 7-day activity summary shown when a person row is expanded in
// People OS. Reads employee_connector_links to know which Slack/GitHub
// accounts belong to this person.
export default function PersonActivityRow({
  personId,
  startupId,
  colSpan,
}: {
  personId: string;
  startupId: string;
  colSpan: number;
}) {
  const { data: link, isLoading: linkLoading } = usePersonLink(personId);
  const { data: activity, isLoading: actLoading } = usePersonActivity(
    startupId,
    link?.github_login,
    link?.slack_user_id,
    7
  );

  const loading = linkLoading || (link && (link.github_login || link.slack_user_id) && actLoading);

  return (
    <TableRow className="bg-muted/20 hover:bg-muted/20">
      <TableCell colSpan={colSpan} className="py-3 px-6">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading activity…</p>
        ) : !link || (!link.github_login && !link.slack_user_id) ? (
          <p className="text-xs text-muted-foreground italic">
            No Slack/GitHub accounts linked — use the 🔗 button to connect them.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
              Last 7 days
            </span>
            {activity?.github.linked && (
              <>
                <span className="flex items-center gap-1.5">
                  <GitCommit className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="tabular-nums font-medium">{activity.github.total_commits}</span>
                  commits
                </span>
                <span className="flex items-center gap-1.5">
                  <GitPullRequest className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="tabular-nums font-medium">{activity.github.prs_opened}</span>
                  PRs opened ·
                  <span className="tabular-nums font-medium">{activity.github.prs_merged}</span>
                  merged
                </span>
                <span className="text-muted-foreground">
                  <span className="text-emerald-600">+{activity.github.additions.toLocaleString()}</span>{" "}
                  <span className="text-red-500">−{activity.github.deletions.toLocaleString()}</span>
                </span>
              </>
            )}
            {activity?.slack.linked && (
              <span className="flex items-center gap-1.5">
                <CalendarCheck2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="tabular-nums font-medium">{activity.slack.checked_in_days}</span>
                check-ins ·
                <span className="tabular-nums font-medium">{activity.slack.active_days}</span>
                active days
              </span>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
