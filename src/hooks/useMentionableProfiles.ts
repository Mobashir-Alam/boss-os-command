import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MentionableProfile {
  id: string;
  full_name: string;
  email: string | null;
  role: string | null;
  department: string | null;
}

// All profiles a user could @-mention. Open list for now — anyone in the
// org. Used by the autocomplete dropdown and for resolving @Name → profile_id
// at submit time.
export function useMentionableProfiles() {
  return useQuery({
    queryKey: ["mentionable-profiles"],
    queryFn: async (): Promise<MentionableProfile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, department")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[])
        .filter((p) => p.full_name)
        .map((p) => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email ?? null,
          role: p.role ?? null,
          department: p.department ?? null,
        }));
    },
    staleTime: 5 * 60 * 1000, // names rarely change — 5 min cache
  });
}

// Parse a body of text and return the profile_ids of @mentions that match
// known full names. Match is case-insensitive, longest-match-wins.
export function resolveMentions(text: string, profiles: MentionableProfile[]): string[] {
  if (!text) return [];
  const matched = new Set<string>();
  const sorted = [...profiles].sort((a, b) => b.full_name.length - a.full_name.length);

  // Find every @ followed by a name. Try the longest profile names first so
  // "@Vikram Singh" wins over "@Vikram" if both existed.
  const lowerText = text.toLowerCase();
  for (const p of sorted) {
    const needle = "@" + p.full_name.toLowerCase();
    let from = 0;
    while (true) {
      const idx = lowerText.indexOf(needle, from);
      if (idx === -1) break;
      // Boundary check — must be preceded by start/whitespace, followed by non-word
      const prevOk = idx === 0 || /\s/.test(text[idx - 1]);
      const after = text[idx + needle.length] ?? "";
      const nextOk = after === "" || /[\s.,!?:;)]/.test(after);
      if (prevOk && nextOk) matched.add(p.id);
      from = idx + needle.length;
    }
  }
  return Array.from(matched);
}
