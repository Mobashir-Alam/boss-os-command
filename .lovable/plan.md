

# Founder OS — Elite Polish (Final Refinement)

## Overview
Elevate all three screens (Home, Focus, Startup Detail) to a 10/10 command center with stronger urgency, inline actions, execution tracking, and time context — without redesigning.

---

## 1. Data Layer Updates

**`src/data/startups.ts`**
- Add `detectedAgo`, `lastUpdated` fields to `Startup` type
- Add a `getDailySummary()` function that returns a briefing string based on startup statuses

**`src/data/focus.ts`**
- Add fields to `FocusPriority`: `detectedAgo`, `deadlineIn`, `status` (Pending/In Progress/Done), `mfoConfidence` ("High"/"Medium"), `rank` number
- Add `detectedAgo` and `owner` to `lowerPriorities` items

---

## 2. Home Screen (`Index.tsx`)

- Add **Daily Summary** line above the cards grid: a single computed sentence like "Nasheedio needs attention. Others stable." styled as a calm briefing
- Cards already have status borders, urgency icons, and Fix-primary hierarchy — no card changes needed

---

## 3. Focus Screen (`Focus.tsx` + `PriorityCard.tsx`)

**Priority ordering**: Show `#1`, `#2`, `#3` rank badges on each card

**Time pressure**: Display "Detected 2 days ago" and "Deadline in 3 days" labels inside each card

**Execution status**: Add a status badge (Pending / In Progress / Done) with a small colored dot indicator

**Inline actions** (replace modal-based):
- Assign dropdown already inline — keep as-is
- Note: replace modal with an inline expandable textarea inside the card
- Deadline: already inline via popover — keep

**MFO enhancements**:
- Add "Confidence: High/Medium" next to suggestion
- Add "Accept Suggestion" button that converts to a task (toast confirmation)

**Quick resolution**: Add "Mark as Done" and "Ignore" buttons to the action row

---

## 4. Startup Detail Page (`StartupDetail.tsx`)

**Reorder & expand sections**:
1. **Snapshot** — existing metrics cards
2. **Problems** — new section with structured problem cards (problem, why, impact, owner, status, actions: assign/note/deadline/done)
3. **Next Decision** — new block: "Should we invest in creator incentives?" with "Review Data" and "Decide" buttons
4. **People** — placeholder team list
5. **Progress** — placeholder timeline
6. **Plan** — placeholder strategic notes

**Time context**: Each problem shows "Detected 3 days ago" and "Last updated 5 hours ago"

---

## 5. Files Changed

| File | Change |
|------|--------|
| `src/data/startups.ts` | Add time fields, daily summary helper |
| `src/data/focus.ts` | Add rank, status, time, confidence fields |
| `src/pages/Index.tsx` | Add daily summary line |
| `src/components/PriorityCard.tsx` | Rank badge, inline note, execution status, MFO confidence + accept, mark done/ignore |
| `src/pages/Focus.tsx` | Pass rank to PriorityCard |
| `src/pages/StartupDetail.tsx` | Full rebuild: problems section, next decision, people/progress/plan placeholders, time context |

---

## Technical Notes
- All data remains mock/hardcoded
- No new dependencies needed
- Inline note uses local state toggle instead of Dialog
- Execution status is local state only (Pending → In Progress → Done cycle)

