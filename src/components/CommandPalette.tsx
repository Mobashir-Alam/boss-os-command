import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useGlobalSearch, type SearchItem, type SearchKind } from "@/hooks/useGlobalSearch";
import { supabase } from "@/integrations/supabase/client";
import {
  Folder,
  ListTodo,
  Bug,
  User,
  Link as LinkIcon,
  FileText,
  Compass,
} from "lucide-react";

const KIND_LABEL: Record<SearchKind, string> = {
  project: "Projects",
  task: "Tasks",
  bug: "Bugs",
  person: "People",
  link: "Links",
  document: "Documents",
  destination: "Go to",
};

const KIND_ORDER: SearchKind[] = ["destination", "project", "task", "bug", "person", "link", "document"];

const ICONS: Record<SearchKind, React.ComponentType<{ className?: string }>> = {
  project: Folder,
  task: ListTodo,
  bug: Bug,
  person: User,
  link: LinkIcon,
  document: FileText,
  destination: Compass,
};

const ICON_COLORS: Record<SearchKind, string> = {
  project: "text-blue-500",
  task: "text-blue-500",
  bug: "text-amber-500",
  person: "text-emerald-500",
  link: "text-purple-500",
  document: "text-slate-500",
  destination: "text-muted-foreground",
};

function fuzzyMatch(text: string, q: string): boolean {
  if (!q) return true;
  return text.toLowerCase().includes(q.toLowerCase());
}

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data: items = [] } = useGlobalSearch();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const grouped = useMemo(() => {
    const filtered = items.filter(
      (i) => fuzzyMatch(i.title, query) || (i.subtitle && fuzzyMatch(i.subtitle, query)) || (i.email && fuzzyMatch(i.email, query))
    );
    const map = new Map<SearchKind, SearchItem[]>();
    for (const k of KIND_ORDER) map.set(k, []);
    for (const it of filtered) map.get(it.kind)!.push(it);
    // Cap each group at 8 results to keep palette tidy
    for (const k of KIND_ORDER) map.set(k, map.get(k)!.slice(0, 8));
    return map;
  }, [items, query]);

  const handleSelect = async (item: SearchItem) => {
    setOpen(false);
    switch (item.kind) {
      case "destination":
        if (item.path) navigate(item.path);
        break;
      case "project":
        if (item.projectId) navigate(`/project/${item.projectId}`);
        break;
      case "task":
        if (item.projectId) navigate(`/project/${item.projectId}#task-${item.id}`);
        break;
      case "bug":
        if (item.projectId) navigate(`/project/${item.projectId}?tab=bugs`);
        else navigate(`/team/tech?tab=bugs`);
        break;
      case "person":
        navigate(`/profile/${item.id}`);
        break;
      case "link":
        if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
        break;
      case "document":
        if (item.storagePath) {
          const { data } = await supabase.storage
            .from("project-documents")
            .createSignedUrl(item.storagePath, 60 * 60);
          if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
        }
        break;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search projects, tasks, bugs, people…  (⌘K)" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {KIND_ORDER.map((kind, idx) => {
          const list = grouped.get(kind) ?? [];
          if (!list.length) return null;
          const Icon = ICONS[kind];
          return (
            <div key={kind}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={KIND_LABEL[kind]}>
                {list.map((item) => (
                  <CommandItem
                    key={`${kind}-${item.id}`}
                    value={`${item.title} ${item.subtitle ?? ""} ${item.email ?? ""} ${kind}`}
                    onSelect={() => handleSelect(item)}
                  >
                    <Icon className={`mr-2 h-4 w-4 ${ICON_COLORS[kind]}`} />
                    <span className="truncate">{item.title}</span>
                    {item.subtitle && (
                      <span className="ml-2 text-xs text-muted-foreground truncate">{item.subtitle}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
