import { cn } from "@/lib/utils";
import { useSyncLog, timeAgo, isFresh } from "@/hooks/useSyncLog";

// The pg_cron job fires at minute 0 of every 3rd hour (UTC).
function nextAutoSync(): string {
  const now = new Date();
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(Math.floor(now.getUTCHours() / 3) * 3 + 3);
  return next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// "Last synced X ago" line driven by sync_log, with a pulsing green dot when
// an auto-sync for the source landed within the last hour (data is fresh).
// `sources` lets a dashboard aggregate several log sources (e.g. youtube +
// youtube_analytics) into one label — the most recent entry wins.
export default function SyncStatusBadge({
  startupId,
  sources,
  className,
}: {
  startupId: string | undefined;
  sources: string[];
  className?: string;
}) {
  const { data } = useSyncLog(startupId);
  if (!data) return null;

  const rows = sources
    .map((s) => data.lastBySource[s])
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => (b.started_at > a.started_at ? 1 : -1));
  const latest = rows[0];
  if (!latest) return null;

  const fresh = rows.some((r) => isFresh(r));
  const ago = timeAgo(latest.finished_at ?? latest.started_at);

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}
      title={
        (latest.status === "error"
          ? `Last sync failed: ${latest.error ?? "unknown error"}`
          : `Last ${latest.source} sync ${ago}`) + ` · next auto-sync ~${nextAutoSync()}`
      }
    >
      {fresh && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      )}
      Last synced {ago}
      {latest.status === "error" && <span className="text-amber-600">· last run failed</span>}
    </span>
  );
}
