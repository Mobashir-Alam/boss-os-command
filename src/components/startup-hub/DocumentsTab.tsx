import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  type DocumentCategory,
  type StartupDocument,
  useStartupDocuments,
} from "@/hooks/useStartupHub";
import { FileText, FolderOpen, Loader2, Upload, X, Receipt, Scale, Building2, Briefcase, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const categoryMeta: Record<DocumentCategory, { label: string; description: string; icon: typeof FileText }> = {
  finance: { label: "Finance", description: "Bills, invoices, expenses", icon: Receipt },
  legal: { label: "Legal", description: "Contracts, agreements", icon: Scale },
  company_record: { label: "Company Records", description: "Incorporation, registrations", icon: Building2 },
  operations: { label: "Operations", description: "Internal docs, SOPs", icon: Briefcase },
  hr: { label: "HR", description: "Employment, payroll", icon: Users },
  compliance: { label: "Compliance", description: "Filings, audits, licences", icon: ShieldCheck },
};

const categoryOrder: DocumentCategory[] = ["finance", "legal", "company_record", "compliance", "hr", "operations"];

export default function DocumentsTab({ startupId }: { startupId: string }) {
  const { documents, loading, upload, remove } = useStartupDocuments(startupId);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>("operations");
  const [activeFilter, setActiveFilter] = useState<DocumentCategory | "all">("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const groupedCounts = useMemo(() => {
    return documents.reduce<Record<string, number>>((acc, document) => {
      const key = document.resolved_category;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [documents]);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return documents;
    return documents.filter((d) => d.resolved_category === activeFilter);
  }, [documents, activeFilter]);

  const recent = useMemo(() => documents.slice(0, 3), [documents]);

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upload.mutate({ file, category: selectedCategory, title: file.name });
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Editorial header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <span className="eyebrow">Document Repository</span>
          <h3 className="font-display text-2xl mt-1 leading-tight">Bills, invoices &amp; company records</h3>
          <p className="text-xs text-muted-foreground mt-1.5">
            {documents.length} {documents.length === 1 ? "file" : "files"} on record · stored privately, signed access on request
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as DocumentCategory)}>
            <SelectTrigger className="text-xs w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryOrder.map((value) => (
                <SelectItem key={value} value={value}>
                  {categoryMeta[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="gap-1.5 text-xs h-9 bg-primary"
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload to {categoryMeta[selectedCategory].label}
          </Button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-border border border-border">
        <button
          onClick={() => setActiveFilter("all")}
          className={cn(
            "bg-card p-4 text-left transition-colors hover:bg-paper",
            activeFilter === "all" && "bg-paper ring-1 ring-inset ring-accent"
          )}
        >
          <FolderOpen className="h-4 w-4 text-foreground/70 mb-2" />
          <p className="font-display text-base leading-tight">All</p>
          <p className="numeric text-2xl mt-1">{documents.length}</p>
        </button>
        {categoryOrder.map((key) => {
          const meta = categoryMeta[key];
          const Icon = meta.icon;
          const count = groupedCounts[key] ?? 0;
          const active = activeFilter === key;
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={cn(
                "bg-card p-4 text-left transition-colors hover:bg-paper",
                active && "bg-paper ring-1 ring-inset ring-accent"
              )}
            >
              <Icon className={cn("h-4 w-4 mb-2", count > 0 ? "text-accent" : "text-muted-foreground")} />
              <p className="font-display text-base leading-tight">{meta.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{meta.description}</p>
              <p className="numeric text-2xl mt-1">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Recent strip */}
      {recent.length > 0 && activeFilter === "all" && (
        <div>
          <span className="eyebrow mb-2 block">Recently Filed</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recent.map((doc) => (
              <a
                key={doc.id}
                href={doc.access_url}
                target="_blank"
                rel="noopener noreferrer"
                className="paper-card p-4 hover:border-accent transition-colors group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">
                    {categoryMeta[doc.resolved_category].label}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-sm font-medium line-clamp-2 group-hover:text-accent transition-colors">
                  {doc.title || doc.file_name}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* File list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="eyebrow">
            {activeFilter === "all" ? "All Documents" : categoryMeta[activeFilter].label}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {filtered.length} {filtered.length === 1 ? "ITEM" : "ITEMS"}
          </span>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Loading documents…</div>
        ) : filtered.length === 0 ? (
          <div className="paper-card p-10 text-center">
            <FolderOpen className="h-6 w-6 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No documents in this category yet.</p>
          </div>
        ) : (
          <div className="paper-card divide-y divide-border">
            {filtered.map((document) => (
              <DocumentRow
                key={document.id}
                document={document}
                onRemove={() => remove.mutate({ id: document.id, storage_path: document.storage_path ?? null })}
              />
            ))}
          </div>
        )}
      </div>
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
  const meta = categoryMeta[document.resolved_category];
  const Icon = meta.icon;
  const sizeKb = document.size_bytes ? Math.round(document.size_bytes / 1024) : null;

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-paper transition-colors">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <Icon className="h-4 w-4 text-accent shrink-0" />
        <div className="min-w-0 flex-1">
          <a
            href={document.access_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:text-accent transition-colors truncate block"
          >
            {document.title || document.file_name}
          </a>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            <span>{meta.label}</span>
            {document.department && <span className="capitalize">{document.department.replace(/_/g, " ")}</span>}
            <span>
              {new Date(document.document_date || document.created_at).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric",
              })}
            </span>
            {sizeKb !== null && <span>{sizeKb} KB</span>}
          </div>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1"
        aria-label="Remove document"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
