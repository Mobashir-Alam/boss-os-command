import { useState, useRef, useId } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Send, Loader2 } from "lucide-react";
import { streamKaiFunction } from "@/lib/kaiStream";

interface ChatTurn { id: string; question: string; answer: string | null; error?: string }

const PROMPTS = [
  { label: "How's engineering doing?", body: "Give me a plain-English summary of how the tech team is doing this week vs last — output, who's contributing, and anything notable." },
  { label: "Who's overloaded or idle?", body: "Looking at commits and PRs, is the load balanced? Who's carrying the most, and is anyone idle or went quiet?" },
  { label: "What's stuck?", body: "Which open PRs look stuck or stale, and what risks (bus factor, stalled work) should I worry about?" },
  { label: "Where is effort going?", body: "Which repos are getting the most engineering effort right now, and is anything important being neglected?" },
];

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return <>{parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="bg-muted px-1 rounded text-xs">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  })}</>;
}

function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    blocks.push(<ul key={blocks.length} className="list-disc pl-5 space-y-1 text-sm">{list.map((it, i) => <li key={i}><Inline text={it} /></li>)}</ul>);
    list = [];
  };
  for (const line of lines) {
    if (line.startsWith("## ")) { flush(); blocks.push(<h2 key={blocks.length} className="text-base font-semibold mt-4 mb-1">{line.slice(3)}</h2>); }
    else if (line.startsWith("### ")) { flush(); blocks.push(<h3 key={blocks.length} className="text-sm font-semibold mt-3 mb-0.5">{line.slice(4)}</h3>); }
    else if (/^[-*] /.test(line)) list.push(line.slice(2));
    else if (line.trim()) { flush(); blocks.push(<p key={blocks.length} className="text-sm leading-relaxed"><Inline text={line} /></p>); }
    else flush();
  }
  flush();
  return <div className="space-y-1">{blocks}</div>;
}

export default function GitHubKaiTab({ startupId }: { startupId: string }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [isPending, setIsPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const idPrefix = useId();

  async function submit(q: string) {
    if (!q.trim() || isPending) return;
    const turn: ChatTurn = { id: `${idPrefix}-${Date.now()}`, question: q.trim(), answer: null };
    setHistory((h) => [...h, turn]);
    setQuestion("");
    setIsPending(true);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      // Stream tokens in as they arrive — the answer grows word by word
      await streamKaiFunction(
        "github-kai-ask",
        { startup_id: startupId, question: q.trim() },
        (full) => {
          setHistory((h) => h.map((t) => (t.id === turn.id ? { ...t, answer: full } : t)));
        }
      );
    } catch (err) {
      setHistory((h) => h.map((t) => (t.id === turn.id ? { ...t, error: (err as Error).message } : t)));
    } finally {
      setIsPending(false);
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><Bot className="w-4 h-4 text-amber-600" /></div>
        <div>
          <div className="font-semibold text-sm">KAI — Engineering Analyst</div>
          <div className="text-xs text-muted-foreground">Reads the last 7–28 days of GitHub activity. Answers ground in your data.</div>
        </div>
      </div>

      {history.length === 0 && (
        <div className="grid grid-cols-2 gap-3">
          {PROMPTS.map((p) => (
            <button key={p.label} onClick={() => submit(p.body)} className="text-left rounded-lg border p-3 text-sm hover:bg-muted transition-colors">
              <div className="font-medium text-sm">{p.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.body}</div>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {history.map((turn) => (
          <div key={turn.id} className="space-y-2">
            <div className="flex justify-end">
              <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm max-w-[80%]">{turn.question}</div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5"><Bot className="w-3.5 h-3.5 text-amber-600" /></div>
              <Card className="flex-1 max-w-[85%]"><CardContent className="p-4">
                {turn.answer ? <MarkdownLite text={turn.answer} /> : turn.error ? <p className="text-sm text-red-500">{turn.error}</p> : (
                  <div className="space-y-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /><Skeleton className="h-3 w-3/5" /></div>
                )}
              </CardContent></Card>
            </div>
          </div>
        ))}
      </div>
      <div ref={bottomRef} />

      <div className="flex gap-2 items-end sticky bottom-0 bg-background pt-2 pb-1">
        <Textarea value={question} onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(question); } }}
          placeholder="Ask about the tech team… (Cmd+Enter to send)" className="resize-none min-h-[60px] max-h-32" disabled={isPending} />
        <Button onClick={() => submit(question)} disabled={!question.trim() || isPending} size="icon" className="h-10 w-10 shrink-0">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
