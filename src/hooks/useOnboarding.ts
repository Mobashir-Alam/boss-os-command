import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type OnboardingCategory = "paperwork" | "it_setup" | "training" | "introductions" | "equipment" | "other";
export type OnboardingStatus = "pending" | "done" | "skipped";

export interface OnboardingItem {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  category: OnboardingCategory;
  assigned_to: string | null;
  due_date: string | null;
  status: OnboardingStatus;
  done_at: string | null;
  done_by: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Default checklist used by "Apply default template" — covers the
// essentials any new hire needs regardless of role.
export const DEFAULT_ONBOARDING_TEMPLATE: Array<Pick<OnboardingItem, "title" | "description" | "category">> = [
  { title: "Signed offer letter received", description: null, category: "paperwork" },
  { title: "ID + tax documents collected", description: "PAN, Aadhaar, bank details", category: "paperwork" },
  { title: "Workstation / laptop assigned", description: null, category: "equipment" },
  { title: "Email + Slack accounts created", description: null, category: "it_setup" },
  { title: "Access to required tools granted", description: "GitHub, Figma, Drive, etc. as needed", category: "it_setup" },
  { title: "Buddy / mentor introduced", description: null, category: "introductions" },
  { title: "Welcome meeting with department head", description: null, category: "introductions" },
  { title: "Read product / company handbook", description: null, category: "training" },
];

export function useOnboardingForProfile(profileId: string | undefined) {
  return useQuery({
    queryKey: ["onboarding", profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<OnboardingItem[]> => {
      const { data, error } = await supabase
        .from("onboarding_items")
        .select("*")
        .eq("profile_id", profileId!)
        .order("status", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OnboardingItem[];
    },
  });
}

// All in-flight onboarding across the company (HR view)
export function useAllPendingOnboarding() {
  return useQuery({
    queryKey: ["onboarding", "all-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_items")
        .select("*")
        .neq("status", "done")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as OnboardingItem[];
    },
  });
}

export function useAddOnboardingItem() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      profileId: string;
      title: string;
      description?: string;
      category?: OnboardingCategory;
      assignedTo?: string | null;
      dueDate?: string | null;
    }) => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await supabase.from("onboarding_items").insert({
        profile_id: input.profileId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        category: input.category ?? "other",
        assigned_to: input.assignedTo ?? null,
        due_date: input.dueDate ?? null,
        created_by: user.id,
      } as any);
      if (error) throw error;
      return input.profileId;
    },
    onSuccess: (profileId) => {
      qc.invalidateQueries({ queryKey: ["onboarding", profileId] });
      qc.invalidateQueries({ queryKey: ["onboarding", "all-pending"] });
    },
  });
}

export function useApplyDefaultOnboarding() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (profileId: string) => {
      if (!user?.id) throw new Error("Not signed in");
      const rows = DEFAULT_ONBOARDING_TEMPLATE.map((t) => ({
        profile_id: profileId,
        title: t.title,
        description: t.description,
        category: t.category,
        created_by: user.id,
      }));
      const { error } = await supabase.from("onboarding_items").insert(rows as any);
      if (error) throw error;
      return profileId;
    },
    onSuccess: (profileId) => {
      qc.invalidateQueries({ queryKey: ["onboarding", profileId] });
      qc.invalidateQueries({ queryKey: ["onboarding", "all-pending"] });
    },
  });
}

export function useUpdateOnboardingItem() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      id,
      profileId,
      patch,
    }: {
      id: string;
      profileId: string;
      patch: Partial<Pick<OnboardingItem, "status" | "notes" | "due_date" | "assigned_to" | "title" | "description" | "category">>;
    }) => {
      const enriched: any = { ...patch };
      if (patch.status === "done") {
        enriched.done_at = new Date().toISOString();
        enriched.done_by = user?.id ?? null;
      } else if (patch.status === "pending" || patch.status === "skipped") {
        enriched.done_at = null;
        enriched.done_by = null;
      }
      const { error } = await supabase.from("onboarding_items").update(enriched).eq("id", id);
      if (error) throw error;
      return profileId;
    },
    onSuccess: (profileId) => {
      qc.invalidateQueries({ queryKey: ["onboarding", profileId] });
      qc.invalidateQueries({ queryKey: ["onboarding", "all-pending"] });
    },
  });
}

export function useDeleteOnboardingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, profileId }: { id: string; profileId: string }) => {
      const { error } = await supabase.from("onboarding_items").delete().eq("id", id);
      if (error) throw error;
      return profileId;
    },
    onSuccess: (profileId) => {
      qc.invalidateQueries({ queryKey: ["onboarding", profileId] });
      qc.invalidateQueries({ queryKey: ["onboarding", "all-pending"] });
    },
  });
}
