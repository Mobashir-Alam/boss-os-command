import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Person {
  id: string;
  full_name: string;
  role: string;
  department: string;
  linked_startups: string[];
  reporting_manager_id: string | null;
  employment_type: string;
  salary: number;
  cost_to_company: number;
  joining_date: string | null;
  status: string;
  kpi_score: number;
  productivity_score: number;
  weekly_output_score: number;
  hours_committed: number;
  hours_delivered: number;
  tasks_assigned: number;
  tasks_completed: number;
  created_at: string;
  updated_at: string;
}

export function usePeople() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data as unknown as Person[];
    },
  });

  const addPerson = useMutation({
    mutationFn: async (p: Partial<Person>) => {
      const { error } = await supabase.from("people").insert({
        full_name: p.full_name!,
        role: p.role || "team_member",
        department: p.department || "",
        linked_startups: p.linked_startups || [],
        reporting_manager_id: p.reporting_manager_id || null,
        employment_type: p.employment_type || "full_time",
        salary: p.salary || 0,
        cost_to_company: p.cost_to_company || 0,
        joining_date: p.joining_date || null,
        status: p.status || "active",
        kpi_score: p.kpi_score || 0,
        productivity_score: p.productivity_score || 0,
        weekly_output_score: p.weekly_output_score || 0,
        hours_committed: p.hours_committed || 0,
        hours_delivered: p.hours_delivered || 0,
        tasks_assigned: p.tasks_assigned || 0,
        tasks_completed: p.tasks_completed || 0,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });

  const updatePerson = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Person> & { id: string }) => {
      const { error } = await (supabase.from("people") as any).update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });

  const deletePerson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("people") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });

  return { people, isLoading, addPerson, updatePerson, deletePerson };
}
