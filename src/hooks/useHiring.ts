import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export type JobStatus = "open" | "closed" | "on_hold" | "filled";
export type CandidateStage =
  | "applied" | "screening" | "interview_1" | "interview_2" | "offer" | "hired" | "rejected";

export interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  description: string | null;
  status: JobStatus;
  posted_at: string;
  closing_at: string | null;
  positions: number;
  hiring_manager: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  job_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  resume_url: string | null;
  source: string | null;
  stage: CandidateStage;
  rating: number | null;
  notes: string | null;
  rejected_reason: string | null;
  applied_at: string;
  hired_profile_id: string | null;
  hired_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Job postings ──────────────────────────────────────────────

export function useJobPostings() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("job-postings")
      .on("postgres_changes", { event: "*", schema: "public", table: "job_postings" }, () =>
        qc.invalidateQueries({ queryKey: ["job-postings"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return useQuery({
    queryKey: ["job-postings"],
    queryFn: async (): Promise<JobPosting[]> => {
      const { data, error } = await supabase
        .from("job_postings")
        .select("*")
        .order("status", { ascending: true }) // open first
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobPosting[];
    },
  });
}

export function useCreateJobPosting() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      department?: string;
      description?: string;
      positions?: number;
      closingAt?: string | null;
    }) => {
      if (!user?.id) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("job_postings")
        .insert({
          title: input.title.trim(),
          department: input.department?.trim() || null,
          description: input.description?.trim() || null,
          positions: input.positions ?? 1,
          closing_at: input.closingAt ?? null,
          created_by: user.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-postings"] }),
  });
}

export function useUpdateJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobStatus }) => {
      const { error } = await supabase.from("job_postings").update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-postings"] }),
  });
}

// ── Candidates ───────────────────────────────────────────────

export function useCandidatesForJob(jobId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!jobId) return;
    const ch = supabase
      .channel(`candidates-${jobId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidates", filter: `job_id=eq.${jobId}` },
        () => qc.invalidateQueries({ queryKey: ["candidates", jobId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [jobId, qc]);

  return useQuery({
    queryKey: ["candidates", jobId],
    enabled: !!jobId,
    queryFn: async (): Promise<Candidate[]> => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("job_id", jobId!)
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Candidate[];
    },
  });
}

export function useAddCandidate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      jobId: string;
      fullName: string;
      email?: string;
      phone?: string;
      source?: string;
      resumeUrl?: string;
    }) => {
      if (!user?.id) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("candidates")
        .insert({
          job_id: input.jobId,
          full_name: input.fullName.trim(),
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          source: input.source?.trim() || null,
          resume_url: input.resumeUrl?.trim() || null,
          created_by: user.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidates", vars.jobId] });
    },
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      jobId,
      patch,
    }: {
      id: string;
      jobId: string;
      patch: Partial<Pick<Candidate, "stage" | "rating" | "notes" | "rejected_reason" | "email" | "phone" | "resume_url">>;
    }) => {
      const enriched: any = { ...patch };
      if (patch.stage === "hired") enriched.hired_at = new Date().toISOString();
      const { error } = await supabase.from("candidates").update(enriched).eq("id", id);
      if (error) throw error;
      return jobId;
    },
    onSuccess: (jobId) => qc.invalidateQueries({ queryKey: ["candidates", jobId] }),
  });
}
