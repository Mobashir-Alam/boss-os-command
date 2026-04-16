import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStartupDocuments } from "@/hooks/useStartupHub";
import { FolderOpen, Upload, X, FileText, Loader2 } from "lucide-react";

const docTypeLabels: Record<string, string> = {
  "pitch-deck": "Pitch Deck",
  financials: "Financials",
  legal: "Legal",
  other: "Other",
};

export default function DocumentsTab({ startupId }: { startupId: string }) {
  const { documents, loading, upload, remove } = useStartupDocuments(startupId);
  const [docType, setDocType] = useState("other");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upload.mutate({ file, docType });
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Documents</h3>
        <div className="flex items-center gap-2">
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pitch-deck">Pitch Deck</SelectItem>
              <SelectItem value="financials">Financials</SelectItem>
              <SelectItem value="legal">Legal</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Upload
          </Button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          <FolderOpen className="h-5 w-5 mx-auto mb-2 opacity-40" />
          No documents uploaded
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((d) => (
            <div key={d.id} className="rounded-xl border border-border/50 bg-card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline truncate block">
                    {d.file_name}
                  </a>
                  <span className="text-[10px] text-muted-foreground">{docTypeLabels[d.doc_type] || d.doc_type}</span>
                </div>
              </div>
              <button onClick={() => remove.mutate(d.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
