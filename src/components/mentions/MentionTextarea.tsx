import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMentionableProfiles, type MentionableProfile } from "@/hooks/useMentionableProfiles";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
}

export interface MentionTextareaHandle {
  focus: () => void;
}

// A textarea with an @-mention autocomplete dropdown.
// Type "@" → popover appears with matching profiles.
// Arrow keys / Enter to select. Esc to close.
const MentionTextarea = forwardRef<MentionTextareaHandle, Props>(function MentionTextarea(
  { value, onChange, placeholder, className, onKeyDown, disabled },
  ref
) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const { data: profiles = [] } = useMentionableProfiles();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  // Position of the @ that triggered the popover, in the textarea string
  const [tokenStart, setTokenStart] = useState<number | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => taRef.current?.focus(),
  }));

  const matches = (() => {
    if (!query) return profiles.slice(0, 8);
    const q = query.toLowerCase();
    return profiles
      .filter((p) => p.full_name.toLowerCase().includes(q) || (p.email ?? "").toLowerCase().includes(q))
      .slice(0, 8);
  })();

  // After every value change, look back from caret to see if we're in an @-token
  const refreshTokenState = (text: string, caret: number) => {
    let i = caret - 1;
    // Walk back until we hit @, whitespace, or start
    while (i >= 0 && text[i] !== "@" && !/\s/.test(text[i])) i--;
    if (i >= 0 && text[i] === "@") {
      const partial = text.slice(i + 1, caret);
      // Only show popover if @-token is still being typed (no trailing whitespace)
      if (!/\s$/.test(partial)) {
        setOpen(true);
        setQuery(partial);
        setTokenStart(i);
        setActiveIdx(0);
        positionPopover();
        return;
      }
    }
    setOpen(false);
    setTokenStart(null);
  };

  const positionPopover = () => {
    const ta = taRef.current;
    if (!ta) return;
    const rect = ta.getBoundingClientRect();
    // Anchor under the textarea — simple positioning, no caret math.
    setAnchor({ top: rect.bottom + 4, left: rect.left });
  };

  useEffect(() => {
    if (!open) return;
    const onScroll = () => positionPopover();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const insertMention = (p: MentionableProfile) => {
    const ta = taRef.current;
    if (!ta || tokenStart === null) return;
    const caret = ta.selectionStart ?? value.length;
    const before = value.slice(0, tokenStart);
    const after = value.slice(caret);
    const insertion = `@${p.full_name} `;
    const next = before + insertion + after;
    onChange(next);
    setOpen(false);
    setTokenStart(null);
    // restore caret right after the inserted name
    const newCaret = before.length + insertion.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newCaret, newCaret);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && matches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % matches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        insertMention(matches[activeIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative">
      <Textarea
        ref={taRef}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          requestAnimationFrame(() => {
            const caret = e.target.selectionStart ?? next.length;
            refreshTokenState(next, caret);
          });
        }}
        onKeyUp={(e) => {
          // Cursor moves (arrows, click) without value change — recheck
          if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
            const ta = e.currentTarget;
            refreshTokenState(value, ta.selectionStart ?? value.length);
          }
        }}
        onClick={(e) => {
          const ta = e.currentTarget;
          refreshTokenState(value, ta.selectionStart ?? value.length);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
      {open && matches.length > 0 && anchor && (
        <div
          className="fixed z-50 max-h-60 w-64 overflow-y-auto rounded-lg border border-border/60 bg-popover shadow-lg"
          style={{ top: anchor.top, left: anchor.left }}
        >
          {matches.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent textarea blur
                insertMention(p);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm transition",
                i === activeIdx ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              <p className="font-medium">{p.full_name}</p>
              <p className="text-[10px] text-muted-foreground">
                {p.role?.replace(/_/g, " ")} {p.department && `· ${p.department}`}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default MentionTextarea;
