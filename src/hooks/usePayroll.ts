import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PayrollStatus = "draft" | "finalised" | "paid";

export interface PayrollPaymentRow {
  id: string;
  profile_id: string;
  month_year: string; // YYYY-MM
  base_salary: number;
  deductions: number;
  bonus: number;
  net_pay: number; // generated column
  status: PayrollStatus;
  paid_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function currentMonthYear(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function useMonthlyPayroll(monthYear: string) {
  return useQuery({
    queryKey: ["payroll", monthYear],
    queryFn: async (): Promise<PayrollPaymentRow[]> => {
      const { data, error } = await supabase
        .from("payroll_payments")
        .select("*")
        .eq("month_year", monthYear)
        .order("base_salary", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PayrollPaymentRow[];
    },
  });
}

// Generate this month's entries from people.salary for everyone who doesn't
// have a row yet. Idempotent — re-running it won't overwrite or duplicate.
export function useGenerateMonthlyPayroll() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (monthYear: string) => {
      if (!user?.id) throw new Error("Not signed in");

      // Pull everyone who has a profile (a real auth user) and a salary in `people`.
      // We join people→profiles by id (people.id is the auth UUID for our seeded set).
      const { data: peopleRows, error: peopleErr } = await supabase
        .from("people")
        .select("id, salary, status")
        .eq("status", "active");
      if (peopleErr) throw peopleErr;

      const candidates = (peopleRows ?? []).filter((p: any) => p.id && (p.salary ?? 0) > 0);
      if (candidates.length === 0) return { created: 0, skipped: 0 };

      // Skip people who already have a row for this month
      const { data: existing } = await supabase
        .from("payroll_payments")
        .select("profile_id")
        .eq("month_year", monthYear);
      const existingIds = new Set((existing ?? []).map((r: any) => r.profile_id));
      const toCreate = candidates.filter((c: any) => !existingIds.has(c.id));

      if (toCreate.length === 0) return { created: 0, skipped: candidates.length };

      const rows = toCreate.map((c: any) => ({
        profile_id: c.id,
        month_year: monthYear,
        base_salary: Number(c.salary) || 0,
        deductions: 0,
        bonus: 0,
        status: "draft" as PayrollStatus,
        created_by: user.id,
      }));
      const { error: insertErr } = await supabase.from("payroll_payments").insert(rows as any);
      if (insertErr) throw insertErr;

      return { created: toCreate.length, skipped: existingIds.size };
    },
    onSuccess: (_d, monthYear) => {
      qc.invalidateQueries({ queryKey: ["payroll", monthYear] });
    },
  });
}

export function useUpdatePayrollEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      monthYear,
      patch,
    }: {
      id: string;
      monthYear: string;
      patch: Partial<Pick<PayrollPaymentRow, "base_salary" | "deductions" | "bonus" | "notes" | "status">>;
    }) => {
      const { error } = await supabase
        .from("payroll_payments")
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
      return monthYear;
    },
    onSuccess: (monthYear) => {
      qc.invalidateQueries({ queryKey: ["payroll", monthYear] });
    },
  });
}

export function useMarkPayrollPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      monthYear,
      paid,
    }: {
      id: string;
      monthYear: string;
      paid: boolean;
    }) => {
      const { error } = await supabase
        .from("payroll_payments")
        .update({
          status: paid ? "paid" : "finalised",
          paid_at: paid ? new Date().toISOString() : null,
        } as any)
        .eq("id", id);
      if (error) throw error;
      return monthYear;
    },
    onSuccess: (monthYear) => {
      qc.invalidateQueries({ queryKey: ["payroll", monthYear] });
    },
  });
}
