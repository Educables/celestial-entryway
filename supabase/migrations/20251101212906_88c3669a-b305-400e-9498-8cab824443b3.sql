-- Update handle_new_user to use "admin" prefix instead of "boss"
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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