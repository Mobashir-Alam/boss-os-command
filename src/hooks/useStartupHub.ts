import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type StartupDocumentRow = Tables<"startup_documents">;
type StartupDepartmentRow = Tables<"startup_departments">;
type DepartmentUpdateRow = Tables<"department_updates">;
type PersonSummary = Pick<Tables<"people">, "id" | "full_name" | "department" | "role">;

export type DocumentCategory =
  | "finance"
  | "legal"
  | "company_record"
  | "operations"
  | "hr"
  | "compliance";

export const startupDepartmentCatalog = [
  { key: "social_media", name: "Social Media" },
  { key: "video_production_editing", name: "Video Production / Editing" },
  { key: "content_management", name: "Content Management" },
  { key: "studio", name: "Studio Dept." },
  { key: "tech", name: "Tech" },
  { key: "creators_brands_outreach", name: "Creators / Brands Outreach" },
  { key: "hr", name: "HR" },
  { key: "graphic_designing", name: "Graphic Designing" },
  { key: "office_management", name: "Office Management" },
] as const;

export type StartupDepartmentKey = (typeof startupDepartmentCatalog)[number]["key"];

const legacyDocTypeToCategory = (docType?: string | null): DocumentCategory => {
  switch (docType) {
    case "financials":
      return "finance";
    case "legal":
      return "legal";
    case "pitch-deck":
      return "company_record";
    default:
      return "operations";
  }
};

const categoryToLegacyDocType = (category: DocumentCategory): string => {
  switch (category) {
    case "finance":
      return "financials";
    case "legal":
      return "legal";
    case "company_record":
      return "pitch-deck";
    default:
      return "other";
  }
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

export function useKaiMemories(startupId: string) {
  const qc = useQueryClient();
  const key = ["kai_memories", startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kai_memories")
        .select("*")
        .eq("startup_id", startupId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!startupId,
  });

  const add = useMutation({
    mutationFn: async (input: { memory: string; category: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("kai_memories").insert({
        startup_id: startupId,
        memory: input.memory,
        category: input.category,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Memory saved");
    },
    onError: () => toast.error("Failed to save memory"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kai_memories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Memory removed");
    },
    onError: () => toast.error("Failed to remove memory"),
  });

  return { memories: query.data ?? [], loading: query.isLoading, add, remove };
}

export function useStartupNotes(startupId: string) {
  const qc = useQueryClient();
  const key = ["startup_notes", startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startup_notes")
        .select("*")
        .eq("startup_id", startupId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!startupId,
  });

  const add = useMutation({
    mutationFn: async (content: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("startup_notes").insert({
        startup_id: startupId,
        content,
        author_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Note added");
    },
    onError: () => toast.error("Failed to add note"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("startup_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Note removed");
    },
    onError: () => toast.error("Failed to remove note"),
  });

  return { notes: query.data ?? [], loading: query.isLoading, add, remove };
}

export function useStartupMilestones(startupId: string) {
  const qc = useQueryClient();
  const key = ["startup_milestones", startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startup_milestones")
        .select("*")
        .eq("startup_id", startupId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!startupId,
  });

  const add = useMutation({
    mutationFn: async (input: { title: string; description?: string; deadline?: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("startup_milestones").insert({
        startup_id: startupId,
        title: input.title,
        description: input.description || null,
        deadline: input.deadline || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Milestone added");
    },
    onError: () => toast.error("Failed to add milestone"),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const next: Record<string, string> = {
        pending: "in-progress",
        "in-progress": "done",
        done: "pending",
      };
      const newStatus = next[status] || "pending";
      const { error } = await supabase
        .from("startup_milestones")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: () => toast.error("Failed to update milestone"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("startup_milestones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Milestone removed");
    },
    onError: () => toast.error("Failed to remove milestone"),
  });

  return { milestones: query.data ?? [], loading: query.isLoading, add, toggleStatus, remove };
}

export function useStartupContacts(startupId: string) {
  const qc = useQueryClient();
  const key = ["startup_contacts", startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startup_contacts")
        .select("*")
        .eq("startup_id", startupId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!startupId,
  });

  const add = useMutation({
    mutationFn: async (input: { name: string; role: string; email?: string; phone?: string; notes?: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("startup_contacts").insert({
        startup_id: startupId,
        name: input.name,
        role: input.role,
        email: input.email || null,
        phone: input.phone || null,
        notes: input.notes || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Contact added");
    },
    onError: () => toast.error("Failed to add contact"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("startup_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Contact removed");
    },
    onError: () => toast.error("Failed to remove contact"),
  });

  return { contacts: query.data ?? [], loading: query.isLoading, add, remove };
}

export type StartupDocument = StartupDocumentRow & {
  access_url: string;
  resolved_category: DocumentCategory;
};

export function useStartupDocuments(startupId: string) {
  const qc = useQueryClient();
  const key = ["startup_documents", startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startup_documents")
        .select("*")
        .eq("startup_id", startupId)
        .order("document_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;

      const documents = (data ?? []) as StartupDocumentRow[];

      return Promise.all(
        documents.map(async (document) => {
          let accessUrl = document.file_url;

          if (document.storage_path) {
            const { data: signedData, error: signedError } = await supabase.storage
              .from("startup-documents")
              .createSignedUrl(document.storage_path, 60 * 60);

            if (!signedError && signedData?.signedUrl) {
              accessUrl = signedData.signedUrl;
            }
          }

          return {
            ...document,
            access_url: accessUrl,
            resolved_category:
              (document.category as DocumentCategory | null) ?? legacyDocTypeToCategory(document.doc_type),
          } satisfies StartupDocument;
        })
      );
    },
    enabled: !!startupId,
  });

  const upload = useMutation({
    mutationFn: async (input: {
      file: File;
      category?: DocumentCategory;
      docType?: string;
      title?: string;
      subcategory?: string | null;
      department?: string | null;
      notes?: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const category = input.category ?? legacyDocTypeToCategory(input.docType);
      const legacyDocType = input.docType ?? categoryToLegacyDocType(category);
      const sanitizedFileName = input.file.name.replace(/\s+/g, "-");
      const path = `${startupId}/${category}/${Date.now()}-${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("startup-documents")
        .upload(path, input.file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("startup-documents").getPublicUrl(path);

      const { error } = await supabase.from("startup_documents").insert([{
        startup_id: startupId,
        file_name: input.file.name,
        file_url: urlData.publicUrl,
        storage_path: path,
        title: input.title ?? input.file.name,
        doc_type: legacyDocType,
        category,
        department: input.department ?? null,
        document_date: new Date().toISOString().slice(0, 10),
        mime_type: input.file.type || null,
        size_bytes: input.file.size,
        uploaded_by: user?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Document uploaded");
    },
    onError: () => toast.error("Failed to upload document"),
  });

  const remove = useMutation({
    mutationFn: async (input: string | Pick<StartupDocumentRow, "id" | "storage_path">) => {
      const id = typeof input === "string" ? input : input.id;
      const storagePath = typeof input === "string" ? null : input.storage_path;

      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from("startup-documents")
          .remove([storagePath]);
        if (storageError) throw storageError;
      }

      const { error } = await supabase.from("startup_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Document removed");
    },
    onError: () => toast.error("Failed to remove document"),
  });

  return { documents: query.data ?? [], loading: query.isLoading, upload, remove };
}

export type StartupDepartment = StartupDepartmentRow & {
  lead: PersonSummary | null;
};

export function useStartupDepartments(startupId: string) {
  const qc = useQueryClient();
  const key = ["startup_departments", startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startup_departments")
        .select("*")
        .eq("startup_id", startupId)
        .order("name", { ascending: true });

      if (error) throw error;

      const departments = (data ?? []) as StartupDepartmentRow[];
      const leadIds = departments
        .map((department) => department.lead_person_id)
        .filter((id): id is string => !!id);

      let leads: PersonSummary[] = [];
      if (leadIds.length > 0) {
        const { data: leadRows, error: leadError } = await supabase
          .from("people")
          .select("id, full_name, department, role")
          .in("id", leadIds);

        if (leadError) throw leadError;
        leads = (leadRows ?? []) as PersonSummary[];
      }

      return departments.map((department) => ({
        ...department,
        lead: leads.find((lead) => lead.id === department.lead_person_id) ?? null,
      })) satisfies StartupDepartment[];
    },
    enabled: !!startupId,
  });

  const upsert = useMutation({
    mutationFn: async (
      input: Partial<StartupDepartmentRow> &
      Pick<StartupDepartmentRow, "startup_id" | "department_key" | "name">
    ) => {
      if (input.id) {
        const { error } = await supabase.from("startup_departments").update(input).eq("id", input.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("startup_departments").insert([input]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Department saved");
    },
    onError: () => toast.error("Failed to save department"),
  });

  return {
    departments: query.data ?? [],
    loading: query.isLoading,
    upsert,
  };
}

export type DepartmentUpdate = DepartmentUpdateRow & {
  owner: PersonSummary | null;
  wins_list: string[];
  blockers_list: string[];
  risks_list: string[];
  asks_list: string[];
};

export function useDepartmentUpdates(startupId: string, departmentKey?: string) {
  const qc = useQueryClient();
  const key = ["department_updates", startupId, departmentKey ?? "all"];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      let builder = supabase
        .from("department_updates")
        .select("*")
        .eq("startup_id", startupId)
        .order("update_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (departmentKey) {
        builder = builder.eq("department_key", departmentKey);
      }

      const { data, error } = await builder;
      if (error) throw error;

      const updates = (data ?? []) as DepartmentUpdateRow[];
      const ownerIds = updates
        .map((update) => update.owner_person_id)
        .filter((id): id is string => !!id);

      let owners: PersonSummary[] = [];
      if (ownerIds.length > 0) {
        const { data: ownerRows, error: ownerError } = await supabase
          .from("people")
          .select("id, full_name, department, role")
          .in("id", ownerIds);

        if (ownerError) throw ownerError;
        owners = (ownerRows ?? []) as PersonSummary[];
      }

      return updates.map((update) => ({
        ...update,
        owner: owners.find((owner) => owner.id === update.owner_person_id) ?? null,
        wins_list: asStringArray(update.wins),
        blockers_list: asStringArray(update.blockers),
        risks_list: asStringArray(update.risks),
        asks_list: asStringArray(update.asks),
      })) satisfies DepartmentUpdate[];
    },
    enabled: !!startupId,
  });

  const add = useMutation({
    mutationFn: async (input: {
      departmentKey: string;
      summary: string;
      updateDate?: string;
      wins?: string[];
      blockers?: string[];
      risks?: string[];
      asks?: string[];
      ownerPersonId?: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("department_updates").insert([{
        startup_id: startupId,
        department_key: input.departmentKey,
        summary: input.summary,
        update_date: input.updateDate ?? new Date().toISOString().slice(0, 10),
        wins: input.wins ?? [],
        blockers: input.blockers ?? [],
        risks: input.risks ?? [],
        asks: input.asks ?? [],
        owner_person_id: input.ownerPersonId ?? null,
        created_by: user?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Department update added");
    },
    onError: () => toast.error("Failed to add department update"),
  });

  return {
    updates: query.data ?? [],
    loading: query.isLoading,
    add,
  };
}

export function useStartupPeople(startupId: string) {
  const qc = useQueryClient();
  const key = ["startup_people", startupId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from("startup_assignments")
        .select("*")
        .eq("startup_id", startupId);
      if (error) throw error;

      if (!assignments || assignments.length === 0) return [];

      const userIds = assignments.map((assignment) => assignment.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role")
        .in("id", userIds);

      return assignments.map((assignment) => ({
        ...assignment,
        profile: profiles?.find((profile) => profile.id === assignment.user_id) || null,
      }));
    },
    enabled: !!startupId,
  });

  const assign = useMutation({
    mutationFn: async (userId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("startup_assignments").insert({
        startup_id: startupId,
        user_id: userId,
        assigned_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Person assigned");
    },
    onError: () => toast.error("Failed to assign person"),
  });

  const unassign = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("startup_assignments").delete().eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Person removed");
    },
    onError: () => toast.error("Failed to remove person"),
  });

  return { people: query.data ?? [], loading: query.isLoading, assign, unassign };
}
