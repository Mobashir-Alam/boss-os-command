import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const BUCKET = "project-documents";

export interface ProjectDocument {
  id: string;
  project_id: string;
  display_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useProjectDocuments(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-documents", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectDocument[]> => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectDocument[];
    },
  });
}

// Build a public-ish URL for previewing/downloading.
// Bucket is private — uses signed URLs that expire in 1 hour.
export async function getSignedDocUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60); // 1 hour
  if (error) {
    console.error("getSignedDocUrl error", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

export function useUploadProjectDocument() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      projectId,
      file,
      description,
    }: {
      projectId: string;
      file: File;
      description?: string;
    }) => {
      if (!user?.id) throw new Error("Not signed in");

      // Path format MUST start with <project_id>/ so the storage RLS can
      // extract the project_id via split_part(name, '/', 1).
      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const path = `${projectId}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { error: metaError } = await supabase.from("project_documents").insert({
        project_id: projectId,
        display_name: file.name,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
        description: description?.trim() || null,
        uploaded_by: user.id,
      } as any);
      if (metaError) {
        // Roll back the upload if the metadata write failed.
        await supabase.storage.from(BUCKET).remove([path]);
        throw metaError;
      }
      return projectId;
    },
    onSuccess: (pid) => qc.invalidateQueries({ queryKey: ["project-documents", pid] }),
  });
}

export function useDeleteProjectDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      docId,
      projectId,
      storagePath,
    }: {
      docId: string;
      projectId: string;
      storagePath: string;
    }) => {
      const { error: dbErr } = await supabase.from("project_documents").delete().eq("id", docId);
      if (dbErr) throw dbErr;
      // Best-effort remove storage object too (RLS will block if not allowed).
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return projectId;
    },
    onSuccess: (pid) => qc.invalidateQueries({ queryKey: ["project-documents", pid] }),
  });
}
