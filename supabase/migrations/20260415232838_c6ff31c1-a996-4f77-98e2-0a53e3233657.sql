
-- Fix the overly permissive update policy on tasks
DROP POLICY "Assignees can update own tasks" ON public.tasks;

-- Seed priorities
INSERT INTO public.priorities (id, startup_id, startup_name, tag, severity, problem, why, impact, impact_level, owner, mfo_suggestion, mfo_confidence, rank, detected_ago, deadline_in, execution_status)
VALUES
  (gen_random_uuid(), 'nasheedio', 'Nasheedio', 'Retention Drop', 'critical', '⚠️ Retention ↓12% this week', 'Fewer creator uploads in last 2 weeks', 'Affects long-term growth and engagement', 'High', NULL, 'Launch creator reactivation campaign', 'High', 1, '2 days ago', '3 days', 'pending'),
  (gen_random_uuid(), 'project-x', 'Project X', 'Runway Risk', 'critical', '🔥 Runway below 3 months', 'High burn, no funding yet', 'Company survival at stake', 'High', 'CFO', 'Prepare investor outreach list', 'High', 2, '5 days ago', 'Overdue by 1 day', 'in-progress'),
  (gen_random_uuid(), 'gurucool', 'Gurucool', 'Hiring Delay', 'at-risk', '⚠️ Backend role open for 21 days', 'Low qualified applicants', 'Blocking API v2 launch timeline', 'Medium', 'HR Head', 'Push referral hiring campaign', 'Medium', 3, '21 days ago', '7 days', 'pending');

-- Seed tasks
INSERT INTO public.tasks (id, title, linked_issue_id, linked_startup_id, assignee, status, deadline, instructions)
VALUES
  (gen_random_uuid(), 'Launch creator reactivation campaign', 'fp-1', 'nasheedio', 'Alice Chen', 'in-progress', 'Apr 18, 2026', 'Send re-engagement emails to top 200 inactive creators.'),
  (gen_random_uuid(), 'Prepare investor outreach list', 'fp-2', 'project-x', 'CFO', 'in-progress', 'Apr 16, 2026', 'Compile 15 potential bridge investors.'),
  (gen_random_uuid(), 'Cut non-essential spend by 20%', 'fp-2', 'project-x', 'CFO', 'blocked', 'Apr 17, 2026', 'Review all recurring costs.'),
  (gen_random_uuid(), 'Push referral hiring campaign', 'fp-3', 'gurucool', 'HR Head', 'pending', 'Apr 20, 2026', 'Offer $2K referral bonus. Post in 5 backend-focused communities.');
