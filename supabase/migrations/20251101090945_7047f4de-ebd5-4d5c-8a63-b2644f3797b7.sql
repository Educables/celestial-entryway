-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('student', 'ta', 'instructor', 'admin');

-- Create user_roles table (separate from profiles to avoid recursion)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Drop existing problematic policies on profiles
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "TAs and instructors view all profiles" ON public.profiles;

-- Create new policies using the security definer function
-- Users can view their own complete profile (including email)
CREATE POLICY "Users view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- TAs, instructors, and admins can view all profiles
CREATE POLICY "Staff view all profiles"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

-- Users can view their own roles
CREATE POLICY "Users view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all roles
CREATE POLICY "Admins manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));