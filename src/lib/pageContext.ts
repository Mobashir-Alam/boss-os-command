// Short human descriptions of what each page shows. Jarvis-mode KAI injects
// the current route's description so it can "explain this page", and uses the
// full map as its navigation catalog.

export const PAGE_CONTEXT: Record<string, string> = {
  "/team/social-media":
    "YouTube analytics dashboard. Shows 7 channels, 629 videos, 7.2M total views. Tabs: Pulse (overview), Audience, Retention curves, Cohort analysis (age vs views scatter), Content lab, Ask KAI, Recent uploads, Top performers, Channels, Analytics (revenue/RPM).",
  "/team/slack":
    "Slack Team Ops dashboard. Shows daily attendance check-ins, monthly attendance sheet, channel breakdown, people activity, timing patterns, and engagement. Today board shows who checked in vs absent.",
  "/team/github":
    "GitHub engineering dashboard. Shows commits, PRs, issues across all repos. Tracks per-contributor activity, repo health, PR cycle time.",
  "/":
    "CEO Command Center. Cross-source intelligence combining YouTube, Slack, and GitHub into one strategic view. Shows 7/15/30 day summaries, team health, content performance, and strategic recommendations.",
  "/people":
    "People OS. Admin list of every employee with role, department, status, KPI score, salary, projects, and connector links (Slack + GitHub accounts).",
  "/employee":
    "Employee dashboard. The logged-in person's own projects, tasks, leave requests, performance reviews, and My Activity (GitHub commits + Slack attendance).",
};

export function contextForRoute(route: string): string | null {
  if (PAGE_CONTEXT[route]) return PAGE_CONTEXT[route];
  // Prefix match for nested routes (/startup/:id etc. have no entry → null)
  const hit = Object.keys(PAGE_CONTEXT)
    .filter((k) => k !== "/" && route.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? PAGE_CONTEXT[hit] : null;
}
