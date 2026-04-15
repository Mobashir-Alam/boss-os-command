
UPDATE public.profiles SET role = 'founder' WHERE email = 'founder@test.com';
UPDATE public.profiles SET role = 'project_manager' WHERE email = 'pm@test.com';
UPDATE public.user_roles SET role = 'founder' WHERE user_id = 'ecd68ef6-51c9-4536-aab2-fcda97b8d7e8';
UPDATE public.user_roles SET role = 'project_manager' WHERE user_id = 'e85b0868-cc58-4053-a2a0-d4dc099c1c1e';
