import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MarkdownView from "./MarkdownView";
import { useUpdateProjectReadme } from "@/hooks/useProjectReadme";
import { Edit3, Save, X, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: string;
  initialReadme: string | null;
  canEdit: boolean;
}

const PLACEHOLDER = `# Project README

Use this space for everything new contributors need to know.

## Setup

\`\`\`bash
npm install
npm run dev
\`\`\`

## Architecture
- Frontend: React + TypeScript
- Backend: Supabase
- Auth: …

## Who to talk to
- Tech Lead: …
- Designer: …

## Useful links
See the **Links** tab.`;

export default function ProjectReadmeTab({ projectId, initialReadme, canEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialReadme ?? "");
  const updateReadme = useUpdateProjectReadme();

  // Sync draft if the underlying readme changes (e.g. someone else saved while we were viewing)
  useEffect(() => {
    if (!editing) setDraft(initialReadme ?? "");
  }, [initialReadme, editing]);

  const handleSave = () => {
    updateReadme.mutate(
      { projectId, readme: draft.trim() ? draft : null },
      {
        onSuccess: () => {
          toast.success("Readme saved");
          setEditing(false);
        },
        onError: (e: any) => toast.error(e.message ?? "Couldn't save"),
      }
    );
  };

  const handleCancel = () => {
    setDraft(initialReadme ?? "");
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" /> Readme
        </h2>
        {canEdit && !editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1.5">
            <Edit3 className="h-3.5 w-3.5" />
            {initialReadme ? "Edit" : "Write Readme"}
          </Button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleCancel} className="gap-1">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateReadme.isPending} className="gap-1">
              <Save className="h-3.5 w-3.5" />
              {updateReadme.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={PLACEHOLDER}
            className="min-h-[400px] font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Supports basic markdown: <code className="rounded bg-muted px-1">#</code> headings,{" "}
            <code className="rounded bg-muted px-1">**bold**</code>,{" "}
            <code className="rounded bg-muted px-1">*italic*</code>,{" "}
            <code className="rounded bg-muted px-1">`code`</code>,{" "}
            <code className="rounded bg-muted px-1">- lists</code>,{" "}
            <code className="rounded bg-muted px-1">[links](url)</code>,{" "}
            <code className="rounded bg-muted px-1">```code blocks```</code>.
          </p>
        </div>
      ) : initialReadme ? (
        <div className="rounded-xl border border-border/40 bg-card p-5">
          <MarkdownView source={initialReadme} />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-10 text-center">
          <BookOpen className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No readme yet.</p>
          {canEdit ? (
            <p className="mt-1 text-xs text-muted-foreground/70">
              Click "Write Readme" above to add setup instructions, architecture notes, who-to-talk-to, anything.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground/70">
              The project lead hasn't written one yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
