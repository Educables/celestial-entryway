-- Create profiles and user_roles for all existing users without them
DO $$
DECLARE
  user_record RECORD;
  user_role app_role;
BEGIN
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE id NOT IN (SELECT id FROM public.profiles)
  LOOP
    -- Get role from metadata or default to student
    user_role := COALESCE(
      (user_record.raw_user_meta_data->>'role')::app_role,
      'student'::app_role
    );
    
    -- Validate role
    IF user_role NOT IN ('student', 'instructor') THEN
      user_role := 'student'::app_role;
    END IF;
    
    -- Insert profile
    INSERT INTO public.profiles (id, name, email)
    VALUES (
      user_record.id,
      COALESCE(user_record.raw_user_meta_data->>'name', split_part(user_record.email, '@', 1)),
      user_record.email
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Insert user_role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_record.id, user_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;