import { Link } from "react-router-dom";
import { useProjectActivity, type ActivityKind } from "@/hooks/useProjectActivity";
import { Card, CardContent } from "@/components/ui/card";
import { ListTodo, CheckCircle2, Bug, BugOff, UserPlus, Link as LinkIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON: Record<ActivityKind, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  task_created:   { icon: ListTodo,    color: "text-blue-600",    bg: "bg-blue-500/10" },
  task_done:      { icon: CheckCircle2,color: "text-emerald-600", bg: "bg-emerald-500/10" },
  bug_raised:     { icon: Bug,         color: "text-amber-600",   bg: "bg-amber-500/10" },
  bug_solved:     { icon: BugOff,      color: "text-emerald-600", bg: "bg-emerald-500/10" },
  member_joined:  { icon: UserPlus,    color: "text-emerald-600", bg: "bg-emerald-500/10" },
  link_added:     { icon: LinkIcon,    color: "text-purple-600",  bg: "bg-purple-500/10" },
  doc_uploaded:   { icon: FileText,    color: "text-slate-600",   bg: "bg-slate-500/10" },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function ProjectActivity({ projectId }: { projectId: string }) {
  const { data: events = [], isLoading } = useProjectActivity(projectId);

  if (isLoading) {
    return <p className="text-xs text-muted-foreground italic">Loading activity…</p>;
  }
  if (!events.length) {
    return (
      <Card className="border-dashed border-border/40">
        <CardContent className="p-6 text-center">
          <p className="text-xs text-muted-foreground italic">No activity yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/60" />
      <ol className="space-y-4">
        {events.map((e) => {
          const cfg = ICON[e.kind];
          const Icon = cfg.icon;
          return (
            <li key={e.id} className="relative flex gap-3 pl-0">
              <div className={cn("relative z-10 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0", cfg.bg)}>
                <Icon className={cn("h-4 w-4", cfg.color)} />
              </div>
              <div className="flex-1 min-w-0 pt-1.5">
                <p className="text-sm leading-tight">
                  {e.actorId ? (
                    <Link to={`/profile/${e.actorId}`} className="font-semibold hover:underline">
                      {e.actorName}
                    </Link>
                  ) : (
                    <span className="font-semibold">{e.actorName ?? "Someone"}</span>
                  )}{" "}
                  <span className="text-muted-foreground">{e.title}</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{relativeTime(e.at)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
