
-- 1. Add department column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT DEFAULT NULL;

-- 2. Migrate CFO data
UPDATE public.profiles SET role = 'functional_head', department = 'finance' WHERE role = 'cfo';
UPDATE public.user_roles SET role = 'functional_head' WHERE role = 'cfo';

-- 3. Drop defaults
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.team_invites ALTER COLUMN role DROP DEFAULT;

-- 4. Drop ALL policies first (they depend on has_role which depends on enum)
DROP POLICY IF EXISTS "Founders can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Founders can view all assignments" ON public.startup_assignments;
DROP POLICY IF EXISTS "Founders can manage assignments" ON public.startup_assignments;
DROP POLICY IF EXISTS "Founders can manage invites" ON public.team_invites;
DROP POLICY IF EXISTS "Founders can manage priorities" ON public.priorities;
DROP POLICY IF EXISTS "MFOs can manage priorities" ON public.priorities;
DROP POLICY IF EXISTS "Founders can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "MFOs can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Founders can manage startups" ON public.startups;
DROP POLICY IF EXISTS "MFOs can update startups" ON public.startups;
DROP POLICY IF EXISTS "Founders can manage stakeholders" ON public.stakeholders;
DROP POLICY IF EXISTS "MFOs can manage stakeholders" ON public.stakeholders;
DROP POLICY IF EXISTS "Founders can manage stakeholder history" ON public.stakeholder_history;
DROP POLICY IF EXISTS "MFOs can manage stakeholder history" ON public.stakeholder_history;
DROP POLICY IF EXISTS "Founders can manage board seats" ON public.board_seats;
DROP POLICY IF EXISTS "MFOs can manage board seats" ON public.board_seats;
DROP POLICY IF EXISTS "Founders can manage special rights" ON public.special_rights;
DROP POLICY IF EXISTS "MFOs can manage special rights" ON public.special_rights;
DROP POLICY IF EXISTS "Founders can manage funding rounds" ON public.funding_rounds;
DROP POLICY IF EXISTS "MFOs can manage funding rounds" ON public.funding_rounds;
DROP POLICY IF EXISTS "Founders can manage equity documents" ON public.equity_documents;
DROP POLICY IF EXISTS "MFOs can manage equity documents" ON public.equity_documents;
DROP POLICY IF EXISTS "Founders can upload equity docs" ON storage.objects;
DROP POLICY IF EXISTS "MFOs can upload equity docs" ON storage.objects;
DROP POLICY IF EXISTS "Founders can delete equity docs" ON storage.objects;
DROP POLICY IF EXISTS "Founders can delete startup docs" ON storage.objects;
DROP POLICY IF EXISTS "MFOs can delete startup docs" ON storage.objects;
DROP POLICY IF EXISTS "Founders can manage kai_memories" ON public.kai_memories;
DROP POLICY IF EXISTS "MFOs can manage kai_memories" ON public.kai_memories;
DROP POLICY IF EXISTS "Founders can manage startup_notes" ON public.startup_notes;
DROP POLICY IF EXISTS "MFOs can manage startup_notes" ON public.startup_notes;
DROP POLICY IF EXISTS "Founders can manage startup_milestones" ON public.startup_milestones;
DROP POLICY IF EXISTS "MFOs can manage startup_milestones" ON public.startup_milestones;
DROP POLICY IF EXISTS "Founders can manage startup_contacts" ON public.startup_contacts;
DROP POLICY IF EXISTS "MFOs can manage startup_contacts" ON public.startup_contacts;
DROP POLICY IF EXISTS "Founders can manage startup_documents" ON public.startup_documents;
DROP POLICY IF EXISTS "MFOs can manage startup_documents" ON public.startup_documents;
DROP POLICY IF EXISTS "Founders can manage financial_entries" ON public.financial_entries;
DROP POLICY IF EXISTS "CFOs can manage financial_entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Founders can manage burn_categories" ON public.burn_categories;
DROP POLICY IF EXISTS "CFOs can manage burn_categories" ON public.burn_categories;
DROP POLICY IF EXISTS "Founders can manage cash_flow_entries" ON public.cash_flow_entries;
DROP POLICY IF EXISTS "CFOs can manage cash_flow_entries" ON public.cash_flow_entries;
DROP POLICY IF EXISTS "Founders can manage financial_forecasts" ON public.financial_forecasts;
DROP POLICY IF EXISTS "CFOs can manage financial_forecasts" ON public.financial_forecasts;
DROP POLICY IF EXISTS "Founders can manage people" ON public.people;
DROP POLICY IF EXISTS "MFOs can manage people" ON public.people;
DROP POLICY IF EXISTS "Founders can manage growth_config" ON public.growth_config;
DROP POLICY IF EXISTS "MFOs can manage growth_config" ON public.growth_config;
DROP POLICY IF EXISTS "Founders can manage growth_metrics" ON public.growth_metrics;
DROP POLICY IF EXISTS "MFOs can manage growth_metrics" ON public.growth_metrics;
DROP POLICY IF EXISTS "Founders can manage growth_experiments" ON public.growth_experiments;
DROP POLICY IF EXISTS "MFOs can manage growth_experiments" ON public.growth_experiments;
DROP POLICY IF EXISTS "Founders manage product_outcomes" ON public.product_outcomes;
DROP POLICY IF EXISTS "MFOs manage product_outcomes" ON public.product_outcomes;
DROP POLICY IF EXISTS "Founders manage product_initiatives" ON public.product_initiatives;
DROP POLICY IF EXISTS "MFOs manage product_initiatives" ON public.product_initiatives;
DROP POLICY IF EXISTS "Founders manage product_features" ON public.product_features;
DROP POLICY IF EXISTS "MFOs manage product_features" ON public.product_features;
DROP POLICY IF EXISTS "Founders manage tech_health" ON public.tech_health_entries;
DROP POLICY IF EXISTS "MFOs manage tech_health" ON public.tech_health_entries;

-- 5. Now drop has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 6. Swap enum
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('founder', 'mfo', 'functional_head', 'project_manager', 'team_member');
ALTER TABLE public.profiles ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;
ALTER TABLE public.team_invites ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'mfo'::public.app_role;
ALTER TABLE public.team_invites ALTER COLUMN role SET DEFAULT 'mfo'::public.app_role;
DROP TYPE public.app_role_old;

-- 7. Recreate has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- 8. Recreate ALL policies
CREATE POLICY "Founders can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders can view all assignments" ON public.startup_assignments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders can manage assignments" ON public.startup_assignments FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders can manage invites" ON public.team_invites FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders can manage priorities" ON public.priorities FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage priorities" ON public.priorities FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage tasks" ON public.tasks FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage tasks" ON public.tasks FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage startups" ON public.startups FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can update startups" ON public.startups FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage stakeholders" ON public.stakeholders FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage stakeholders" ON public.stakeholders FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage stakeholder history" ON public.stakeholder_history FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage stakeholder history" ON public.stakeholder_history FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage board seats" ON public.board_seats FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage board seats" ON public.board_seats FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage special rights" ON public.special_rights FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage special rights" ON public.special_rights FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage funding rounds" ON public.funding_rounds FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage funding rounds" ON public.funding_rounds FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage equity documents" ON public.equity_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage equity documents" ON public.equity_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can upload equity docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'equity-documents' AND has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can upload equity docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'equity-documents' AND has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can delete equity docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'equity-documents' AND has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders can delete startup docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can delete startup docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'startup-documents' AND has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage kai_memories" ON public.kai_memories FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage kai_memories" ON public.kai_memories FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage startup_notes" ON public.startup_notes FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage startup_notes" ON public.startup_notes FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage startup_milestones" ON public.startup_milestones FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage startup_milestones" ON public.startup_milestones FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage startup_contacts" ON public.startup_contacts FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage startup_contacts" ON public.startup_contacts FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage startup_documents" ON public.startup_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage startup_documents" ON public.startup_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage financial_entries" ON public.financial_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "Functional heads can manage financial_entries" ON public.financial_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'functional_head'));
CREATE POLICY "Founders can manage burn_categories" ON public.burn_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "Functional heads can manage burn_categories" ON public.burn_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'functional_head'));
CREATE POLICY "Founders can manage cash_flow_entries" ON public.cash_flow_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "Functional heads can manage cash_flow_entries" ON public.cash_flow_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'functional_head'));
CREATE POLICY "Founders can manage financial_forecasts" ON public.financial_forecasts FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "Functional heads can manage financial_forecasts" ON public.financial_forecasts FOR ALL TO authenticated USING (has_role(auth.uid(), 'functional_head'));
CREATE POLICY "Founders can manage people" ON public.people FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage people" ON public.people FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage growth_config" ON public.growth_config FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage growth_config" ON public.growth_config FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage growth_metrics" ON public.growth_metrics FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage growth_metrics" ON public.growth_metrics FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders can manage growth_experiments" ON public.growth_experiments FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs can manage growth_experiments" ON public.growth_experiments FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders manage product_outcomes" ON public.product_outcomes FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs manage product_outcomes" ON public.product_outcomes FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders manage product_initiatives" ON public.product_initiatives FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs manage product_initiatives" ON public.product_initiatives FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders manage product_features" ON public.product_features FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs manage product_features" ON public.product_features FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
CREATE POLICY "Founders manage tech_health" ON public.tech_health_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'founder'));
CREATE POLICY "MFOs manage tech_health" ON public.tech_health_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'mfo'));
