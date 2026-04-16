import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── KAI Memories ───
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
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("kai_memories").insert({
        startup_id: startupId,
        memory: input.memory,
        category: input.category,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Memory saved"); },
    onError: () => toast.error("Failed to save memory"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kai_memories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Memory removed"); },
    onError: () => toast.error("Failed to remove memory"),
  });

  return { memories: query.data ?? [], loading: query.isLoading, add, remove };
}

// ─── Startup Notes ───
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
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("startup_notes").insert({
        startup_id: startupId,
        content,
        author_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Note added"); },
    onError: () => toast.error("Failed to add note"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("startup_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Note removed"); },
    onError: () => toast.error("Failed to remove note"),
  });

  return { notes: query.data ?? [], loading: query.isLoading, add, remove };
}

// ─── Milestones ───
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
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("startup_milestones").insert({
        startup_id: startupId,
        title: input.title,
        description: input.description || null,
        deadline: input.deadline || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Milestone added"); },
    onError: () => toast.error("Failed to add milestone"),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const next: Record<string, string> = { pending: "in-progress", "in-progress": "done", done: "pending" };
      const newStatus = next[status] || "pending";
      const { error } = await supabase.from("startup_milestones").update({ status: newStatus }).eq("id", id);
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Milestone removed"); },
    onError: () => toast.error("Failed to remove milestone"),
  });

  return { milestones: query.data ?? [], loading: query.isLoading, add, toggleStatus, remove };
}

// ─── Contacts ───
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
      const { data: { user } } = await supabase.auth.getUser();
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Contact added"); },
    onError: () => toast.error("Failed to add contact"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("startup_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Contact removed"); },
    onError: () => toast.error("Failed to remove contact"),
  });

  return { contacts: query.data ?? [], loading: query.isLoading, add, remove };
}

// ─── Startup Documents ───
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
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!startupId,
  });

  const upload = useMutation({
    mutationFn: async (input: { file: File; docType: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const path = `${startupId}/${Date.now()}-${input.file.name}`;
      const { error: uploadError } = await supabase.storage.from("startup-documents").upload(path, input.file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("startup-documents").getPublicUrl(path);

      const { error } = await supabase.from("startup_documents").insert({
        startup_id: startupId,
        file_name: input.file.name,
        file_url: urlData.publicUrl,
        doc_type: input.docType,
        uploaded_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Document uploaded"); },
    onError: () => toast.error("Failed to upload document"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("startup_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Document removed"); },
    onError: () => toast.error("Failed to remove document"),
  });

  return { documents: query.data ?? [], loading: query.isLoading, upload, remove };
}

// ─── People (startup_assignments + profiles) ───
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

      const userIds = assignments.map((a) => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role")
        .in("id", userIds);

      return assignments.map((a) => ({
        ...a,
        profile: profiles?.find((p) => p.id === a.user_id) || null,
      }));
    },
    enabled: !!startupId,
  });

  const assign = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("startup_assignments").insert({
        startup_id: startupId,
        user_id: userId,
        assigned_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Person assigned"); },
    onError: () => toast.error("Failed to assign person"),
  });

  const unassign = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("startup_assignments").delete().eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Person removed"); },
    onError: () => toast.error("Failed to remove person"),
  });

  return { people: query.data ?? [], loading: query.isLoading, assign, unassign };
}
