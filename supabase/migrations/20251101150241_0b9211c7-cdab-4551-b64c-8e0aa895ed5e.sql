-- Update the handle_new_user function to set admin role for specific email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
BEGIN
  -- Check if this is the admin email
  IF NEW.email = 'matusalakiflom@gmail.com' THEN
    user_role := 'admin'::app_role;
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
  
  -- Assign the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$function$;