import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DirectoryEmployee {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  department: string | null;
}

// All profiles. HR uses this as the company directory.
// We pull from `profiles` (auth users) — these are the people who can log
// in. The `people` table has more HR-style metadata but isn't 1:1 with
// auth users yet.
export function useEmployeeDirectory() {
  return useQuery({
    queryKey: ["employee-directory"],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<DirectoryEmployee[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role, department")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[])
        .filter((p) => p.full_name || p.email)
        .map((p) => ({
          id: p.id,
          full_name: p.full_name ?? p.email ?? "Unknown",
          email: p.email ?? null,
          avatar_url: p.avatar_url ?? null,
          role: p.role ?? null,
          department: p.department ?? null,
        }));
    },
  });
}
