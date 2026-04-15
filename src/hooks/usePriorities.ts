import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FocusPriority, PrioritySeverity, ExecutionStatus } from "@/data/focus";
import { toast } from "sonner";

interface DbPriority {
  id: string;
  startup_id: string;
  startup_name: string;
  tag: string;
  severity: string;
  problem: string;
  why: string;
  impact: string;
  impact_level: string;
  owner: string | null;
  mfo_suggestion: string;
  mfo_confidence: string;
  rank: number;
  detected_ago: string;
  deadline_in: string;
  execution_status: string;
  created_at: string;
}

function toFocusPriority(row: DbPriority): FocusPriority {
  return {
    id: row.id,
    startupId: row.startup_id,
    startupName: row.startup_name,
    tag: row.tag,
    severity: row.severity as PrioritySeverity,
    problem: row.problem,
    why: row.why,
    impact: row.impact,
    impactLevel: row.impact_level as "High" | "Medium" | "Low",
    owner: row.owner,
    mfoSuggestion: row.mfo_suggestion,
    mfoConfidence: row.mfo_confidence as "High" | "Medium",
    rank: row.rank,
    detectedAgo: row.detected_ago,
    deadlineIn: row.deadline_in,
    executionStatus: row.execution_status as ExecutionStatus,
  };
}

export function usePriorities() {
  const [priorities, setPriorities] = useState<FocusPriority[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPriorities = useCallback(async () => {
    const { data, error } = await supabase
      .from("priorities")
      .select("*")
      .order("rank", { ascending: true });

    if (error) {
      console.error("Failed to fetch priorities:", error);
      return;
    }
    setPriorities((data as DbPriority[]).map(toFocusPriority));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPriorities();
  }, [fetchPriorities]);

  const createPriority = useCallback(async (input: {
    startupId: string;
    startupName: string;
    tag: string;
    severity: PrioritySeverity;
    problem: string;
    why: string;
    impact: string;
    impactLevel: "High" | "Medium" | "Low";
    owner: string | null;
    mfoSuggestion: string;
    deadlineIn: string;
  }) => {
    const maxRank = priorities.length > 0 ? Math.max(...priorities.map(p => p.rank)) : 0;

    const { error } = await supabase.from("priorities").insert({
      startup_id: input.startupId,
      startup_name: input.startupName,
      tag: input.tag,
      severity: input.severity,
      problem: input.problem,
      why: input.why,
      impact: input.impact,
      impact_level: input.impactLevel,
      owner: input.owner || null,
      mfo_suggestion: input.mfoSuggestion,
      deadline_in: input.deadlineIn,
      rank: maxRank + 1,
      execution_status: "pending",
    });

    if (error) {
      toast.error("Failed to create priority");
      console.error(error);
      return;
    }
    toast.success("Priority created");
    await fetchPriorities();
  }, [priorities, fetchPriorities]);

  const updateStatus = useCallback(async (id: string, status: ExecutionStatus) => {
    const { error } = await supabase
      .from("priorities")
      .update({ execution_status: status })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }
    setPriorities(prev => prev.map(p => p.id === id ? { ...p, executionStatus: status } : p));
  }, []);

  return { priorities, loading, createPriority, updateStatus, refetch: fetchPriorities };
}
