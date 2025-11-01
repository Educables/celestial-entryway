-- Update kifmat@gmail.com to instructor role
UPDATE public.user_roles
SET role = 'instructor'::app_role
WHERE user_id = '74744be4-2c7e-4d98-9f46-130b3e9ce0bb';