-- Extend the notifications table to support @mentions and richer event types.
--
-- Adds:
--   - actor_profile_id  → who triggered the notification ("Vikram mentioned you")
--   - link              → optional URL to navigate to on click
--   - bug_id            → optional pointer to a bug (for bug-related events)
-- Expands the type CHECK enum to include:
--   mention, bug_comment, bug_assigned, bug_status_changed,
--   task_assigned, project_member_added

-- ─────────────────────────────────────────────────────────────
-- 1. New columns
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS actor_profile_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS link             text,
  ADD COLUMN IF NOT EXISTS bug_id           uuid REFERENCES public.bugs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS notifications_bug_idx ON public.notifications (bug_id);
CREATE INDEX IF NOT EXISTS notifications_actor_idx ON public.notifications (actor_profile_id);

-- ─────────────────────────────────────────────────────────────
-- 2. Expand type enum
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Drop the old CHECK constraint if it exists, regardless of name pattern
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%type%project_assigned%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.notifications DROP CONSTRAINT ' || conname
      FROM pg_constraint
      WHERE conrelid = 'public.notifications'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%type%project_assigned%'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'project_assigned',
    'task_updated',
    'task_assigned',
    'project_completed',
    'project_paused',
    'project_member_added',
    'mention',
    'bug_comment',
    'bug_assigned',
    'bug_status_changed'
  ));

-- ─────────────────────────────────────────────────────────────
-- 3. RLS — make sure recipients can read and update (mark read) their own
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (recipient_profile_id = auth.uid());

-- INSERT: anyone authed (since notifications are written by code on behalf
-- of actions other users take). We trust the client / hooks to set the
-- right recipient.
DROP POLICY IF EXISTS "notifications_insert_authed" ON public.notifications;
CREATE POLICY "notifications_insert_authed" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: recipient can mark their own as read
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (recipient_profile_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 4. Realtime
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
