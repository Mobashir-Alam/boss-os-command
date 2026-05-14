import { Fragment } from "react";
import { Link } from "react-router-dom";
import { useMentionableProfiles } from "@/hooks/useMentionableProfiles";

// Renders text with @mentions highlighted as clickable links to the
// mentioned person's profile. Falls back to plain text if no profile match.

interface Props {
  text: string;
  className?: string;
}

export default function MentionedText({ text, className }: Props) {
  const { data: profiles = [] } = useMentionableProfiles();

  if (!text) return null;
  if (profiles.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Build a regex that matches @ followed by any of the known full names.
  // Sort longest first so "Vikram Singh" wins over "Vikram".
  const sorted = [...profiles].sort((a, b) => b.full_name.length - a.full_name.length);
  const escaped = sorted.map((p) => p.full_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`@(${escaped.join("|")})\\b`, "gi");

  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    const matchedName = m[1];
    const profile = profiles.find((p) => p.full_name.toLowerCase() === matchedName.toLowerCase());
    if (profile) {
      parts.push(
        <Link
          key={`${m.index}-${profile.id}`}
          to={`/profile/${profile.id}`}
          onClick={(e) => e.stopPropagation()}
          className="rounded bg-primary/10 px-1 font-medium text-primary hover:underline"
        >
          @{profile.full_name}
        </Link>
      );
    } else {
      parts.push(m[0]);
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));

  return (
    <span className={className}>
      {parts.map((p, i) => (
        <Fragment key={i}>{p}</Fragment>
      ))}
    </span>
  );
}
