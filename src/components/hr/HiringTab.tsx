import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Briefcase, Plus, Loader2, ChevronRight, Star, Mail, Phone, ExternalLink,
  Users as UsersIcon, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useJobPostings, useCreateJobPosting, useUpdateJobStatus,
  useCandidatesForJob, useAddCandidate, useUpdateCandidate,
  type JobPosting, type JobStatus, type Candidate, type CandidateStage,
} from "@/hooks/useHiring";

const JOB_STATUS_CHIP: Record<JobStatus, string> = {
  open:    "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  closed:  "bg-muted text-muted-foreground border-border",
  on_hold: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  filled:  "bg-blue-500/15 text-blue-700 border-blue-500/30",
};

const STAGE_ORDER: CandidateStage[] = ["applied", "screening", "interview_1", "interview_2", "offer", "hired", "rejected"];

const STAGE_LABEL: Record<CandidateStage, string> = {
  applied: "Applied",
  screening: "Screening",
  interview_1: "Interview 1",
  interview_2: "Interview 2",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

const STAGE_CHIP: Record<CandidateStage, string> = {
  applied:     "bg-muted text-muted-foreground border-border",
  screening:   "bg-blue-500/15 text-blue-700 border-blue-500/30",
  interview_1: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  interview_2: "bg-violet-500/25 text-violet-700 border-violet-500/40",
  offer:       "bg-amber-500/15 text-amber-700 border-amber-500/30",
  hired:       "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  rejected:    "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

export default function HiringTab() {
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

  if (selectedJob) {
    return <JobView job={selectedJob} onBack={() => setSelectedJob(null)} />;
  }
  return <JobsList onPickJob={setSelectedJob} />;
}

function JobsList({ onPickJob }: { onPickJob: (j: JobPosting) => void }) {
  const { data: jobs = [], isLoading } = useJobPostings();
  const updateStatus = useUpdateJobStatus();
  const [createOpen, setCreateOpen] = useState(false);

  const handleStatusChange = (id: string, status: JobStatus) => {
    updateStatus.mutate({ id, status }, { onError: (e: any) => toast.error(e?.message ?? "Couldn't update") });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Hiring pipeline
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Track open roles and candidates through each stage. Click a job to see its pipeline.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Post a role
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-10 text-center">
          <Briefcase className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No open roles yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => onPickJob(j)}
              className="w-full rounded-xl border border-border/40 bg-card p-4 hover:border-border hover:bg-muted/20 transition text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{j.title}</p>
                    <Badge variant="outline" className={cn("text-[10px]", JOB_STATUS_CHIP[j.status])}>
                      {j.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {j.department ?? "—"} · {j.positions} position{j.positions > 1 ? "s" : ""} ·
                    posted {new Date(j.posted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={j.status} onValueChange={(v) => handleStatusChange(j.id, v as JobStatus)}>
                    <SelectTrigger className="h-7 w-24 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="on_hold">On hold</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="filled">Filled</SelectItem>
                    </SelectContent>
                  </Select>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateJobDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function JobView({ job, onBack }: { job: JobPosting; onBack: () => void }) {
  const { data: candidates = [], isLoading } = useCandidatesForJob(job.id);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Group candidates by stage
  const byStage = useMemo(() => {
    const m = new Map<CandidateStage, Candidate[]>();
    STAGE_ORDER.forEach((s) => m.set(s, []));
    candidates.forEach((c) => {
      const arr = m.get(c.stage) ?? [];
      arr.push(c);
      m.set(c.stage, arr);
    });
    return m;
  }, [candidates]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button size="sm" variant="ghost" onClick={onBack} className="gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <div className="min-w-0">
            <h3 className="text-base font-semibold truncate">{job.title}</h3>
            <p className="text-[11px] text-muted-foreground">
              {job.department ?? "—"} · {candidates.length} candidate{candidates.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add candidate
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : candidates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-10 text-center">
          <UsersIcon className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No candidates yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STAGE_ORDER.filter((s) => (byStage.get(s) ?? []).length > 0).map((stage) => {
            const list = byStage.get(stage) ?? [];
            return (
              <div key={stage} className="rounded-xl border border-border/40 bg-muted/10 p-2">
                <div className="px-1 py-1.5 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {STAGE_LABEL[stage]}
                  </p>
                  <Badge variant="outline" className="text-[10px]">{list.length}</Badge>
                </div>
                <div className="space-y-1.5">
                  {list.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCandidate(c)}
                      className="w-full rounded-lg border border-border/40 bg-card p-2.5 text-left hover:border-border hover:bg-muted/30 transition"
                    >
                      <p className="text-sm font-medium truncate">{c.full_name}</p>
                      {c.email && <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>}
                      {c.rating && (
                        <div className="mt-1 inline-flex items-center gap-0.5 text-amber-600 text-[10px]">
                          {Array.from({ length: c.rating }).map((_, i) => (
                            <Star key={i} className="h-2.5 w-2.5 fill-current" />
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddCandidateDialog open={addOpen} onOpenChange={setAddOpen} jobId={job.id} />
      {selectedCandidate && (
        <CandidateDetailDialog
          open={!!selectedCandidate}
          onOpenChange={(v) => !v && setSelectedCandidate(null)}
          candidate={selectedCandidate}
          jobId={job.id}
        />
      )}
    </div>
  );
}

/* ───────── Create job dialog ───────── */

function CreateJobDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateJobPosting();
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [positions, setPositions] = useState(1);
  const [closingAt, setClosingAt] = useState("");

  const reset = () => { setTitle(""); setDepartment(""); setDescription(""); setPositions(1); setClosingAt(""); };

  const handleSubmit = () => {
    if (!title.trim()) { toast.error("Job title is required"); return; }
    create.mutate(
      { title, department, description, positions, closingAt: closingAt || null },
      {
        onSuccess: () => { toast.success("Job posted"); onOpenChange(false); reset(); },
        onError: (e: any) => toast.error(e?.message ?? "Couldn't create"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Post a new role</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Backend Engineer" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Department</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Tech" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Positions</Label>
              <Input type="number" min={1} value={positions} onChange={(e) => setPositions(parseInt(e.target.value) || 1)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Responsibilities, requirements…" className="mt-1 min-h-[70px]" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Closing date (optional)</Label>
            <Input type="date" value={closingAt} onChange={(e) => setClosingAt(e.target.value)} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Post role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Add candidate dialog ───────── */

function AddCandidateDialog({ open, onOpenChange, jobId }: { open: boolean; onOpenChange: (v: boolean) => void; jobId: string }) {
  const add = useAddCandidate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  const reset = () => { setFullName(""); setEmail(""); setPhone(""); setSource(""); setResumeUrl(""); };

  const handleSubmit = () => {
    if (!fullName.trim()) { toast.error("Candidate name required"); return; }
    add.mutate(
      { jobId, fullName, email, phone, source, resumeUrl },
      {
        onSuccess: () => { toast.success("Candidate added"); onOpenChange(false); reset(); },
        onError: (e: any) => toast.error(e?.message ?? "Couldn't add"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add a candidate</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Source (optional)</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="LinkedIn, referral, careers page…" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Resume link (optional)</Label>
            <Input value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} placeholder="https://…" className="mt-1 font-mono text-xs" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={add.isPending}>
            {add.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Add candidate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Candidate detail dialog ───────── */

function CandidateDetailDialog({
  open, onOpenChange, candidate, jobId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidate: Candidate;
  jobId: string;
}) {
  const update = useUpdateCandidate();
  const [stage, setStage] = useState<CandidateStage>(candidate.stage);
  const [rating, setRating] = useState<number>(candidate.rating ?? 0);
  const [notes, setNotes] = useState(candidate.notes ?? "");
  const [rejectedReason, setRejectedReason] = useState(candidate.rejected_reason ?? "");

  const handleSave = () => {
    update.mutate(
      {
        id: candidate.id,
        jobId,
        patch: {
          stage,
          rating: rating || null,
          notes: notes.trim() || null,
          rejected_reason: stage === "rejected" ? (rejectedReason.trim() || null) : null,
        },
      },
      {
        onSuccess: () => { toast.success("Saved"); onOpenChange(false); },
        onError: (e: any) => toast.error(e?.message ?? "Couldn't save"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {candidate.full_name}
            <Badge variant="outline" className={cn("text-[10px]", STAGE_CHIP[candidate.stage])}>
              {STAGE_LABEL[candidate.stage]}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {(candidate.email || candidate.phone || candidate.source || candidate.resume_url) && (
            <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-1 text-xs">
              {candidate.email && (
                <p className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-muted-foreground" /> {candidate.email}</p>
              )}
              {candidate.phone && (
                <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-muted-foreground" /> {candidate.phone}</p>
              )}
              {candidate.source && (
                <p className="text-muted-foreground">Source: {candidate.source}</p>
              )}
              {candidate.resume_url && (
                <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> View resume
                </a>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stage</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as CandidateStage)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGE_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rating</Label>
            <div className="mt-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n === rating ? 0 : n)}
                  className={cn("p-1 rounded", rating >= n ? "text-amber-500" : "text-muted-foreground/30 hover:text-amber-500/60")}
                  aria-label={`${n} star`}
                >
                  <Star className={cn("h-4 w-4", rating >= n && "fill-current")} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 min-h-[80px]" placeholder="Interview notes, impressions, next steps…" />
          </div>

          {stage === "rejected" && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rejection reason</Label>
              <Input value={rejectedReason} onChange={(e) => setRejectedReason(e.target.value)} className="mt-1" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
