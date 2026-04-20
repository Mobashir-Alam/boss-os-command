import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  type DocumentCategory,
  type StartupDocument,
  useStartupDocuments,
} from "@/hooks/useStartupHub";
import { Badge } from "@/components/ui/badge";
import { FileText, FolderOpen, Loader2, Upload, X } from "lucide-react";

const categoryLabels: Record<DocumentCategory, string> = {
  finance: "Finance",
  legal: "Legal",
  company_record: "Company Record",
  operations: "Operations",
  hr: "HR",
  compliance: "Compliance",
};

export default function DocumentsTab({ startupId }: { startupId: string }) {
  const { documents, loading, upload, remove } = useStartupDocuments(startupId);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>("operations");
  const fileRef = useRef<HTMLInputElement>(null);

  const groupedCounts = useMemo(() => {
    return documents.reduce<Record<string, number>>((acc, document) => {
      const key = document.resolved_category;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [documents]);

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    upload.mutate({
      file,
      category: selectedCategory,
      title: file.name,
    });

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Documents</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Bills, invoices, agreements, and company files for this startup.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as DocumentCategory)}>
            <SelectTrigger className="text-xs w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Upload
          </Button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {documents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryLabels).map(([key, label]) => {
            const count = groupedCounts[key] ?? 0;
            return (
              <Badge key={key} variant="outline" className="text-[10px]">
                {label}: {count}
              </Badge>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          <FolderOpen className="h-5 w-5 mx-auto mb-2 opacity-40" />
          No documents uploaded
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              onRemove={() => remove.mutate({ id: document.id, storage_path: document.storage_path })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentRow({
  document,
  onRemove,
}: {
  document: StartupDocument;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <a
            href={document.access_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline truncate block"
          >
            {document.title || document.file_name}
          </a>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {categoryLabels[document.resolved_category]}
            </span>
            {document.department && (
              <span className="text-[10px] text-muted-foreground capitalize">
                {document.department.replace(/_/g, " ")}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {new Date(document.document_date || document.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
