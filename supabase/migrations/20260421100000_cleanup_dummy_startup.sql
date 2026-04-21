-- Remove any dummy/test startups that were added through the UI
-- and are not part of the canonical demo set.
-- Cascade deletes will clean up all related rows (departments, documents, etc).

DELETE FROM public.startups
WHERE LOWER(name) LIKE '%dummy%';
