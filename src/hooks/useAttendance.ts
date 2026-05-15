import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export type AttendanceStatus = "present" | "absent" | "on_leave" | "half_day" | "not_marked";

export interface AttendanceRecord {
  id: string;
  profile_id: string;
  attendance_date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  first_in_at: string | null;
  last_out_at: string | null;
  total_minutes: number | null;
  session_count: number;
  source: "slack" | "manual";
  raw_events: any[];
  marked_by: string | null;
  notes: string | null;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
}

export function todayISO(): string {
  // Local-date YYYY-MM-DD (avoids UTC drift at IST midnight)
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useAttendanceForDate(dateISO: string) {
  const qc = useQueryClient();

  // Realtime so HR's Today tab updates as people get marked
  useEffect(() => {
    const channel = supabase
      .channel(`attendance-${dateISO}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
          filter: `attendance_date=eq.${dateISO}`,
        },
        () => qc.invalidateQueries({ queryKey: ["attendance", dateISO] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateISO, qc]);

  return useQuery({
    queryKey: ["attendance", dateISO],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("attendance_date", dateISO)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AttendanceRecord[];
    },
  });
}

export function useUpsertAttendance() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      profileId,
      dateISO,
      status,
      notes,
    }: {
      profileId: string;
      dateISO: string;
      status: AttendanceStatus;
      notes?: string | null;
    }) => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await supabase.from("attendance_records").upsert(
        {
          profile_id: profileId,
          attendance_date: dateISO,
          status,
          source: "manual",
          marked_by: user.id,
          notes: notes ?? null,
        } as any,
        { onConflict: "profile_id,attendance_date" }
      );
      if (error) throw error;
      return dateISO;
    },
    onSuccess: (dateISO) => {
      qc.invalidateQueries({ queryKey: ["attendance", dateISO] });
    },
  });
}

// Per-person attendance for the last N days (for the directory drill-in / profile view)
export function useAttendanceHistory(profileId: string | undefined, days = 30) {
  return useQuery({
    queryKey: ["attendance-history", profileId, days],
    enabled: !!profileId,
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("profile_id", profileId!)
        .gte("attendance_date", since)
        .order("attendance_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AttendanceRecord[];
    },
  });
}
