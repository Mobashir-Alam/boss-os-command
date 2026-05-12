-- Tighten bug UPDATE permissions. Previously any tech team member could edit
-- any bug. New rule:
--   - Founder + Tech Lead (functional_head + dept='tech')  → can edit any bug
--   - Tech team_member                                      → can only edit bugs
--                                                             they reported OR
--                                                             are assigned to
--   - Anyone else                                           → cannot edit
--
-- INSERT permission (raising a bug) is unchanged: founder + any tech role.
-- DELETE is still absent — no one can delete a bug.

-- ─────────────────────────────────────────────────────────────
-- 1. New narrower helper: can the user edit ANY bug regardless of ownership?
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_edit_any_bug()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (
        role = 'founder'
        OR (role = 'functional_head' AND department = 'tech')
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_edit_any_bug() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_edit_any_bug() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Replace bugs_update policy
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "bugs_update" ON public.bugs;
CREATE POLICY "bugs_update" ON public.bugs
  FOR UPDATE USING (
    public.can_edit_any_bug()
    OR reporter_profile = auth.uid()
    OR assignee_profile = auth.uid()
  );

-- can_manage_bugs() is intentionally left alone — it still gates INSERT, where
-- the broader "anyone in tech can raise a bug" rule applies.
