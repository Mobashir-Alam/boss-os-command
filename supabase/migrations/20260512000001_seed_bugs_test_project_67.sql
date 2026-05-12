-- Seed the existing "Trend Features Status" Google Sheet (27 rows) into the
-- bugs table, attached to "tets project 67" (id: e575dd9d-c398-4e3d-adb8-426904176156).
--
-- The CSV has 4 unique assignee names (Mubashir, Faisal, Amaan, Srayansh).
-- We map them positionally to the project's 4 members:
--   Mubashir  → project lead (1st by joined_at, lead role)
--   Faisal    → 2nd member
--   Amaan     → 3rd member
--   Srayansh  → 4th member
--
-- Reporter is set to the lead (Vikram) for all rows since the original sheet
-- had Mubashir reporting most of them and Mubashir maps to the lead in this
-- test project.
--
-- This is a one-time seed. Idempotent via a marker title check.

DO $$
DECLARE
  proj_id uuid := 'e575dd9d-c398-4e3d-adb8-426904176156'::uuid;
  members uuid[];
  m_mubashir uuid;
  m_faisal   uuid;
  m_amaan    uuid;
  m_srayansh uuid;
  m_reporter uuid;
BEGIN
  -- Skip if seed already applied (cheap idempotency)
  IF EXISTS (
    SELECT 1 FROM public.bugs
    WHERE project_id = proj_id
      AND title = 'Auth token is stored in Zustand persisted browser storage'
  ) THEN
    RAISE NOTICE 'Bugs already seeded for project %, skipping.', proj_id;
    RETURN;
  END IF;

  -- Pull the 4 project members. Lead first, then others by joined_at.
  SELECT array_agg(profile_id ORDER BY
    CASE WHEN role = 'lead' THEN 0 ELSE 1 END,
    joined_at ASC
  ) INTO members
  FROM public.project_members
  WHERE project_id = proj_id;

  IF members IS NULL OR array_length(members, 1) < 4 THEN
    RAISE EXCEPTION 'Expected at least 4 members on project %, found %', proj_id, COALESCE(array_length(members,1), 0);
  END IF;

  m_mubashir := members[1];   -- lead
  m_faisal   := members[2];
  m_amaan    := members[3];
  m_srayansh := members[4];
  m_reporter := m_mubashir;   -- lead reports all (Mubashir-equivalent)

  -- ── Backend bugs (Faisal) ──────────────────────────────────────────────
  INSERT INTO public.bugs (project_id, title, description, type, area, status, assignee_profile, reporter_profile)
  VALUES
    (proj_id, 'Refresh Token keep expiring',
     'Refresh Token keep expiring',
     'bug', 'backend', 'open', m_faisal, m_reporter),
    (proj_id, 'Audio ID is not matching with strapi ID',
     'Audio ID is not matching with strapi ID',
     'bug', 'backend', 'open', m_faisal, m_reporter),
    (proj_id, 'Template APIs',
     'Template APIs',
     'new_feature', 'backend', 'open', m_faisal, m_reporter);

  -- ── In-progress feature work (Amaan, Srayansh) ─────────────────────────
  INSERT INTO public.bugs (project_id, title, description, type, area, status, assignee_profile, reporter_profile)
  VALUES
    (proj_id, 'Feed UI',
     'Feed UI',
     'new_feature', 'frontend', 'in_progress', m_amaan, m_reporter),
    (proj_id, 'Editor asset APIs implementation',
     'Editor asset APIs implementation',
     'new_feature', 'frontend', 'in_progress', m_srayansh, m_reporter);

  -- ── Critical / Security (all originally Mubashir → lead) ───────────────
  INSERT INTO public.bugs (project_id, title, description, type, area, status, assignee_profile, reporter_profile)
  VALUES
    (proj_id,
     'Auth token is stored in Zustand persisted browser storage',
     'Auth token is stored in Zustand persisted browser storage and also a JS-created cookie: auth.store.ts (line 27), login/page.tsx (line 53). This is vulnerable to token theft via XSS. Move auth to server-set HttpOnly, Secure, SameSite cookies.',
     'critical_security', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'Proxy admin-token check is incomplete',
     'Proxy only checks whether admin-token exists, not whether it is valid or has admin/moderator role: proxy.ts (line 13). Add server/session validation or a backend /me/session verification flow.',
     'critical_security', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'Login redirect uses unsanitized router.push(from)',
     'Login redirect uses router.push(from) from query params: login/page.tsx (line 60). Sanitize to internal paths only to avoid unsafe redirects.',
     'critical_security', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'admin-token cookie is not marked Secure',
     'admin-token cookie is not marked Secure: login/page.tsx (line 53). JS cannot set HttpOnly, so this should move backend-side.',
     'critical_security', 'frontend', 'open', m_mubashir, m_reporter);

  -- ── High Priority ──────────────────────────────────────────────────────
  INSERT INTO public.bugs (project_id, title, description, type, area, status, assignee_profile, reporter_profile)
  VALUES
    (proj_id,
     '.env.example missing NEXT_PUBLIC_CLIENT_ID',
     '.env.example misses NEXT_PUBLIC_CLIENT_ID, but login depends on it: .env.example (line 1), login/page.tsx (line 45).',
     'high_priority', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'React Query Devtools always included',
     'React Query Devtools are always included, including production builds: Providers.tsx (line 34). Gate by process.env.NODE_ENV === "development".',
     'high_priority', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'No tests / smoke tests configured',
     'No tests/config found. Add at least smoke tests for login, protected routes, upload flow, and destructive moderation actions.',
     'high_priority', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'File upload UI does not enforce max size',
     'File upload UI advertises max size but does not enforce it: audio/page.tsx (line 254). Add client-side size/type checks and rely on backend validation too.',
     'high_priority', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'Signed upload response headers ignored',
     'Signed upload response includes headers, but upload clients ignore them: editor-assets.ts (line 41), audio.ts (line 18). Use backend-provided signed URL headers when PUT-ing to GCS.',
     'high_priority', 'frontend', 'open', m_mubashir, m_reporter);

  -- ── Product / UX ───────────────────────────────────────────────────────
  INSERT INTO public.bugs (project_id, title, description, type, area, status, assignee_profile, reporter_profile)
  VALUES
    (proj_id,
     'Mobile layout not ready',
     'Mobile layout is not ready: dashboard sidebar is always fixed-width and tables do not have a clear responsive strategy: layout.tsx (line 9).',
     'product_ux', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'User ban/unban needs confirmation dialog',
     'User ban/unban actions from the table have no confirmation dialog: users/page.tsx (line 266). This is risky for admin tools.',
     'product_ux', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'Asset preview assumes images only',
     'Asset preview assumes every file is an image, but allowed types include GIF, JSON, and MP4: AssetManagerPage.tsx (line 542). Add type-aware previews.',
     'product_ux', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'Icon-only buttons missing aria-label',
     'Many icon-only buttons have title or no accessible label. Add aria-label consistently, especially edit/delete buttons.',
     'product_ux', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'Mojibake / encoding-damaged text in several files',
     'Several files contain mojibake / encoding-damaged text like LoadingÃ¢â¬Â¦, ÃÂ·, and comment dividers. Clean these to normal ASCII or UTF-8 characters.',
     'product_ux', 'frontend', 'open', m_mubashir, m_reporter);

  -- ── New Implementations (architectural) ─────────────────────────────────
  INSERT INTO public.bugs (project_id, title, description, type, area, status, assignee_profile, reporter_profile)
  VALUES
    (proj_id,
     'Server-backed auth/session module',
     'Server-backed auth/session module with refresh/logout/session-expiry handling.',
     'new_implementation', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'Role / permission guard system',
     'Role/permission guard system for admin, moderator, and read-only roles.',
     'new_implementation', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'Shared CRUD/table abstraction',
     'Shared CRUD/table abstraction for pagination, loading, empty, error, delete confirm, and query invalidation.',
     'new_implementation', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'Audit log for admin actions',
     'Audit log for admin actions: ban user, remove post, delete comment, upload/deactivate assets/audio.',
     'new_implementation', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'Upload resilience',
     'Upload resilience: size validation, progress cancel, retry, stale upload cleanup, and clear failed-confirm state.',
     'new_implementation', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'Better env validation at startup',
     'Better environment validation at startup for NEXT_PUBLIC_API_URL, NEXT_PUBLIC_CLIENT_ID, and app env.',
     'new_implementation', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'Error normalization layer',
     'Error normalization layer for API responses so every page shows useful backend errors.',
     'new_implementation', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'E2E tests with Playwright',
     'E2E tests with Playwright for login, protected redirect, users, posts, comments, assets, and audio.',
     'new_implementation', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'CI pipeline (lint, typecheck, build, tests)',
     'CI pipeline: lint, typecheck/build, tests.',
     'new_implementation', 'frontend', 'open', m_mubashir, m_reporter),
    (proj_id,
     'Replace default README with project-specific docs',
     'Replace default README with project-specific setup, env vars, API contract expectations, and deployment notes.',
     'new_implementation', 'frontend', 'open', m_mubashir, m_reporter);

  RAISE NOTICE 'Seeded 27 bugs for project %', proj_id;
END $$;
