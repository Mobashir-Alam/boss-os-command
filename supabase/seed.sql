-- Demo seed: Nasheedio CEO operating flow
-- Source: "Ceo Web App Dummy Data - Nasheedio.pdf"
-- This seed is intentionally idempotent for the fixed demo rows below.

DO $$
DECLARE
  nasheedio_id uuid;

  aisha_id uuid := '10000000-0000-4000-8000-000000000001';
  arjun_id uuid := '10000000-0000-4000-8000-000000000009';
  meenal_id uuid := '10000000-0000-4000-8000-000000000019';
BEGIN
  INSERT INTO public.startups (
    slug,
    name,
    status,
    runway,
    growth,
    growth_direction,
    insight,
    insight_detail,
    insight_trend,
    insight_last_updated,
    spark_data,
    detected_ago,
    last_updated
  )
  VALUES (
    'nasheedio',
    'Nasheedio',
    'healthy',
    '14 months',
    '+34%',
    'up',
    'Strong creator media engine with 92M monthly reach; next focus is recurring retainers and editing speed.',
    'Nasheedio is a Delhi-based media, content, and creator economy company with 68 employees, INR 8.4 Cr annual revenue, INR 41 L monthly burn, and a latest seed round of INR 6 Cr at INR 38 Cr valuation.',
    'Monthly video views and active brand clients are strong; operational focus is now studio capacity, recurring retainers, and production turnaround.',
    'Updated from Nasheedio demo seed',
    '[62,68,71,76,82,88,92]'::jsonb,
    'Current cycle',
    'Today'
  )
  ON CONFLICT (slug) DO UPDATE
  SET
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    runway = EXCLUDED.runway,
    growth = EXCLUDED.growth,
    growth_direction = EXCLUDED.growth_direction,
    insight = EXCLUDED.insight,
    insight_detail = EXCLUDED.insight_detail,
    insight_trend = EXCLUDED.insight_trend,
    insight_last_updated = EXCLUDED.insight_last_updated,
    spark_data = EXCLUDED.spark_data,
    detected_ago = EXCLUDED.detected_ago,
    last_updated = EXCLUDED.last_updated,
    updated_at = now()
  RETURNING id INTO nasheedio_id;

  WITH employee_seed (
    id,
    full_name,
    role,
    department,
    salary,
    kpi_score,
    productivity_score,
    weekly_output_score,
    tasks_assigned,
    tasks_completed
  ) AS (
    VALUES
      (aisha_id, 'Aisha Khan', 'Head of Social Media', 'Social Media', 122000, 91, 88, 90, 12, 11),
      ('10000000-0000-4000-8000-000000000002'::uuid, 'Rohan Mehta', 'Campaign Manager', 'Social Media', 72000, 84, 82, 83, 10, 8),
      ('10000000-0000-4000-8000-000000000003'::uuid, 'Simran Arora', 'Community Lead', 'Social Media', 58000, 87, 84, 86, 9, 8),
      ('10000000-0000-4000-8000-000000000004'::uuid, 'Dev Sharma', 'Performance Marketer', 'Social Media', 61000, 82, 79, 80, 11, 9),
      ('10000000-0000-4000-8000-000000000005'::uuid, 'Tanya Jain', 'Copywriter', 'Social Media', 48000, 78, 76, 77, 8, 7),
      ('10000000-0000-4000-8000-000000000006'::uuid, 'Karan Gupta', 'Analyst', 'Social Media', 44000, 80, 78, 79, 7, 6),
      ('10000000-0000-4000-8000-000000000007'::uuid, 'Priyal Singh', 'Content Planner', 'Social Media', 42000, 81, 79, 80, 8, 7),
      ('10000000-0000-4000-8000-000000000008'::uuid, 'Nitin Yadav', 'Coordinator', 'Social Media', 38000, 75, 73, 74, 6, 5),
      (arjun_id, 'Arjun Verma', 'Creative Director', 'Video Production / Editing', 165000, 89, 84, 86, 14, 12),
      ('10000000-0000-4000-8000-000000000010'::uuid, 'Sameer Bedi', 'Producer', 'Video Production / Editing', 128000, 86, 81, 82, 12, 10),
      ('10000000-0000-4000-8000-000000000011'::uuid, 'Isha Kapoor', 'Senior Editor', 'Video Production / Editing', 82000, 84, 80, 81, 11, 9),
      ('10000000-0000-4000-8000-000000000012'::uuid, 'Neha Rao', 'Motion Editor', 'Video Production / Editing', 74000, 81, 78, 79, 10, 8),
      ('10000000-0000-4000-8000-000000000013'::uuid, 'Manav Sethi', 'Videographer', 'Video Production / Editing', 68000, 80, 77, 78, 9, 7),
      ('10000000-0000-4000-8000-000000000014'::uuid, 'Kabir Nanda', 'Camera Lead', 'Video Production / Editing', 66000, 82, 79, 80, 9, 8),
      ('10000000-0000-4000-8000-000000000015'::uuid, 'Yash Dua', 'Sound Tech', 'Video Production / Editing', 54000, 77, 75, 76, 8, 7),
      ('10000000-0000-4000-8000-000000000016'::uuid, 'Ritu Malhotra', 'Editor', 'Video Production / Editing', 52000, 79, 76, 77, 9, 7),
      ('10000000-0000-4000-8000-000000000017'::uuid, 'Raghav Jain', 'Assistant Editor', 'Video Production / Editing', 41000, 74, 72, 73, 7, 5),
      ('10000000-0000-4000-8000-000000000018'::uuid, 'Vansh Goyal', 'Runner', 'Video Production / Editing', 28000, 70, 68, 69, 6, 5),
      (meenal_id, 'Meenal Arora', 'Content Lead', 'Content Management', 98000, 88, 85, 86, 12, 11),
      ('10000000-0000-4000-8000-000000000020'::uuid, 'Aditya Sharma', 'Scheduler', 'Content Management', 46000, 80, 78, 79, 8, 7),
      ('10000000-0000-4000-8000-000000000021'::uuid, 'Sana Mirza', 'QA Manager', 'Content Management', 58000, 83, 81, 82, 9, 8),
      ('10000000-0000-4000-8000-000000000022'::uuid, 'Ritesh Jain', 'CMS Executive', 'Content Management', 44000, 78, 76, 77, 8, 7),
      ('10000000-0000-4000-8000-000000000023'::uuid, 'Tisha Bansal', 'Metadata Executive', 'Content Management', 39000, 76, 74, 75, 7, 6),
      ('10000000-0000-4000-8000-000000000024'::uuid, 'Danish Khan', 'Content Ops', 'Content Management', 43000, 79, 77, 78, 8, 7),
      ('10000000-0000-4000-8000-000000000025'::uuid, 'Pooja Gupta', 'Coordinator', 'Content Management', 37000, 75, 73, 74, 6, 5),
      ('10000000-0000-4000-8000-000000000026'::uuid, 'Tech Lead Sample', 'Tech Lead', 'Tech', 195000, 90, 86, 88, 13, 11),
      ('10000000-0000-4000-8000-000000000027'::uuid, 'Software Engineer Sample', 'Software Engineer', 'Tech', 92000, 84, 81, 82, 10, 9)
  )
  INSERT INTO public.people (
    id,
    full_name,
    role,
    department,
    linked_startups,
    employment_type,
    salary,
    cost_to_company,
    joining_date,
    status,
    kpi_score,
    productivity_score,
    weekly_output_score,
    hours_committed,
    hours_delivered,
    tasks_assigned,
    tasks_completed
  )
  SELECT
    id,
    full_name,
    role,
    department,
    ARRAY['nasheedio', nasheedio_id::text],
    'full_time',
    salary,
    salary,
    DATE '2024-01-15',
    'active',
    kpi_score,
    productivity_score,
    weekly_output_score,
    40,
    38,
    tasks_assigned,
    tasks_completed
  FROM employee_seed
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    linked_startups = EXCLUDED.linked_startups,
    salary = EXCLUDED.salary,
    cost_to_company = EXCLUDED.cost_to_company,
    status = EXCLUDED.status,
    kpi_score = EXCLUDED.kpi_score,
    productivity_score = EXCLUDED.productivity_score,
    weekly_output_score = EXCLUDED.weekly_output_score,
    hours_committed = EXCLUDED.hours_committed,
    hours_delivered = EXCLUDED.hours_delivered,
    tasks_assigned = EXCLUDED.tasks_assigned,
    tasks_completed = EXCLUDED.tasks_completed,
    updated_at = now();

  WITH department_seed (
    department_key,
    name,
    status,
    headcount,
    lead_person_id,
    summary
  ) AS (
    VALUES
      ('social_media', 'Social Media', 'good', 8, aisha_id, 'Brand growth and campaign execution are healthy; monthly reach is 92M impressions. Budget: INR 4.2 L/month.'),
      ('video_production_editing', 'Video Production / Editing', 'watch', 10, arjun_id, 'Shoots and editing remain a major operating layer; turnaround time is the main watch item. Budget: INR 7.8 L/month.'),
      ('content_management', 'Content Management', 'good', 7, meenal_id, 'Publishing calendar, metadata, QA, and content operations are stable. Budget: INR 3.9 L/month.'),
      ('studio', 'Studio Dept.', 'watch', 6, NULL::uuid, 'Studio equipment and booking capacity need expansion to support demand. Budget: INR 5.5 L/month.'),
      ('tech', 'Tech', 'good', 9, '10000000-0000-4000-8000-000000000026'::uuid, 'Internal tools and web systems support creator analytics and operating workflows. Budget: INR 9.5 L/month.'),
      ('creators_brands_outreach', 'Creators / Brands Outreach', 'watch', 8, NULL::uuid, 'Partnerships are active with 27 brand clients; recurring retainers are the next commercial lever. Budget: INR 6.1 L/month.'),
      ('hr', 'HR', 'good', 5, NULL::uuid, 'Hiring, payroll, and retention are steady; employee retention is 89%. Budget: INR 2.8 L/month.'),
      ('graphic_designing', 'Graphic Designing', 'watch', 7, NULL::uuid, 'Creative output supports campaigns and production, with coordination pressure around studio and social deadlines. Budget: INR 4.4 L/month.'),
      ('office_management', 'Office Management', 'good', 8, NULL::uuid, 'Admin, office operations, vendor coordination, and operating records are in motion. Budget: INR 3.6 L/month.')
  )
  INSERT INTO public.startup_departments (
    startup_id,
    department_key,
    name,
    status,
    headcount,
    lead_person_id,
    summary
  )
  SELECT
    nasheedio_id,
    department_key,
    name,
    status,
    headcount,
    lead_person_id,
    summary
  FROM department_seed
  ON CONFLICT (startup_id, department_key) DO UPDATE
  SET
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    headcount = EXCLUDED.headcount,
    lead_person_id = EXCLUDED.lead_person_id,
    summary = EXCLUDED.summary,
    updated_at = now();

  WITH update_seed (
    id,
    department_key,
    summary,
    update_date,
    wins,
    blockers,
    risks,
    asks,
    owner_person_id
  ) AS (
    VALUES
      (
        '30000000-0000-4000-8000-000000000001'::uuid,
        'social_media',
        'Social reach is strong at 92M monthly impressions, with campaigns continuing to support brand growth.',
        DATE '2026-04-20',
        ARRAY['92M monthly impressions', 'Campaign rhythm is stable', 'Community and planning roles are staffed']::text[],
        ARRAY[]::text[],
        ARRAY['Keep campaign quality high while production volume increases']::text[],
        ARRAY['Review next 30-day content calendar with founder']::text[],
        aisha_id
      ),
      (
        '30000000-0000-4000-8000-000000000002'::uuid,
        'video_production_editing',
        'Video production is generating 38M monthly views, but editing turnaround is now a founder-level operating lever.',
        DATE '2026-04-20',
        ARRAY['38M monthly video views', 'Creative director, producer, and editing bench are in place']::text[],
        ARRAY['Editing turnaround time needs reduction', 'Studio capacity expansion affects shoot velocity']::text[],
        ARRAY['Backlog can pressure social and brand delivery dates']::text[],
        ARRAY['Approve the editing turnaround improvement plan']::text[],
        arjun_id
      ),
      (
        '30000000-0000-4000-8000-000000000003'::uuid,
        'content_management',
        'Publishing calendar and QA workflow are stable enough to support current campaign volume.',
        DATE '2026-04-20',
        ARRAY['Publishing calendar is staffed', 'QA and metadata ownership are clear']::text[],
        ARRAY[]::text[],
        ARRAY['Volume increase may require better automation in scheduling']::text[],
        ARRAY['Connect content calendar reporting into KAI next']::text[],
        meenal_id
      ),
      (
        '30000000-0000-4000-8000-000000000004'::uuid,
        'creators_brands_outreach',
        '27 active brand clients are live; the next CEO lever is increasing recurring brand retainers.',
        DATE '2026-04-20',
        ARRAY['27 active brand clients', 'Average campaign margin is 34%']::text[],
        ARRAY['Recurring retainer base needs expansion']::text[],
        ARRAY['One-off campaign dependency can make revenue less predictable']::text[],
        ARRAY['Review brand account list for retainer conversion targets']::text[],
        NULL::uuid
      )
  )
  INSERT INTO public.department_updates (
    id,
    startup_id,
    department_key,
    summary,
    update_date,
    wins,
    blockers,
    risks,
    asks,
    owner_person_id
  )
  SELECT
    id,
    nasheedio_id,
    department_key,
    summary,
    update_date,
    wins,
    blockers,
    risks,
    asks,
    owner_person_id
  FROM update_seed
  ON CONFLICT (id) DO UPDATE
  SET
    startup_id = EXCLUDED.startup_id,
    department_key = EXCLUDED.department_key,
    summary = EXCLUDED.summary,
    update_date = EXCLUDED.update_date,
    wins = EXCLUDED.wins,
    blockers = EXCLUDED.blockers,
    risks = EXCLUDED.risks,
    asks = EXCLUDED.asks,
    owner_person_id = EXCLUDED.owner_person_id,
    updated_at = now();

  WITH burn_seed (id, category_name, monthly_amount, trend, notes) AS (
    VALUES
      ('40000000-0000-4000-8000-000000000001'::uuid, 'People and payroll', 2500000, 'stable', 'Payroll pressure from 68 employees and leadership roles.'),
      ('40000000-0000-4000-8000-000000000002'::uuid, 'Production and studio operations', 750000, 'up', 'Shoots, editing, equipment, bookings, and production support.'),
      ('40000000-0000-4000-8000-000000000003'::uuid, 'Tech and tools', 450000, 'stable', 'Internal tools, web systems, SaaS, and analytics infrastructure.'),
      ('40000000-0000-4000-8000-000000000004'::uuid, 'Office and administration', 400000, 'stable', 'Office management, vendor support, admin operations, and records.')
  )
  INSERT INTO public.burn_categories (id, startup_id, category_name, monthly_amount, trend, notes)
  SELECT id, nasheedio_id, category_name, monthly_amount, trend, notes
  FROM burn_seed
  ON CONFLICT (id) DO UPDATE
  SET
    startup_id = EXCLUDED.startup_id,
    category_name = EXCLUDED.category_name,
    monthly_amount = EXCLUDED.monthly_amount,
    trend = EXCLUDED.trend,
    notes = EXCLUDED.notes,
    updated_at = now();

  INSERT INTO public.financial_entries (
    id,
    startup_id,
    entry_type,
    category,
    description,
    amount,
    currency,
    entry_date,
    recurring
  )
  VALUES
    ('41000000-0000-4000-8000-000000000001'::uuid, nasheedio_id, 'revenue', 'brand_revenue', 'Monthly run-rate derived from INR 8.4 Cr annual revenue', 7000000, 'INR', DATE '2026-04-01', true),
    ('41000000-0000-4000-8000-000000000002'::uuid, nasheedio_id, 'expense', 'monthly_burn', 'Monthly burn from Nasheedio demo profile', 4100000, 'INR', DATE '2026-04-01', true)
  ON CONFLICT (id) DO UPDATE
  SET
    startup_id = EXCLUDED.startup_id,
    entry_type = EXCLUDED.entry_type,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    amount = EXCLUDED.amount,
    currency = EXCLUDED.currency,
    entry_date = EXCLUDED.entry_date,
    recurring = EXCLUDED.recurring,
    updated_at = now();

  INSERT INTO public.cash_flow_entries (
    id,
    startup_id,
    flow_type,
    source,
    amount,
    entry_date,
    notes
  )
  VALUES
    ('42000000-0000-4000-8000-000000000001'::uuid, nasheedio_id, 'inflow', 'Brand and creator campaign revenue', 7000000, DATE '2026-04-01', 'Monthly revenue run-rate from annual revenue INR 8.4 Cr.'),
    ('42000000-0000-4000-8000-000000000002'::uuid, nasheedio_id, 'outflow', 'Operating burn', 4100000, DATE '2026-04-01', 'Monthly burn from company profile.')
  ON CONFLICT (id) DO UPDATE
  SET
    startup_id = EXCLUDED.startup_id,
    flow_type = EXCLUDED.flow_type,
    source = EXCLUDED.source,
    amount = EXCLUDED.amount,
    entry_date = EXCLUDED.entry_date,
    notes = EXCLUDED.notes,
    updated_at = now();

  INSERT INTO public.financial_forecasts (
    id,
    startup_id,
    forecast_month,
    projected_revenue,
    projected_expenses,
    projected_runway_months,
    assumptions
  )
  VALUES (
    '43000000-0000-4000-8000-000000000001'::uuid,
    nasheedio_id,
    DATE '2026-04-01',
    7000000,
    4100000,
    14,
    'Based on annual revenue INR 8.4 Cr, monthly burn INR 41 L, and current runway of 14 months from demo data.'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    startup_id = EXCLUDED.startup_id,
    forecast_month = EXCLUDED.forecast_month,
    projected_revenue = EXCLUDED.projected_revenue,
    projected_expenses = EXCLUDED.projected_expenses,
    projected_runway_months = EXCLUDED.projected_runway_months,
    assumptions = EXCLUDED.assumptions,
    updated_at = now();

  WITH stakeholder_seed (id, name, role, equity_pct, equity_type, voting_pct, notes) AS (
    VALUES
      ('50000000-0000-4000-8000-000000000001'::uuid, 'Founder and CEO', 'founder', 60, 'common', 60, 'Founder ownership from Nasheedio cap table.'),
      ('50000000-0000-4000-8000-000000000002'::uuid, 'Investor A', 'investor', 15, 'preferred', 15, 'Investor A ownership from demo cap table.'),
      ('50000000-0000-4000-8000-000000000003'::uuid, 'Investor B', 'investor', 15, 'preferred', 15, 'Investor B ownership from demo cap table.'),
      ('50000000-0000-4000-8000-000000000004'::uuid, 'ESOP / Future Pool / Unallocated', 'pool', 10, 'pool', 10, 'Future pool and unallocated ownership from demo cap table.')
  )
  INSERT INTO public.stakeholders (
    id,
    startup_id,
    name,
    role,
    equity_pct,
    equity_type,
    voting_pct,
    notes
  )
  SELECT id, nasheedio_id, name, role, equity_pct, equity_type, voting_pct, notes
  FROM stakeholder_seed
  ON CONFLICT (id) DO UPDATE
  SET
    startup_id = EXCLUDED.startup_id,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    equity_pct = EXCLUDED.equity_pct,
    equity_type = EXCLUDED.equity_type,
    voting_pct = EXCLUDED.voting_pct,
    notes = EXCLUDED.notes,
    updated_at = now();

  INSERT INTO public.funding_rounds (
    id,
    startup_id,
    round_name,
    valuation,
    raise_amount,
    is_simulated,
    round_order,
    notes
  )
  VALUES
    ('60000000-0000-4000-8000-000000000001'::uuid, nasheedio_id, 'Pre-seed', NULL, 15000000, false, 1, 'Closed Jan 2022 for INR 1.5 Cr.'),
    ('60000000-0000-4000-8000-000000000002'::uuid, nasheedio_id, 'Seed', 380000000, 60000000, false, 2, 'Closed Aug 2024 for INR 6 Cr at INR 38 Cr valuation.')
  ON CONFLICT (id) DO UPDATE
  SET
    startup_id = EXCLUDED.startup_id,
    round_name = EXCLUDED.round_name,
    valuation = EXCLUDED.valuation,
    raise_amount = EXCLUDED.raise_amount,
    is_simulated = EXCLUDED.is_simulated,
    round_order = EXCLUDED.round_order,
    notes = EXCLUDED.notes,
    updated_at = now();

  INSERT INTO public.startup_documents (
    id,
    startup_id,
    file_name,
    file_url,
    doc_type,
    category,
    department,
    document_date,
    title,
    mime_type,
    size_bytes
  )
  VALUES
    ('70000000-0000-4000-8000-000000000001'::uuid, nasheedio_id, 'nasheedio-monthly-burn-apr-2026.pdf', 'https://example.com/demo/nasheedio/monthly-burn-apr-2026.pdf', 'financials', 'finance', 'office_management', DATE '2026-04-01', 'Monthly burn statement - Apr 2026', 'application/pdf', 0),
    ('70000000-0000-4000-8000-000000000002'::uuid, nasheedio_id, 'nasheedio-brand-client-invoices-apr-2026.pdf', 'https://example.com/demo/nasheedio/brand-client-invoices-apr-2026.pdf', 'financials', 'finance', 'creators_brands_outreach', DATE '2026-04-01', 'Brand client invoices - Apr 2026', 'application/pdf', 0),
    ('70000000-0000-4000-8000-000000000003'::uuid, nasheedio_id, 'nasheedio-studio-equipment-purchase.pdf', 'https://example.com/demo/nasheedio/studio-equipment-purchase.pdf', 'financials', 'finance', 'studio', DATE '2026-03-25', 'Studio equipment purchase bill', 'application/pdf', 0),
    ('70000000-0000-4000-8000-000000000004'::uuid, nasheedio_id, 'nasheedio-rental-bill-apr-2026.pdf', 'https://example.com/demo/nasheedio/rental-bill-apr-2026.pdf', 'other', 'operations', 'office_management', DATE '2026-04-01', 'Office rental bill - Apr 2026', 'application/pdf', 0),
    ('70000000-0000-4000-8000-000000000005'::uuid, nasheedio_id, 'nasheedio-seed-round-summary.pdf', 'https://example.com/demo/nasheedio/seed-round-summary.pdf', 'legal', 'legal', NULL, DATE '2024-08-15', 'Seed round summary', 'application/pdf', 0),
    ('70000000-0000-4000-8000-000000000006'::uuid, nasheedio_id, 'nasheedio-payroll-apr-2026.xlsx', 'https://example.com/demo/nasheedio/payroll-apr-2026.xlsx', 'other', 'hr', 'hr', DATE '2026-04-01', 'Payroll sheet - Apr 2026', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 0),
    ('70000000-0000-4000-8000-000000000007'::uuid, nasheedio_id, 'nasheedio-company-records.pdf', 'https://example.com/demo/nasheedio/company-records.pdf', 'pitch-deck', 'company_record', NULL, DATE '2026-04-20', 'Company records packet', 'application/pdf', 0)
  ON CONFLICT (id) DO UPDATE
  SET
    startup_id = EXCLUDED.startup_id,
    file_name = EXCLUDED.file_name,
    file_url = EXCLUDED.file_url,
    doc_type = EXCLUDED.doc_type,
    category = EXCLUDED.category,
    department = EXCLUDED.department,
    document_date = EXCLUDED.document_date,
    title = EXCLUDED.title,
    mime_type = EXCLUDED.mime_type,
    size_bytes = EXCLUDED.size_bytes;

  DELETE FROM public.priorities
  WHERE startup_id = 'nasheedio';

  INSERT INTO public.priorities (
    id,
    startup_id,
    startup_name,
    tag,
    severity,
    problem,
    why,
    impact,
    impact_level,
    owner,
    mfo_suggestion,
    mfo_confidence,
    rank,
    detected_ago,
    deadline_in,
    execution_status
  )
  VALUES
    ('80000000-0000-4000-8000-000000000001'::uuid, 'nasheedio', 'Nasheedio', 'Creator Analytics', 'monitor', 'Launch creator analytics SaaS', 'Nasheedio already has creator, campaign, and content operations data that can become a SaaS product.', 'Creates a recurring product layer beyond services and campaigns.', 'High', 'Tech Lead Sample', 'Ship a founder-reviewed MVP scope before adding more features.', 'High', 1, 'Current cycle', '30 days', 'in-progress'),
    ('80000000-0000-4000-8000-000000000002'::uuid, 'nasheedio', 'Nasheedio', 'Studio Capacity', 'at-risk', 'Expand studio capacity', 'Production demand and editing pressure are increasing.', 'Unlocks more shoot volume and reduces delivery bottlenecks.', 'Medium', 'Arjun Verma', 'Approve capacity plan and equipment purchase priority.', 'Medium', 2, 'Current cycle', '21 days', 'pending'),
    ('80000000-0000-4000-8000-000000000003'::uuid, 'nasheedio', 'Nasheedio', 'Revenue Quality', 'monitor', 'Increase recurring brand retainers', '27 active brand clients can be converted into more predictable retainers.', 'Improves revenue quality and forecasting confidence.', 'High', 'Creators / Brands Outreach', 'Create retainer conversion targets for the top active brand accounts.', 'High', 3, 'Current cycle', '14 days', 'pending'),
    ('80000000-0000-4000-8000-000000000004'::uuid, 'nasheedio', 'Nasheedio', 'Production Speed', 'at-risk', 'Reduce editing turnaround time', 'Editing is the main operating bottleneck visible in the production layer.', 'Improves campaign delivery speed and protects client satisfaction.', 'Medium', 'Isha Kapoor', 'Track turnaround time weekly and isolate revision bottlenecks.', 'Medium', 4, 'Current cycle', '10 days', 'in-progress');

  DELETE FROM public.tasks
  WHERE linked_startup_id = 'nasheedio';

  INSERT INTO public.tasks (
    id,
    title,
    linked_issue_id,
    linked_startup_id,
    assignee,
    status,
    deadline,
    instructions
  )
  VALUES
    ('90000000-0000-4000-8000-000000000001'::uuid, 'Define creator analytics SaaS MVP', '80000000-0000-4000-8000-000000000001', 'nasheedio', 'Tech Lead Sample', 'in-progress', 'May 15, 2026', 'Convert creator analytics idea into a narrow MVP scope for founder review.'),
    ('90000000-0000-4000-8000-000000000002'::uuid, 'Draft studio capacity expansion plan', '80000000-0000-4000-8000-000000000002', 'nasheedio', 'Arjun Verma', 'pending', 'May 8, 2026', 'List space, equipment, staffing, and budget needs for studio capacity expansion.'),
    ('90000000-0000-4000-8000-000000000003'::uuid, 'Build retainer conversion list', '80000000-0000-4000-8000-000000000003', 'nasheedio', 'Creators / Brands Outreach', 'pending', 'May 1, 2026', 'Identify the top brand accounts most likely to convert into recurring retainers.'),
    ('90000000-0000-4000-8000-000000000004'::uuid, 'Measure editing turnaround baseline', '80000000-0000-4000-8000-000000000004', 'nasheedio', 'Isha Kapoor', 'in-progress', 'Apr 30, 2026', 'Capture current edit cycle time, revision count, and handoff delay for the last 20 videos.');

  INSERT INTO public.startup_milestones (id, startup_id, title, description, deadline, status)
  VALUES
    ('a0000000-0000-4000-8000-000000000001'::uuid, nasheedio_id, 'Creator analytics SaaS MVP scoped', 'Founder-reviewed MVP scope for creator analytics product.', DATE '2026-05-15', 'in-progress'),
    ('a0000000-0000-4000-8000-000000000002'::uuid, nasheedio_id, 'Studio capacity plan approved', 'Capacity plan covering equipment, booking slots, staffing, and operating budget.', DATE '2026-05-08', 'pending'),
    ('a0000000-0000-4000-8000-000000000003'::uuid, nasheedio_id, 'Brand retainer conversion plan ready', 'Top brand clients mapped to retainer conversion plan.', DATE '2026-05-01', 'pending')
  ON CONFLICT (id) DO UPDATE
  SET
    startup_id = EXCLUDED.startup_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    deadline = EXCLUDED.deadline,
    status = EXCLUDED.status;

  INSERT INTO public.startup_notes (id, startup_id, content)
  VALUES
    ('b0000000-0000-4000-8000-000000000001'::uuid, nasheedio_id, 'Nasheedio demo profile: Delhi media/content/creator economy company, 68 employees, INR 8.4 Cr annual revenue, INR 41 L monthly burn, 14 months runway.'),
    ('b0000000-0000-4000-8000-000000000002'::uuid, nasheedio_id, 'Founder priorities: creator analytics SaaS, studio capacity expansion, recurring brand retainers, and lower editing turnaround time.')
  ON CONFLICT (id) DO UPDATE
  SET
    startup_id = EXCLUDED.startup_id,
    content = EXCLUDED.content;

  INSERT INTO public.kai_memories (id, startup_id, memory, category)
  VALUES
    ('c0000000-0000-4000-8000-000000000001'::uuid, nasheedio_id, 'Nasheedio has 92M monthly impressions, 38M monthly video views, 27 active brand clients, 34% average campaign margin, and 89% employee retention.', 'company_context'),
    ('c0000000-0000-4000-8000-000000000002'::uuid, nasheedio_id, 'KAI should treat recurring brand retainers and editing turnaround as the strongest near-term CEO levers for Nasheedio.', 'kai_guidance')
  ON CONFLICT (id) DO UPDATE
  SET
    startup_id = EXCLUDED.startup_id,
    memory = EXCLUDED.memory,
    category = EXCLUDED.category;
END $$;
