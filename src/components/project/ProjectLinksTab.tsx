import { useMemo, useState } from "react";
import {
  useProjectLinks,
  useCreateProjectLink,
  useUpdateProjectLink,
  useDeleteProjectLink,
  type LinkCategory,
  type ProjectLink,
} from "@/hooks/useProjectLinks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ExternalLink, Plus, Pin, PinOff, Trash2, Github, Figma, Server,
  FileText, Activity, Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: { value: LinkCategory; label: string; icon: typeof LinkIcon }[] = [
  { value: "repo",        label: "Repo",        icon: Github },
  { value: "design",      label: "Design",      icon: Figma },
  { value: "deployment",  label: "Deployment",  icon: Server },
  { value: "docs",        label: "Docs",        icon: FileText },
  { value: "monitoring",  label: "Monitoring",  icon: Activity },
  { value: "other",       label: "Other",       icon: LinkIcon },
];

function getIcon(cat: LinkCategory) {
  return CATEGORIES.find((c) => c.value === cat)?.icon ?? LinkIcon;
}

function getCategoryLabel(cat: LinkCategory) {
  return CATEGORIES.find((c) => c.value === cat)?.label ?? "Other";
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

interface Props {
  projectId: string;
  canWrite: boolean;
}

export default function ProjectLinksTab({ projectId, canWrite }: Props) {
  const { data: links = [], isLoading } = useProjectLinks(projectId);
  const createLink = useCreateProjectLink();
  const updateLink = useUpdateProjectLink();
  const deleteLink = useDeleteProjectLink();

  const [addOpen, setAddOpen] = useState(false);

  // Group by category, pinned first
  const groups = useMemo(() => {
    const pinned = links.filter((l) => l.is_pinned);
    const rest = links.filter((l) => !l.is_pinned);
    const byCat = new Map<LinkCategory, ProjectLink[]>();
    rest.forEach((l) => {
      const arr = byCat.get(l.category) ?? [];
      arr.push(l);
      byCat.set(l.category, arr);
    });
    return { pinned, byCat };
  }, [links]);

  const togglePin = (link: ProjectLink) => {
    updateLink.mutate(
      { linkId: link.id, projectId, patch: { is_pinned: !link.is_pinned } },
      { onError: (e: any) => toast.error(e.message ?? "Couldn't update") }
    );
  };

  const handleDelete = (link: ProjectLink) => {
    if (!confirm(`Delete "${link.title}"?`)) return;
    deleteLink.mutate(
      { linkId: link.id, projectId },
      { onSuccess: () => toast.success("Link removed"), onError: (e: any) => toast.error(e.message ?? "Couldn't delete") }
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Important Links
        </h2>
        {canWrite && (
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Link
          </Button>
        )}
      </div>

      {isLoading && <p className="text-xs text-muted-foreground italic">Loading…</p>}

      {!isLoading && links.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-8 text-center">
          <LinkIcon className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No links yet.</p>
          {canWrite && (
            <p className="mt-1 text-xs text-muted-foreground/70">
              Add the repo, Figma, deployment URLs, anything the team needs.
            </p>
          )}
        </div>
      )}

      {/* Pinned */}
      {groups.pinned.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-700/80">
            Pinned
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {groups.pinned.map((l) => (
              <LinkCard
                key={l.id}
                link={l}
                canWrite={canWrite}
                onTogglePin={togglePin}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grouped by category */}
      {CATEGORIES.map((cat) => {
        const items = groups.byCat.get(cat.value) ?? [];
        if (items.length === 0) return null;
        const Icon = cat.icon;
        return (
          <div key={cat.value}>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Icon className="h-3 w-3" />
              {cat.label}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {items.map((l) => (
                <LinkCard
                  key={l.id}
                  link={l}
                  canWrite={canWrite}
                  onTogglePin={togglePin}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        );
      })}

      <AddLinkDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={(payload) =>
          createLink.mutate(
            { project_id: projectId, ...payload },
            {
              onSuccess: () => { toast.success("Link added"); setAddOpen(false); },
              onError: (e: any) => toast.error(e.message ?? "Couldn't add"),
            }
          )
        }
        isPending={createLink.isPending}
      />
    </div>
  );
}

function LinkCard({
  link,
  canWrite,
  onTogglePin,
  onDelete,
}: {
  link: ProjectLink;
  canWrite: boolean;
  onTogglePin: (l: ProjectLink) => void;
  onDelete: (l: ProjectLink) => void;
}) {
  const Icon = getIcon(link.category);
  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border/50 bg-card p-3 transition hover:border-border hover:bg-muted/20">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-medium hover:underline"
        >
          {link.title}
        </a>
        <p className="text-[11px] text-muted-foreground truncate">{getDomain(link.url)}</p>
        {link.description && (
          <p className="mt-1 text-xs text-muted-foreground italic">{link.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Open link"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
        {canWrite && (
          <>
            <button
              onClick={() => onTogglePin(link)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={link.is_pinned ? "Unpin" : "Pin"}
            >
              {link.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
            </button>
            <button
              onClick={() => onDelete(link)}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Delete link"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AddLinkDialog({
  open,
  onOpenChange,
  onSave,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (payload: { title: string; url: string; category: LinkCategory; description: string | null }) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<LinkCategory>("other");
  const [description, setDescription] = useState("");

  const reset = () => {
    setTitle(""); setUrl(""); setCategory("other"); setDescription("");
  };

  const handleSubmit = () => {
    if (!title.trim() || !url.trim()) {
      toast.error("Title and URL are both required");
      return;
    }
    // Auto-prefix https:// if missing
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    onSave({
      title: title.trim(),
      url: normalizedUrl,
      category,
      description: description.trim() || null,
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Link</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Staging Deployment" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="mt-1 font-mono text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as LinkCategory)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description (optional)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this for?" className="mt-1 min-h-[50px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : "Add Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
