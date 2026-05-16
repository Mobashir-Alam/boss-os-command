import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo } from "react";

export type ReviewStatus = "draft" | "submitted" | "acknowledged";

export interface ReviewCycle {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: "open" | "closed";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RatingsBreakdown {
  quality?: number;
  productivity?: number;
  collaboration?: number;
  initiative?: number;
  [key: string]: number | undefined;
}

export interface PerformanceReviewRow {
  id: string;
  cycle_id: string;
  reviewee_id: string;
  reviewer_id: string;
  status: ReviewStatus;
  overall_rating: number | null;
  ratings: RatingsBreakdown;
  strengths: string | null;
  improvements: string | null;
  goals: string | null;
  reviewer_notes: string | null;
  acknowledgment_note: string | null;
  submitted_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceReview extends PerformanceReviewRow {
  reviewee?: { full_name: string | null; email: string | null } | null;
  reviewer?: { full_name: string | null; email: string | null } | null;
  cycle?: { name: string; status: string } | null;
}

const RV_KEY = "performance-reviews";

// ── Cycles ────────────────────────────────────────────────────────────────

export function useReviewCycles() {
  return useQuery({
    queryKey: ["review-cycles"],
    queryFn: async (): Promise<ReviewCycle[]> => {
      const { data, error } = await supabase
        .from("review_cycles")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReviewCycle[];
    },
  });
}

export function useCreateReviewCycle() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; startDate: string; endDate: string }) => {
      if (!user?.id) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("review_cycles")
        .insert({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          start_date: input.startDate,
          end_date: input.endDate,
          created_by: user.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["review-cycles"] });
    },
  });
}

export function useToggleCycleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "open" | "closed" }) => {
      const { error } = await supabase
        .from("review_cycles")
        .update({ status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review-cycles"] }),
  });
}

// ── Reviews ───────────────────────────────────────────────────────────────

function useNameLookup(rows: PerformanceReviewRow[]): Map<string, { full_name: string | null; email: string | null }> {
  const ids = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r.reviewee_id) s.add(r.reviewee_id);
      if (r.reviewer_id) s.add(r.reviewer_id);
    });
    return Array.from(s);
  }, [rows]);

  const { data } = useQuery({
    queryKey: ["review-names", ids.sort().join(",")],
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

function useCycleLookup(rows: PerformanceReviewRow[]): Map<string, { name: string; status: string }> {
  const ids = useMemo(() => Array.from(new Set(rows.map((r) => r.cycle_id))), [rows]);
  const { data } = useQuery({
    queryKey: ["review-cycle-lookup", ids.sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_cycles")
        .select("id, name, status")
        .in("id", ids);
      if (error) throw error;
      return data ?? [];
    },
  });
  return useMemo(() => {
    const m = new Map<string, { name: string; status: string }>();
    (data ?? []).forEach((c: any) => m.set(c.id, { name: c.name, status: c.status }));
    return m;
  }, [data]);
}

function joinAll(
  rows: PerformanceReviewRow[],
  names: Map<string, { full_name: string | null; email: string | null }>,
  cycles: Map<string, { name: string; status: string }>
): PerformanceReview[] {
  return rows.map((r) => ({
    ...r,
    reviewee: names.get(r.reviewee_id) ?? null,
    reviewer: names.get(r.reviewer_id) ?? null,
    cycle: cycles.get(r.cycle_id) ?? null,
  }));
}

export function useAllReviews() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("perf-reviews-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "performance_reviews" }, () => {
        qc.invalidateQueries({ queryKey: [RV_KEY] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const baseQuery = useQuery({
    queryKey: [RV_KEY, "all"],
    queryFn: async (): Promise<PerformanceReviewRow[]> => {
      const { data, error } = await supabase
        .from("performance_reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as PerformanceReviewRow[];
    },
  });

  const names = useNameLookup(baseQuery.data ?? []);
  const cycles = useCycleLookup(baseQuery.data ?? []);
  return {
    data: joinAll(baseQuery.data ?? [], names, cycles),
    isLoading: baseQuery.isLoading,
  };
}

// Reviews ASSIGNED TO me as the reviewer that I still need to write
export function useReviewsToWrite() {
  const { user } = useAuth();
  const baseQuery = useQuery({
    queryKey: [RV_KEY, "to-write", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<PerformanceReviewRow[]> => {
      const { data, error } = await supabase
        .from("performance_reviews")
        .select("*")
        .eq("reviewer_id", user!.id)
        .in("status", ["draft", "submitted"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PerformanceReviewRow[];
    },
  });
  const names = useNameLookup(baseQuery.data ?? []);
  const cycles = useCycleLookup(baseQuery.data ?? []);
  return {
    data: joinAll(baseQuery.data ?? [], names, cycles),
    isLoading: baseQuery.isLoading,
  };
}

// Reviews ABOUT me (reviewee)
export function useMyReviews() {
  const { user } = useAuth();
  const baseQuery = useQuery({
    queryKey: [RV_KEY, "about-me", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<PerformanceReviewRow[]> => {
      const { data, error } = await supabase
        .from("performance_reviews")
        .select("*")
        .eq("reviewee_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PerformanceReviewRow[];
    },
  });
  const names = useNameLookup(baseQuery.data ?? []);
  const cycles = useCycleLookup(baseQuery.data ?? []);
  return {
    data: joinAll(baseQuery.data ?? [], names, cycles),
    isLoading: baseQuery.isLoading,
  };
}

// ── Mutations on reviews ─────────────────────────────────────────────────

export interface CreateReviewInput {
  cycleId: string;
  revieweeId: string;
  reviewerId: string;
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateReviewInput) => {
      const { data, error } = await supabase
        .from("performance_reviews")
        .insert({
          cycle_id: input.cycleId,
          reviewee_id: input.revieweeId,
          reviewer_id: input.reviewerId,
          status: "draft",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RV_KEY] }),
  });
}

export interface UpdateReviewInput {
  id: string;
  patch: Partial<
    Pick<
      PerformanceReviewRow,
      "overall_rating" | "ratings" | "strengths" | "improvements" | "goals" | "reviewer_notes"
    >
  >;
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: UpdateReviewInput) => {
      const { error } = await supabase
        .from("performance_reviews")
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RV_KEY] }),
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Not signed in");
      // Read first so we can notify the reviewee
      const { data: review, error: readErr } = await supabase
        .from("performance_reviews")
        .select("reviewee_id, cycle_id")
        .eq("id", id)
        .single();
      if (readErr) throw readErr;

      const { error } = await supabase
        .from("performance_reviews")
        .update({ status: "submitted", submitted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;

      // Notify reviewee
      if (review && (review as any).reviewee_id !== user.id) {
        await supabase.from("notifications").insert({
          recipient_profile_id: (review as any).reviewee_id,
          actor_profile_id: user.id,
          type: "task_updated", // reuse existing enum value to avoid migration
          message: "submitted a performance review for you. Open it to acknowledge.",
          link: "/employee",
        } as any);
      }

      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RV_KEY] }),
  });
}

export function useReopenReview() {
  // HR action — flip back to draft
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("performance_reviews")
        .update({ status: "draft", submitted_at: null, acknowledged_at: null } as any)
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RV_KEY] }),
  });
}

export function useAcknowledgeReview() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      if (!user?.id) throw new Error("Not signed in");
      const { data: review, error: readErr } = await supabase
        .from("performance_reviews")
        .select("reviewer_id")
        .eq("id", id)
        .single();
      if (readErr) throw readErr;

      const { error } = await supabase
        .from("performance_reviews")
        .update({
          status: "acknowledged",
          acknowledged_at: new Date().toISOString(),
          acknowledgment_note: note?.trim() || null,
        } as any)
        .eq("id", id);
      if (error) throw error;

      // Notify reviewer
      if (review && (review as any).reviewer_id !== user.id) {
        await supabase.from("notifications").insert({
          recipient_profile_id: (review as any).reviewer_id,
          actor_profile_id: user.id,
          type: "task_updated",
          message: "acknowledged the performance review you wrote.",
          link: "/team/hr",
        } as any);
      }

      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RV_KEY] }),
  });
}
