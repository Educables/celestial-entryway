-- Fix missing role for existing student user
INSERT INTO public.user_roles (user_id, role, course_id)
SELECT '6aa189fb-d749-43c8-98a7-747c5721c410', 'student'::app_role, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '6aa189fb-d749-43c8-98a7-747c5721c410'
);