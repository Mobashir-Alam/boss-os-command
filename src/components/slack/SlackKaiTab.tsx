import { useState, useRef, useId } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAskSlackKai } from "@/hooks/useSlack";

interface ChatTurn {
  id: string;
  question: string;
  answer: string | null;
  error?: string;
  asked_at: Date;
}

const SUGGESTED_PROMPTS = [
  { label: "How's team communication?", body: "Give me a summary of overall Slack communication health — activity levels, engagement, and anything unusual in the last 14 days." },
  { label: "Which channels are most active?", body: "Which channels are driving the most activity? Are there any that have gone quiet or spiked recently?" },
  { label: "Who are the top contributors?", body: "Who are the most active contributors in Slack? Is there a healthy spread or are a few people doing all the talking?" },
  { label: "What could we improve?", body: "Based on the Slack data, what communication patterns should we watch out for? What risks do you see?" },
];

// ─── Minimal markdown renderer ───────────────────────────────

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i} className="bg-muted px-1 rounded text-xs">{part.slice(1, -1)}</code>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listOrdered = false;

  function flushList() {
    if (!listItems.length) return;
    const Tag = listOrdered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={listOrdered ? "list-decimal pl-5 space-y-1 text-sm" : "list-disc pl-5 space-y-1 text-sm"}>
        {listItems.map((item, i) => (
          <li key={i}><Inline text={item} /></li>
        ))}
      </Tag>
    );
    listItems = [];
  }

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flushList();
      blocks.push(<h2 key={blocks.length} className="text-base font-semibold mt-4 mb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      flushList();
      blocks.push(<h3 key={blocks.length} className="text-sm font-semibold mt-3 mb-0.5">{line.slice(4)}</h3>);
    } else if (/^[-*] /.test(line)) {
      const ordered = false;
      if (listItems.length && listOrdered !== ordered) flushList();
      listOrdered = false;
      listItems.push(line.slice(2));
    } else if (/^\d+\. /.test(line)) {
      const ordered = true;
      if (listItems.length && listOrdered !== ordered) flushList();
      listOrdered = true;
      listItems.push(line.replace(/^\d+\. /, ""));
    } else if (line.trim()) {
      flushList();
      blocks.push(<p key={blocks.length} className="text-sm leading-relaxed"><Inline text={line} /></p>);
    } else {
      flushList();
    }
  }
  flushList();
  return <div className="space-y-1">{blocks}</div>;
}

// ─── Main component ──────────────────────────────────────────

interface Props {
  startupId: string;
}

export default function SlackKaiTab({ startupId }: Props) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const { mutateAsync: ask, isPending } = useAskSlackKai();
  const bottomRef = useRef<HTMLDivElement>(null);
  const idPrefix = useId();

  async function submit(q: string) {
    if (!q.trim() || isPending) return;
    const turn: ChatTurn = {
      id: `${idPrefix}-${Date.now()}`,
      question: q.trim(),
      answer: null,
      asked_at: new Date(),
    };
    setHistory((h) => [...h, turn]);
    setQuestion("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const answer = await ask({ startupId, question: q.trim() });
      setHistory((h) =>
        h.map((t) => (t.id === turn.id ? { ...t, answer } : t))
      );
    } catch (err) {
      setHistory((h) =>
        h.map((t) =>
          t.id === turn.id ? { ...t, error: (err as Error).message } : t
        )
      );
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
          <Bot className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <div className="font-semibold text-sm">KAI — Slack Analyst</div>
          <div className="text-xs text-muted-foreground">Reads 14 days of Slack data. Answers ground in your snapshot.</div>
        </div>
      </div>

      {/* Suggested prompts */}
      {history.length === 0 && (
        <div className="grid grid-cols-2 gap-3">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p.label}
              onClick={() => submit(p.body)}
              className="text-left rounded-lg border p-3 text-sm hover:bg-muted transition-colors"
            >
              <div className="font-medium text-sm">{p.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.body}</div>
            </button>
          ))}
        </div>
      )}

      {/* Chat history */}
      <div className="space-y-4">
        {history.map((turn) => (
          <div key={turn.id} className="space-y-2">
            {/* User bubble */}
            <div className="flex justify-end">
              <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm max-w-[80%]">
                {turn.question}
              </div>
            </div>
            {/* KAI answer */}
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <Card className="flex-1 max-w-[85%]">
                <CardContent className="p-4">
                  {turn.answer ? (
                    <MarkdownLite text={turn.answer} />
                  ) : turn.error ? (
                    <p className="text-sm text-red-500">{turn.error}</p>
                  ) : (
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                      <Skeleton className="h-3 w-3/5" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
      </div>
      <div ref={bottomRef} />

      {/* Input */}
      <div className="flex gap-2 items-end sticky bottom-0 bg-background pt-2 pb-1">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit(question);
            }
          }}
          placeholder="Ask anything about your Slack data… (Cmd+Enter to send)"
          className="resize-none min-h-[60px] max-h-32"
          disabled={isPending}
        />
        <Button
          onClick={() => submit(question)}
          disabled={!question.trim() || isPending}
          size="icon"
          className="h-10 w-10 shrink-0"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
