import { useState, useRef, useEffect, FormEvent, Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sparkles, Send, Loader2, Lightbulb, TrendingUp, AlertTriangle, Compass, Filter,
  Trash2, User, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAskYouTubeKai, useYouTubeChannels, type YouTubeChannel } from "@/hooks/useYouTube";
import InfoTooltip from "./InfoTooltip";
import { toast } from "sonner";

interface Props {
  startupId: string;
  channelFilterUuid: string | null;     // from the dashboard's top channel filter
}

interface ChatTurn {
  id: string;
  question: string;
  answer: string | null;     // null while loading
  error?: string | null;
  scope: { channels: number; windowDays: number };
  asked_at: number;
}

const SUGGESTED_PROMPTS: Array<{
  label: string; icon: any; question: string; tone: "explain" | "win" | "risk" | "topic";
}> = [
  {
    label: "Explain how we're doing",
    icon: Lightbulb,
    tone: "explain",
    question: "Give me a clear executive summary of how our YouTube performance is doing right now. Cover the big KPI moves, what's actually changing under them, and the two or three signals I should pay attention to.",
  },
  {
    label: "What's working best?",
    icon: TrendingUp,
    tone: "win",
    question: "What's working best right now? Identify the videos, channels, audience segments, traffic sources, and content patterns that are over-performing. Quote the specific numbers, and tell me what we should do MORE of.",
  },
  {
    label: "What could go wrong?",
    icon: AlertTriangle,
    tone: "risk",
    question: "What could go wrong? Identify the specific risks in this data — revenue concentration, treadmill dependency, weak retention hooks, audience skew, stale catalog, declining trajectory channels. Be specific with numbers and tell me which one is most urgent.",
  },
  {
    label: "Suggest new video topics",
    icon: Compass,
    tone: "topic",
    question: "Suggest 5 specific new video topics or formats we should make next, grounded in the data. For each one, point to the audience demographic, tags, retention patterns, or trajectory signals that justify it. Avoid generic creator advice.",
  },
];

const WINDOW_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 7,  label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

export default function KaiTab({ startupId, channelFilterUuid }: Props) {
  const { data: channels = [] } = useYouTubeChannels(startupId);
  const askKai = useAskYouTubeKai();

  // Channel filter: defaults to the dashboard-level one, but the KaiTab also
  // lets you override locally so you can ask a follow-up about a different
  // scope without losing context.
  const [localChannelUuid, setLocalChannelUuid] = useState<string>(
    channelFilterUuid ?? "all"
  );
  // Keep the local filter in sync when the dashboard filter changes
  useEffect(() => {
    setLocalChannelUuid(channelFilterUuid ?? "all");
  }, [channelFilterUuid]);

  const [windowDays, setWindowDays] = useState<number>(30);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever a new turn appears or completes
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const channelScopeLabel = (() => {
    if (localChannelUuid === "all") return `All channels (${channels.length})`;
    const c = channels.find((x: YouTubeChannel) => x.id === localChannelUuid);
    return c?.title ?? "Selected channel";
  })();

  const submit = (qText: string) => {
    const q = qText.trim();
    if (!q || askKai.isPending) return;
    const turnId = crypto.randomUUID();
    const newTurn: ChatTurn = {
      id: turnId,
      question: q,
      answer: null,
      scope: {
        channels: localChannelUuid === "all" ? channels.length : 1,
        windowDays,
      },
      asked_at: Date.now(),
    };
    setTurns((prev) => [...prev, newTurn]);
    setQuestion("");
    askKai.mutate(
      {
        startupId,
        channelUuid: localChannelUuid === "all" ? null : localChannelUuid,
        question: q,
        windowDays,
      },
      {
        onSuccess: (data) => {
          setTurns((prev) =>
            prev.map((t) => (t.id === turnId ? { ...t, answer: data.answer } : t))
          );
        },
        onError: (e: any) => {
          const msg = e?.message ?? "Something went wrong.";
          setTurns((prev) =>
            prev.map((t) => (t.id === turnId ? { ...t, error: msg, answer: "" } : t))
          );
          toast.error(msg);
        },
      }
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(question);
  };

  const clearThread = () => {
    setTurns([]);
    setQuestion("");
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-5">
      {/* Header + scope controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <p className="text-sm">
            <span className="font-semibold">KAI</span>
            <span className="text-muted-foreground"> · analytics co-pilot for your YouTube data</span>
          </p>
          <InfoTooltip title="What KAI sees">
            On every question, KAI gets a fresh JSON snapshot of your selected
            scope: channel metadata, recent vs baseline KPIs, top videos by
            views and revenue, cohort trajectories, demographics, geography,
            devices, traffic sources, retention summary, and content
            patterns (upload heatmap, title length, duration, tags). The
            model is instructed to use only that snapshot and never invent
            numbers.
          </InfoTooltip>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Channel scope override */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <Select value={localChannelUuid} onValueChange={setLocalChannelUuid}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All channels ({channels.length})
                </SelectItem>
                {channels.map((c: YouTubeChannel) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title ?? c.channel_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Window picker */}
          <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v))}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOW_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {turns.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearThread}
              className="h-8 gap-1.5 text-xs"
              title="Clear conversation"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Suggested prompts */}
      <Card className="border-border/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Try asking
            </p>
            <InfoTooltip title="Suggested prompts" size="xs">
              These four cover the most common analyst questions. Click any
              to send. Each adapts to the current channel scope and window.
            </InfoTooltip>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {SUGGESTED_PROMPTS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.label}
                  type="button"
                  disabled={askKai.isPending}
                  onClick={() => submit(p.question)}
                  className={cn(
                    "text-left rounded-lg border bg-card p-3 transition",
                    "hover:bg-muted/20 hover:border-border disabled:opacity-50 disabled:cursor-not-allowed",
                    p.tone === "explain" && "border-blue-500/30",
                    p.tone === "win"     && "border-emerald-500/30",
                    p.tone === "risk"    && "border-amber-500/30",
                    p.tone === "topic"   && "border-purple-500/30",
                  )}
                >
                  <Icon className={cn(
                    "h-3.5 w-3.5 mb-1.5",
                    p.tone === "explain" && "text-blue-600",
                    p.tone === "win"     && "text-emerald-600",
                    p.tone === "risk"    && "text-amber-600",
                    p.tone === "topic"   && "text-purple-600",
                  )} />
                  <p className="text-xs font-semibold leading-snug">{p.label}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Conversation thread */}
      {turns.length > 0 && (
        <div className="space-y-4">
          {turns.map((t) => (
            <Fragment key={t.id}>
              <UserTurn question={t.question} scope={t.scope} channelLabel={channelScopeLabel} />
              {t.answer === null && !t.error ? (
                <AssistantLoading />
              ) : t.error ? (
                <AssistantError text={t.error} />
              ) : (
                <AssistantTurn answer={t.answer ?? ""} />
              )}
            </Fragment>
          ))}
          <div ref={threadEndRef} />
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`Ask KAI about ${channelScopeLabel.toLowerCase()} — e.g. "Why are subs gained down 30%?"`}
          rows={3}
          disabled={askKai.isPending}
          onKeyDown={(e) => {
            // Cmd/Ctrl+Enter to send
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit(question);
            }
          }}
          className="resize-y min-h-[72px]"
        />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <p>Tip — press <kbd className="rounded border border-border/60 bg-muted/50 px-1">Cmd/Ctrl + Enter</kbd> to send.</p>
          <Button
            type="submit"
            size="sm"
            disabled={askKai.isPending || question.trim().length === 0}
            className="gap-1.5"
          >
            {askKai.isPending
              ? <><Loader2 className="h-3 w-3 animate-spin" /> Thinking…</>
              : <><Send className="h-3 w-3" /> Send</>}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ─────── Conversation parts ─────── */

function UserTurn({
  question, scope, channelLabel,
}: {
  question: string;
  scope: { channels: number; windowDays: number };
  channelLabel: string;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">You asked</p>
          <Badge variant="outline" className="text-[9px] gap-1">
            {channelLabel} · {scope.windowDays}d
          </Badge>
        </div>
        <p className="text-sm leading-relaxed">{question}</p>
      </div>
    </div>
  );
}

function AssistantLoading() {
  return (
    <div className="flex gap-3 items-start">
      <KaiAvatar />
      <div className="rounded-lg border border-border/40 bg-card p-4 flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
        <p className="text-xs text-muted-foreground">
          KAI is reading the data…
        </p>
      </div>
    </div>
  );
}

function AssistantError({ text }: { text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <KaiAvatar tone="error" />
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-700 max-w-full">
        <p className="font-semibold mb-1">Couldn't fetch an answer.</p>
        <p>{text}</p>
      </div>
    </div>
  );
}

function AssistantTurn({ answer }: { answer: string }) {
  return (
    <div className="flex gap-3 items-start">
      <KaiAvatar />
      <div className="rounded-lg border border-border/40 bg-card p-4 min-w-0 flex-1 prose-kai">
        <MarkdownLite text={answer} />
      </div>
    </div>
  );
}

function KaiAvatar({ tone = "default" }: { tone?: "default" | "error" }) {
  return (
    <div className={cn(
      "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
      tone === "error" ? "bg-red-500/15" : "bg-amber-500/15"
    )}>
      <Bot className={cn("h-3.5 w-3.5", tone === "error" ? "text-red-600" : "text-amber-600")} />
    </div>
  );
}

/* ─────── Minimal markdown renderer ─────── */
// Handles: ## / ### headers, - and * bullets, 1. numbered lists, **bold**,
// *italic*, `code`. Tables and links are passed through as-is in plain text
// (good enough for Gemini's output structure).

function MarkdownLite({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: Array<{ kind: "h2" | "h3" | "ul" | "ol" | "p"; lines: string[] }> = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^###\s+/.test(line)) {
      blocks.push({ kind: "h3", lines: [line.replace(/^###\s+/, "")] });
      i++;
      continue;
    }
    if (/^##\s+/.test(line)) {
      blocks.push({ kind: "h2", lines: [line.replace(/^##\s+/, "")] });
      i++;
      continue;
    }
    if (/^#\s+/.test(line)) {
      blocks.push({ kind: "h2", lines: [line.replace(/^#\s+/, "")] });
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const ul: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        ul.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", lines: ul });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const ol: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        ol.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", lines: ol });
      continue;
    }
    // Paragraph (consume contiguous non-blank lines)
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" &&
      !/^(###?|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    if (para.length > 0) blocks.push({ kind: "p", lines: para });
    // Skip blank lines
    while (i < lines.length && lines[i].trim() === "") i++;
  }

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((b, idx) => {
        if (b.kind === "h2") {
          return (
            <h3 key={idx} className="text-sm font-bold mt-2 first:mt-0">
              <Inline text={b.lines[0]} />
            </h3>
          );
        }
        if (b.kind === "h3") {
          return (
            <h4 key={idx} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mt-2">
              <Inline text={b.lines[0]} />
            </h4>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1">
              {b.lines.map((l, j) => (
                <li key={j}><Inline text={l} /></li>
              ))}
            </ul>
          );
        }
        if (b.kind === "ol") {
          return (
            <ol key={idx} className="list-decimal pl-5 space-y-1">
              {b.lines.map((l, j) => (
                <li key={j}><Inline text={l} /></li>
              ))}
            </ol>
          );
        }
        // paragraph
        return (
          <p key={idx} className="whitespace-pre-wrap">
            <Inline text={b.lines.join(" ")} />
          </p>
        );
      })}
    </div>
  );
}

// Inline formatting: **bold**, *italic*, `code`. Naive but safe — no HTML
// injection because we use plain JSX nodes.
function Inline({ text }: { text: string }) {
  const tokens = tokenizeInline(text);
  return (
    <>
      {tokens.map((t, i) => {
        if (t.kind === "bold") return <strong key={i}>{t.text}</strong>;
        if (t.kind === "italic") return <em key={i}>{t.text}</em>;
        if (t.kind === "code")
          return (
            <code
              key={i}
              className="text-[11px] rounded bg-muted/50 px-1 py-0.5 border border-border/30"
            >
              {t.text}
            </code>
          );
        return <Fragment key={i}>{t.text}</Fragment>;
      })}
    </>
  );
}

function tokenizeInline(text: string): Array<{ kind: "text" | "bold" | "italic" | "code"; text: string }> {
  const out: Array<{ kind: "text" | "bold" | "italic" | "code"; text: string }> = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("**")) out.push({ kind: "bold", text: tok.slice(2, -2) });
    else if (tok.startsWith("`")) out.push({ kind: "code", text: tok.slice(1, -1) });
    else out.push({ kind: "italic", text: tok.slice(1, -1) });
    last = m.index + tok.length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}
