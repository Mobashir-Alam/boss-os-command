import { useRef, useState } from "react";
import { Upload, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStakeholders, useEquityDocuments } from "@/hooks/useOwnership";

const DOC_TYPES = ["SHA", "SAFE", "Vesting Agreement", "Term Sheet", "Side Letter", "Other"];

export default function DocumentsTab({ startupId }: { startupId: string }) {
  const { data: stakeholders = [] } = useStakeholders(startupId);
  const { data: documents = [], upload, remove } = useEquityDocuments(startupId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedStakeholder, setSelectedStakeholder] = useState("");
  const [docType, setDocType] = useState("Other");

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedStakeholder) return;
    upload.mutate({ file, stakeholderId: selectedStakeholder, docType });
    if (fileRef.current) fileRef.current.value = "";
  }

  // Group documents by stakeholder
  const grouped = stakeholders.map((s) => ({
    stakeholder: s,
    docs: documents.filter((d) => d.stakeholder_id === s.id),
  })).filter((g) => g.docs.length > 0);

  return (
    <div className="space-y-6 mt-6">
      {/* Upload */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          {stakeholders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add stakeholders first before uploading documents.</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Stakeholder</p>
                <Select value={selectedStakeholder} onValueChange={setSelectedStakeholder}>
                  <SelectTrigger><SelectValue placeholder="Select stakeholder" /></SelectTrigger>
                  <SelectContent>
                    {stakeholders.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Doc Type</p>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.xlsx,.png,.jpg" />
                <Button size="sm" className="h-9 gap-1.5" onClick={() => fileRef.current?.click()} disabled={!selectedStakeholder || upload.isPending}>
                  <Upload className="h-3.5 w-3.5" /> {upload.isPending ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents by Stakeholder */}
      {grouped.map((g) => (
        <Card key={g.stakeholder.id} className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {g.stakeholder.name}
              <span className="text-xs text-muted-foreground ml-2">({g.stakeholder.role})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {g.docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline">{d.file_name}</a>
                      <p className="text-xs text-muted-foreground">{d.doc_type} · {new Date(d.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove.mutate(d.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {grouped.length === 0 && documents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No documents uploaded yet</p>
          <p className="text-xs mt-1">Upload SHAs, SAFEs, vesting agreements, and more.</p>
        </div>
      )}
    </div>
  );
}
