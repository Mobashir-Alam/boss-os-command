import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SearchKind = "project" | "task" | "bug" | "person" | "link" | "document" | "destination";

export interface SearchItem {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle?: string;
  // navigation hints
  projectId?: string;
  url?: string;
  storagePath?: string;
  path?: string; // route path
  email?: string;
}

const STATIC_DESTINATIONS: SearchItem[] = [
  { id: "dest-home",     kind: "destination", title: "Founder Command Center", path: "/" },
  { id: "dest-tech",     kind: "destination", title: "Tech Team",              path: "/team/tech" },
  { id: "dest-github",   kind: "destination", title: "Engineering — GitHub",   path: "/team/github" },
  { id: "dest-techdept", kind: "destination", title: "Tech Department",        path: "/department/tech" },
  { id: "dest-employee", kind: "destination", title: "My Work",                path: "/employee" },
  { id: "dest-people",   kind: "destination", title: "People OS",              path: "/people" },
  { id: "dest-finances", kind: "destination", title: "Finances",               path: "/finances" },
  { id: "dest-mfo",      kind: "destination", title: "MFO Panel",              path: "/mfo" },
  { id: "dest-decisions",kind: "destination", title: "Decision Log",           path: "/decisions" },
];

export function useGlobalSearch() {
  return useQuery({
    queryKey: ["global-search-index"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async (): Promise<SearchItem[]> => {
      const [projects, tasks, bugs, people, links, docs] = await Promise.all([
        supabase.from("projects").select("id,title,startup_id").limit(500),
        supabase.from("project_tasks").select("id,title,project_id").limit(1000),
        supabase.from("bugs").select("id,title,project_id,status").limit(500),
        supabase.from("profiles").select("id,full_name,email,role,department").limit(500),
        supabase.from("project_links").select("id,title,url,project_id").limit(500),
        supabase.from("project_documents").select("id,display_name,project_id,storage_path").limit(500),
      ]);

      const items: SearchItem[] = [...STATIC_DESTINATIONS];

      (projects.data ?? []).forEach((p: any) =>
        items.push({ id: p.id, kind: "project", title: p.title, projectId: p.id })
      );
      (tasks.data ?? []).forEach((t: any) =>
        items.push({ id: t.id, kind: "task", title: t.title, projectId: t.project_id })
      );
      (bugs.data ?? []).forEach((b: any) =>
        items.push({ id: b.id, kind: "bug", title: b.title, projectId: b.project_id, subtitle: b.status })
      );
      (people.data ?? []).forEach((p: any) =>
        items.push({
          id: p.id,
          kind: "person",
          title: p.full_name || p.email || "Unnamed",
          subtitle: [p.role, p.department].filter(Boolean).join(" · "),
          email: p.email,
        })
      );
      (links.data ?? []).forEach((l: any) =>
        items.push({ id: l.id, kind: "link", title: l.title, url: l.url, projectId: l.project_id })
      );
      (docs.data ?? []).forEach((d: any) =>
        items.push({
          id: d.id,
          kind: "document",
          title: d.display_name,
          projectId: d.project_id,
          storagePath: d.storage_path,
        })
      );
      return items;
    },
  });
}
