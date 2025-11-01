-- Add course_id to user_roles for course-specific role assignments
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_roles_course_id ON public.user_roles(course_id);

-- Drop the old unique constraint and create new one
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Add unique constraint to prevent duplicate role assignments per course
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_course_unique 
ON public.user_roles(user_id, role, COALESCE(course_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Update handle_new_user function to support admin auto-assignment with 4-account limit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  admin_count integer;
BEGIN
  -- Check if email starts with "admin" and count existing admins
  IF NEW.email ILIKE 'admin%' THEN
    SELECT COUNT(*) INTO admin_count
    FROM public.user_roles
    WHERE role = 'admin'::app_role;
    
    -- Only assign admin role if less than 4 admins exist
    IF admin_count < 4 THEN
      user_role := 'admin'::app_role;
    ELSE
      user_role := 'student'::app_role;
    END IF;
  ELSE
    -- Default to student for all other users
    user_role := 'student'::app_role;
  END IF;
  
  -- Create profile for new user
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  
  -- Assign the role (course_id is NULL for admin and student roles)
  INSERT INTO public.user_roles (user_id, role, course_id)
  VALUES (NEW.id, user_role, NULL);
  
  RETURN NEW;
END;
$function$;

-- Create function to check role for specific course
CREATE OR REPLACE FUNCTION public.has_role_for_course(_user_id uuid, _role app_role, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (course_id = _course_id OR course_id IS NULL)
  )
$function$;