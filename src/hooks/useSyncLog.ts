import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SyncLogRow {
  id: string;
  startup_id: string | null;
  source: string; // 'github' | 'slack' | 'youtube' | 'youtube_analytics'
  started_at: string;
  finished_at: string | null;
  status: string; // 'success' | 'error'
  rows_touched: number | null;
  error: string | null;
}

export interface SyncLogSnapshot {
  rows: SyncLogRow[];
  lastBySource: Record<string, SyncLogRow>;
}

// Last 20 sync_log rows for the startup + the most recent entry per source.
export function useSyncLog(startupId: string | undefined) {
  return useQuery({
    queryKey: ["sync-log", startupId],
    enabled: !!startupId,
    refetchInterval: 5 * 60 * 1000, // keep "X ago" labels honest between syncs
    queryFn: async (): Promise<SyncLogSnapshot> => {
      const { data, error } = await supabase
        .from("sync_log")
        .select("*")
        .eq("startup_id", startupId!)
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const rows = (data ?? []) as SyncLogRow[];
      const lastBySource: Record<string, SyncLogRow> = {};
      for (const r of rows) {
        if (!lastBySource[r.source]) lastBySource[r.source] = r;
      }
      return { rows, lastBySource };
    },
  });
}

export function timeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// True when the source synced within the last hour (data is "fresh").
export function isFresh(row: SyncLogRow | undefined, maxAgeMs = 60 * 60 * 1000): boolean {
  if (!row || row.status !== "success") return false;
  const ts = row.finished_at ?? row.started_at;
  return Date.now() - new Date(ts).getTime() < maxAgeMs;
}

// Global toast when auto-sync completes: subscribes to sync_log INSERTs via
// Supabase realtime and shows one debounced toast per burst of inserts.
// Call once per dashboard page.
export function useAutoSyncToast(startupId: string | undefined) {
  const qc = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourcesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!startupId) return;
    // Unique channel name per mount — avoids the duplicate-subscribe error
    // React Strict Mode's double-invoked effects trigger on a fixed name.
    const channelName = `sync-log-${startupId}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sync_log",
          filter: `startup_id=eq.${startupId}`,
        },
        (payload) => {
          const row = payload.new as SyncLogRow;
          if (row.status === "success") sourcesRef.current.add(row.source);
          // A full auto-sync inserts several rows back-to-back — collapse
          // them into one toast.
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            const labels = Array.from(sourcesRef.current)
              .map((s) => (s === "youtube_analytics" ? "YouTube Analytics" : s.charAt(0).toUpperCase() + s.slice(1)))
              .join(", ");
            if (labels) {
              toast.success(`Auto-sync complete — ${labels} refreshed`);
            }
            sourcesRef.current.clear();
            qc.invalidateQueries({ queryKey: ["sync-log", startupId] });
          }, 4000);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [startupId, qc]);
}
