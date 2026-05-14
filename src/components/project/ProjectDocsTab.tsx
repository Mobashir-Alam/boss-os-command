import { useRef, useState } from "react";
import {
  useProjectDocuments,
  useUploadProjectDocument,
  useDeleteProjectDocument,
  getSignedDocUrl,
  type ProjectDocument,
} from "@/hooks/useProjectDocuments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload, Download, Trash2, FileText, Image as ImageIcon, FileSpreadsheet,
  File as FileIcon, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

function getFileIcon(mime: string | null) {
  if (!mime) return FileIcon;
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.includes("pdf") || mime.startsWith("text/")) return FileText;
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return FileSpreadsheet;
  return FileIcon;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

interface Props {
  projectId: string;
  canWrite: boolean;
}

export default function ProjectDocsTab({ projectId, canWrite }: Props) {
  const { data: docs = [], isLoading } = useProjectDocuments(projectId);
  const uploadDoc = useUploadProjectDocument();
  const deleteDoc = useDeleteProjectDocument();

  const [uploadOpen, setUploadOpen] = useState(false);

  const handleDownload = async (doc: ProjectDocument) => {
    const url = await getSignedDocUrl(doc.storage_path);
    if (!url) {
      toast.error("Couldn't generate download link");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDelete = (doc: ProjectDocument) => {
    if (!confirm(`Delete "${doc.display_name}"? This cannot be undone.`)) return;
    deleteDoc.mutate(
      { docId: doc.id, projectId, storagePath: doc.storage_path },
      {
        onSuccess: () => toast.success("Document deleted"),
        onError: (e: any) => toast.error(e.message ?? "Couldn't delete"),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Documents
        </h2>
        {canWrite && (
          <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5">
            <Upload className="h-3.5 w-3.5" /> Upload
          </Button>
        )}
      </div>

      {isLoading && <p className="text-xs text-muted-foreground italic">Loading…</p>}

      {!isLoading && docs.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-8 text-center">
          <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          {canWrite && (
            <p className="mt-1 text-xs text-muted-foreground/70">
              Specs, design assets, contracts, screenshots — anything the project needs.
            </p>
          )}
        </div>
      )}

      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map((doc) => {
            const Icon = getFileIcon(doc.mime_type);
            return (
              <div
                key={doc.id}
                className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 transition hover:border-border hover:bg-muted/20"
              >
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="block max-w-full truncate text-left text-sm font-medium hover:underline"
                  >
                    {doc.display_name}
                  </button>
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(doc.size_bytes)} ·{" "}
                    {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                  </p>
                  {doc.description && (
                    <p className="mt-0.5 text-xs italic text-muted-foreground">{doc.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  {canWrite && (
                    <button
                      onClick={() => handleDelete(doc)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={(file, description) =>
          uploadDoc.mutate(
            { projectId, file, description },
            {
              onSuccess: () => { toast.success("Uploaded"); setUploadOpen(false); },
              onError: (e: any) => toast.error(e.message ?? "Upload failed"),
            }
          )
        }
        isPending={uploadDoc.isPending}
      />
    </div>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  onUpload,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpload: (file: File, description?: string) => void;
  isPending: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");

  const reset = () => { setFile(null); setDescription(""); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">File</label>
            <Input
              ref={fileRef}
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1"
            />
            {file && (
              <p className="mt-1 text-xs text-muted-foreground">
                {file.name} — {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this document about?"
              className="mt-1 min-h-[50px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            disabled={!file || isPending}
            onClick={() => file && onUpload(file, description || undefined)}
          >
            {isPending ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Uploading…</> : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
