// Parses Slack attendance messages into structured events.
// Tolerant by design — the channel is free-form, so we lean on simple
// keyword detection and use the Slack message timestamp as the source of
// truth for time. User-typed times in messages are kept as `userStatedTime`
// for HR's reference but don't override the Slack timestamp.
//
// Confidently parsed → eventType set, needsReview = false.
// Multi-day backfill / date-prefixed / multiple events in one message →
// needsReview = true so HR can manually resolve.

export type AttendanceEventType = "in" | "out" | "leave";

export interface ParsedAttendance {
  events: Array<{
    type: AttendanceEventType;
    /** ISO timestamp from the Slack message (always set) */
    occurredAt: string;
    /** Time the user typed in the message body if any (just for reference) */
    userStatedTime: string | null;
    /** Whether this event is a "break" rather than start/end of day */
    isBreak: boolean;
    rawText: string;
  }>;
  needsReview: boolean;
  /** Optional reason explaining why review is needed */
  reviewReason?: string;
}

const DATE_REF_RE = /\b(?:\d{1,2}[\.\-\/]\d{1,2}(?:[\.\-\/]\d{2,4})?|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*|yesterday|today|tomorrow)\b/gi;

const LEAVE_RE = /\bon\s+leave\b/i;
const IN_AGAIN_RE = /\bin\s+again\b/i;
const OUT_FOR_BREAK_RE = /\bout\s+(?:for\s+(?:some\s*time|same\s*time|a\s+(?:break|moment|while)|\d+\s*(?:min|minute|hour|hr)s?)|now)\b/i;
// Bare "in" or "out" (with optional surrounding words but no date refs)
const IN_RE = /\b(?:in|i'm\s+in)\b/i;
const OUT_RE = /\bout\b/i;

// Extract a HH(:MM)? am|pm if present
const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/i;

function findUserStatedTime(text: string): string | null {
  const m = TIME_RE.exec(text);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const merid = (m[3] ?? "").toLowerCase().replace(/\./g, "");
  if (merid === "pm" || merid === "p.m") {
    if (h < 12) h += 12;
  } else if (merid === "am" || merid === "a.m") {
    if (h === 12) h = 0;
  }
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function looksLikeMultiDayBackfill(text: string): boolean {
  // 2+ date references suggests they're logging multiple days at once
  const matches = text.match(DATE_REF_RE);
  return !!matches && matches.length >= 2;
}

function looksLikeDatePrefixed(text: string): boolean {
  // "12 may", "12.05.26", "13.05.26 - In at 6 PM" etc. at the start.
  return /^\s*(?:\d{1,2}[\.\-\/]\d{1,2}|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|yesterday|today)/i.test(text);
}

/**
 * Parse a Slack attendance message into structured events.
 *
 * @param text  The Slack message body
 * @param msgTimestampISO  The ISO timestamp of the Slack message
 */
export function parseAttendanceMessage(text: string, msgTimestampISO: string): ParsedAttendance {
  const trimmed = text.trim();

  // System / empty messages
  if (!trimmed || /\bwas added to\b/i.test(trimmed)) {
    return { events: [], needsReview: false };
  }

  // Multi-day backfill — defer to HR
  if (looksLikeMultiDayBackfill(trimmed)) {
    return {
      events: [],
      needsReview: true,
      reviewReason: "Multi-day backfill — needs HR review",
    };
  }

  // Date-prefixed single-day → still flag for review (we don't compute past dates)
  if (looksLikeDatePrefixed(trimmed)) {
    return {
      events: [],
      needsReview: true,
      reviewReason: "Date-prefixed message — needs HR review",
    };
  }

  // Leave declaration
  if (LEAVE_RE.test(trimmed)) {
    return {
      events: [
        {
          type: "leave",
          occurredAt: msgTimestampISO,
          userStatedTime: null,
          isBreak: false,
          rawText: trimmed,
        },
      ],
      needsReview: false,
    };
  }

  // "out for sometime" / "out now" / "out for 30 mins" → break OUT
  if (OUT_FOR_BREAK_RE.test(trimmed)) {
    return {
      events: [
        {
          type: "out",
          occurredAt: msgTimestampISO,
          userStatedTime: findUserStatedTime(trimmed),
          isBreak: true,
          rawText: trimmed,
        },
      ],
      needsReview: false,
    };
  }

  // "in again" → IN after a break
  if (IN_AGAIN_RE.test(trimmed)) {
    return {
      events: [
        {
          type: "in",
          occurredAt: msgTimestampISO,
          userStatedTime: findUserStatedTime(trimmed),
          isBreak: true,
          rawText: trimmed,
        },
      ],
      needsReview: false,
    };
  }

  // Multiple in/out in a single message (e.g. "in 11am out 6pm in again at 8pm out 9:30pm")
  // — heuristic: more than one occurrence of in OR out
  const inMatches = (trimmed.match(/\bin\b/gi) ?? []).length;
  const outMatches = (trimmed.match(/\bout\b/gi) ?? []).length;
  if (inMatches + outMatches > 1) {
    return {
      events: [],
      needsReview: true,
      reviewReason: "Multiple events in one message — needs HR review",
    };
  }

  // Pure IN
  if (IN_RE.test(trimmed) && !OUT_RE.test(trimmed)) {
    return {
      events: [
        {
          type: "in",
          occurredAt: msgTimestampISO,
          userStatedTime: findUserStatedTime(trimmed),
          isBreak: false,
          rawText: trimmed,
        },
      ],
      needsReview: false,
    };
  }

  // Pure OUT
  if (OUT_RE.test(trimmed) && !IN_RE.test(trimmed)) {
    return {
      events: [
        {
          type: "out",
          occurredAt: msgTimestampISO,
          userStatedTime: findUserStatedTime(trimmed),
          isBreak: false,
          rawText: trimmed,
        },
      ],
      needsReview: false,
    };
  }

  // Couldn't parse confidently
  return {
    events: [],
    needsReview: true,
    reviewReason: "Couldn't classify — needs HR review",
  };
}

/**
 * Aggregate a day's worth of events for one person into a single
 * attendance_records-ready summary.
 */
export function aggregateDay(events: ParsedAttendance["events"]): {
  status: "present" | "on_leave" | "absent";
  firstInAt: string | null;
  lastOutAt: string | null;
  totalMinutes: number | null;
  sessionCount: number;
} {
  if (events.length === 0) {
    return {
      status: "absent",
      firstInAt: null,
      lastOutAt: null,
      totalMinutes: null,
      sessionCount: 0,
    };
  }
  if (events.some((e) => e.type === "leave")) {
    return {
      status: "on_leave",
      firstInAt: null,
      lastOutAt: null,
      totalMinutes: null,
      sessionCount: 0,
    };
  }
  // Pair up in/out events in order
  const sorted = [...events].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  );
  let totalMs = 0;
  let openIn: Date | null = null;
  let sessionCount = 0;
  let firstIn: Date | null = null;
  let lastOut: Date | null = null;
  for (const e of sorted) {
    const t = new Date(e.occurredAt);
    if (e.type === "in") {
      if (!openIn) openIn = t;
      if (!firstIn) firstIn = t;
      sessionCount += 1;
    } else if (e.type === "out") {
      if (openIn) {
        totalMs += t.getTime() - openIn.getTime();
        openIn = null;
      }
      lastOut = t;
    }
  }
  return {
    status: "present",
    firstInAt: firstIn ? firstIn.toISOString() : null,
    lastOutAt: lastOut ? lastOut.toISOString() : null,
    totalMinutes: totalMs > 0 ? Math.round(totalMs / 60000) : null,
    sessionCount: Math.max(sessionCount, 1),
  };
}
