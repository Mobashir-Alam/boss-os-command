import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo } from "react";

export type LeaveType = "casual" | "sick" | "earned" | "wfh" | "unpaid" | "half_day" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequestRow {
  id: string;
  profile_id: string;
  leave_type: LeaveType;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  half_day_part: "morning" | "afternoon" | null;
  reason: string | null;
  status: LeaveStatus;
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest extends LeaveRequestRow {
  applicant?: { full_name: string | null; email: string | null } | null;
  reviewer?:  { full_name: string | null; email: string | null } | null;
}

const LEAVE_QUERY_KEY = "leave-requests";

// ── Fetch helpers ─────────────────────────────────────────────────────────

function useLeaveProfileLookup(rows: LeaveRequestRow[]): Map<string, { full_name: string | null; email: string | null }> {
  const ids = useMemo(
    () => Array.from(new Set(rows.flatMap((r) => [r.profile_id, r.requested_by, r.reviewed_by]).filter(Boolean) as string[])),
    [rows]
  );
  const { data } = useQuery({
    queryKey: ["leave-profile-names", ids.sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      if (error) throw error;
      return data ?? [];
    },
  });
  return useMemo(() => {
    const m = new Map<string, { full_name: string | null; email: string | null }>();
    (data ?? []).forEach((p: any) => m.set(p.id, { full_name: p.full_name ?? null, email: p.email ?? null }));
    return m;
  }, [data]);
}

function joinNames(rows: LeaveRequestRow[], names: Map<string, { full_name: string | null; email: string | null }>): LeaveRequest[] {
  return rows.map((r) => ({
    ...r,
    applicant: r.profile_id ? names.get(r.profile_id) ?? null : null,
    reviewer: r.reviewed_by ? names.get(r.reviewed_by) ?? null : null,
  }));
}

// ── All leave requests (HR view) ──────────────────────────────────────────

export function useAllLeaveRequests() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("leave-requests-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "leave_requests" }, () => {
        qc.invalidateQueries({ queryKey: [LEAVE_QUERY_KEY] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const baseQuery = useQuery({
    queryKey: [LEAVE_QUERY_KEY, "all"],
    queryFn: async (): Promise<LeaveRequestRow[]> => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as LeaveRequestRow[];
    },
  });

  const names = useLeaveProfileLookup(baseQuery.data ?? []);
  return {
    data: joinNames(baseQuery.data ?? [], names),
    isLoading: baseQuery.isLoading,
  };
}

// ── My leave requests (employee view) ─────────────────────────────────────

export function useMyLeaveRequests() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`leave-requests-mine-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leave_requests", filter: `profile_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: [LEAVE_QUERY_KEY, "mine", user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  const baseQuery = useQuery({
    queryKey: [LEAVE_QUERY_KEY, "mine", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<LeaveRequestRow[]> => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("profile_id", user!.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeaveRequestRow[];
    },
  });

  const names = useLeaveProfileLookup(baseQuery.data ?? []);
  return {
    data: joinNames(baseQuery.data ?? [], names),
    isLoading: baseQuery.isLoading,
  };
}

// ── Mutations ─────────────────────────────────────────────────────────────

export interface CreateLeaveInput {
  profileId: string;        // whose leave (self or, if HR, anyone)
  leaveType: LeaveType;
  startDate: string;        // YYYY-MM-DD
  endDate: string;
  halfDayPart?: "morning" | "afternoon" | null;
  reason?: string | null;
  autoApprove?: boolean;    // HR-only — set status='approved' immediately
  reviewNote?: string | null;
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateLeaveInput) => {
      if (!user?.id) throw new Error("Not signed in");
      const status: LeaveStatus = input.autoApprove ? "approved" : "pending";
      const reviewedAt = input.autoApprove ? new Date().toISOString() : null;
      const reviewedBy = input.autoApprove ? user.id : null;

      const { data: inserted, error } = await supabase
        .from("leave_requests")
        .insert({
          profile_id: input.profileId,
          leave_type: input.leaveType,
          start_date: input.startDate,
          end_date: input.endDate,
          half_day_part: input.halfDayPart ?? null,
          reason: input.reason?.trim() || null,
          status,
          requested_by: user.id,
          reviewed_by: reviewedBy,
          reviewed_at: reviewedAt,
          review_note: input.reviewNote?.trim() || null,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // If auto-approved, immediately reflect in attendance
      if (input.autoApprove) {
        await writeAttendanceForLeave(input.profileId, input.startDate, input.endDate, input.leaveType, user.id);
      }

      return inserted;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LEAVE_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useReviewLeaveRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      action,
      note,
    }: {
      id: string;
      action: "approve" | "reject";
      note?: string;
    }) => {
      if (!user?.id) throw new Error("Not signed in");
      const newStatus: LeaveStatus = action === "approve" ? "approved" : "rejected";

      // Read first to know dates + profile (so we can write attendance on approval)
      const { data: existing, error: readErr } = await supabase
        .from("leave_requests")
        .select("profile_id, start_date, end_date, leave_type, status")
        .eq("id", id)
        .single();
      if (readErr) throw readErr;

      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: newStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_note: note?.trim() || null,
        } as any)
        .eq("id", id);
      if (error) throw error;

      if (action === "approve" && existing) {
        await writeAttendanceForLeave(
          (existing as any).profile_id,
          (existing as any).start_date,
          (existing as any).end_date,
          (existing as any).leave_type,
          user.id
        );
      }

      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LEAVE_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useCancelLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("leave_requests")
        .update({ status: "cancelled" } as any)
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LEAVE_QUERY_KEY] });
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function eachDateBetween(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const cur = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  while (cur.getTime() <= end.getTime()) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

async function writeAttendanceForLeave(
  profileId: string,
  startDate: string,
  endDate: string,
  leaveType: LeaveType,
  markedById: string
) {
  const status = leaveType === "half_day" ? "half_day" : "on_leave";
  const dates = eachDateBetween(startDate, endDate);
  if (dates.length === 0) return;
  const rows = dates.map((d) => ({
    profile_id: profileId,
    attendance_date: d,
    status,
    source: "manual",
    marked_by: markedById,
    notes: `Auto-set from approved ${leaveType} leave`,
  }));
  // Upsert ignores days that already have a record from elsewhere.
  await supabase.from("attendance_records").upsert(rows as any, { onConflict: "profile_id,attendance_date" });
}
