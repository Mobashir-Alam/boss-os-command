import { useState } from "react";
import { useBugComments, useCreateBugComment, useDeleteBugComment } from "@/hooks/useBugComments";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import MentionTextarea from "@/components/mentions/MentionTextarea";
import MentionedText from "@/components/mentions/MentionedText";
import { useMentionableProfiles, resolveMentions } from "@/hooks/useMentionableProfiles";
import { insertMentionNotifications } from "@/hooks/useNotifications";

interface Props {
  bugId: string;
}

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

// Deterministic avatar tone from the author id
function avatarTone(seed: string): string {
  const tones = [
    "bg-blue-500/20 text-blue-700",
    "bg-emerald-500/20 text-emerald-700",
    "bg-amber-500/20 text-amber-700",
    "bg-rose-500/20 text-rose-700",
    "bg-purple-500/20 text-purple-700",
    "bg-cyan-500/20 text-cyan-700",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i);
  return tones[Math.abs(h) % tones.length];
}

export default function BugComments({ bugId }: Props) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useBugComments(bugId);
  const createComment = useCreateBugComment();
  const deleteComment = useDeleteBugComment();
  const { data: mentionableProfiles = [] } = useMentionableProfiles();
  const [draft, setDraft] = useState("");

  const handleSend = () => {
    const body = draft.trim();
    if (!body || !user?.id) return;
    createComment.mutate(
      { bugId, body },
      {
        onSuccess: async () => {
          setDraft("");
          // Fire-and-forget mention notifications
          const mentioned = resolveMentions(body, mentionableProfiles);
          if (mentioned.length > 0) {
            const preview = body.length > 100 ? body.slice(0, 100) + "…" : body;
            try {
              await insertMentionNotifications({
                mentionedProfileIds: mentioned,
                actorProfileId: user.id,
                message: `mentioned you in a bug comment: "${preview}"`,
                link: null,
                bugId,
              });
            } catch {
              // Notification failure shouldn't block the comment from posting.
            }
          }
        },
        onError: (e: any) => toast.error(e?.message ?? "Couldn't post"),
      }
    );
  };

  const handleDelete = (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    deleteComment.mutate(
      { commentId, bugId },
      { onError: (e: any) => toast.error(e?.message ?? "Couldn't delete") }
    );
  };

  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" />
        Discussion {comments.length > 0 && `· ${comments.length}`}
      </h4>

      {isLoading ? (
        <p className="text-xs italic text-muted-foreground">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">
          No comments yet — be the first to discuss this bug.
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => {
            const authorName = c.author?.full_name ?? c.author?.email ?? "Unknown";
            const isMine = c.author_id === user?.id;
            return (
              <div key={c.id} className="flex items-start gap-2">
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarTone(c.author_id ?? "anon")}`}
                >
                  {initials(authorName)}
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-border/40 bg-card px-3 py-2">
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">
                      {authorName}
                      {isMine && <span className="ml-1 text-[10px] text-muted-foreground">(you)</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </span>
                      {isMine && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete comment"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <MentionedText text={c.body} className="whitespace-pre-wrap text-sm leading-snug" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-1.5 pt-2">
        <MentionTextarea
          value={draft}
          onChange={setDraft}
          placeholder="Write a comment… type @ to mention someone (Cmd/Ctrl+Enter to send)"
          className="min-h-[60px] text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="flex items-center justify-end">
          <Button type="button" size="sm" onClick={handleSend} disabled={!draft.trim() || createComment.isPending} className="gap-1.5">
            {createComment.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
