-- Fix 1: Secure profiles table - Remove broad staff policy, create secure function
DROP POLICY IF EXISTS "Staff view all profiles" ON public.profiles;

-- Create a secure function that staff can use to get user info when needed
CREATE OR REPLACE FUNCTION public.get_user_profile(_user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  role text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow staff to call this function
  SELECT p.id, p.name, p.email, p.role, p.created_at
  FROM profiles p
  WHERE p.id = _user_id
    AND (
      public.has_role(auth.uid(), 'ta') OR
      public.has_role(auth.uid(), 'instructor') OR
      public.has_role(auth.uid(), 'admin')
    );
$$;

-- Fix 2: Add RLS policies for exercise_sets table
CREATE POLICY "Authenticated users can view exercise sets"
ON public.exercise_sets
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can create exercise sets"
ON public.exercise_sets
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Staff can update exercise sets"
ON public.exercise_sets
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Staff can delete exercise sets"
ON public.exercise_sets
FOR DELETE
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

-- Fix 3: Restrict groups table visibility
DROP POLICY IF EXISTS "Anyone authenticated can view groups" ON public.groups;

-- Students can only view groups they are part of
CREATE POLICY "Students view own groups"
ON public.groups
FOR SELECT
USING (auth.uid() = student_id);

-- Staff can view all groups
CREATE POLICY "Staff view all groups"
ON public.groups
FOR SELECT
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);