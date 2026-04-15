-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('founder', 'mfo', 'functional_head');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role app_role NOT NULL DEFAULT 'mfo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Startup assignments
CREATE TABLE public.startup_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  startup_id TEXT NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, startup_id)
);
ALTER TABLE public.startup_assignments ENABLE ROW LEVEL SECURITY;

-- Team invites
CREATE TABLE public.team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'mfo',
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile and founder role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite_count INT;
  _invite_role app_role;
BEGIN
  SELECT role INTO _invite_role FROM public.team_invites
    WHERE email = NEW.email AND accepted = false
    LIMIT 1;

  IF _invite_role IS NULL THEN
    SELECT COUNT(*) INTO _invite_count FROM public.profiles;
    IF _invite_count = 0 THEN
      _invite_role := 'founder';
    ELSE
      _invite_role := 'mfo';
    END IF;
  ELSE
    UPDATE public.team_invites SET accepted = true WHERE email = NEW.email AND accepted = false;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    _invite_role
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _invite_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Users can view own assignments" ON public.startup_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Founders can view all assignments" ON public.startup_assignments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders can manage assignments" ON public.startup_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders can manage invites" ON public.team_invites FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Users can view own invites" ON public.team_invites FOR SELECT TO authenticated USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));