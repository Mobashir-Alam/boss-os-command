import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProjectMessages,
  useSendProjectMessage,
  useDeleteProjectMessage,
  type ProjectMessage,
} from "@/hooks/useEmployeeProjects";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import MentionTextarea from "@/components/mentions/MentionTextarea";
import MentionedText from "@/components/mentions/MentionedText";
import { useMentionableProfiles, resolveMentions } from "@/hooks/useMentionableProfiles";
import { insertMentionNotifications } from "@/hooks/useNotifications";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.round((now - then) / 1000);
  if (sec < 30) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function initial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : "?";
}

function avatarColor(seed: string): string {
  // Deterministic color based on author name/id
  const palette = [
    "bg-blue-500/20 text-blue-700",
    "bg-emerald-500/20 text-emerald-700",
    "bg-amber-500/20 text-amber-700",
    "bg-purple-500/20 text-purple-700",
    "bg-pink-500/20 text-pink-700",
    "bg-cyan-500/20 text-cyan-700",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

export default function ProjectDiscussion({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: messages = [], isLoading } = useProjectMessages(projectId);
  const sendMessage = useSendProjectMessage();
  const deleteMessage = useDeleteProjectMessage();

  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  // Realtime: subscribe to inserts + updates for this project's messages
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`project-messages-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_messages",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["project-messages", projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > lastCountRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    lastCountRef.current = messages.length;
  }, [messages.length]);

  const visible = messages.filter((m) => !m.deleted_at);

  const { data: mentionableProfiles = [] } = useMentionableProfiles();

  const handleSend = () => {
    const body = draft.trim();
    if (!body || sendMessage.isPending || !user?.id) return;
    sendMessage.mutate(
      { projectId, body },
      {
        onSuccess: async () => {
          setDraft("");
          const mentioned = resolveMentions(body, mentionableProfiles);
          if (mentioned.length > 0) {
            const preview = body.length > 100 ? body.slice(0, 100) + "…" : body;
            try {
              await insertMentionNotifications({
                mentionedProfileIds: mentioned,
                actorProfileId: user.id,
                message: `mentioned you in project chat: "${preview}"`,
                link: null,
                projectId,
              });
            } catch {
              /* swallow — chat send already succeeded */
            }
          }
        },
        onError: (e: any) => toast.error(e.message ?? "Failed to send"),
      }
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter sends
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = (msg: ProjectMessage) => {
    deleteMessage.mutate(
      { messageId: msg.id, projectId },
      {
        onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
      }
    );
  };

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
        <MessageCircle className="h-3.5 w-3.5" />
        Discussion
        {visible.length > 0 && (
          <span className="text-muted-foreground/60">— {visible.length}</span>
        )}
      </h2>

      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        {/* Messages */}
        <div
          ref={listRef}
          className="max-h-[420px] min-h-[160px] overflow-y-auto p-4 space-y-3"
        >
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-8">Loading messages...</p>
          ) : visible.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-8">
              No messages yet — start the conversation.
            </p>
          ) : (
            visible.map((msg) => {
              const isMine = msg.author_profile === user?.id;
              return (
                <div key={msg.id} className="group flex gap-3">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
                      avatarColor(msg.author_profile)
                    )}
                  >
                    {initial(msg.author_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold">
                        {msg.author_name}
                        {isMine && <span className="text-muted-foreground font-normal"> (you)</span>}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{relativeTime(msg.created_at)}</span>
                      {isMine && (
                        <button
                          type="button"
                          title="Delete message"
                          onClick={() => handleDelete(msg)}
                          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3 text-destructive/70" />
                        </button>
                      )}
                    </div>
                    <MentionedText
                      text={msg.body}
                      className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border/40 bg-muted/10 p-3">
          <MentionTextarea
            value={draft}
            onChange={setDraft}
            onKeyDown={handleKeyDown}
            placeholder="Write a message... type @ to mention (Cmd/Ctrl + Enter to send)"
            className="min-h-[60px] text-sm resize-none border-border/50 bg-background"
            disabled={!user || sendMessage.isPending}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">
              {draft.length > 0 && `${draft.length} chars`}
            </span>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleSend}
              disabled={!draft.trim() || sendMessage.isPending}
            >
              <Send className="h-3 w-3" />
              {sendMessage.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
