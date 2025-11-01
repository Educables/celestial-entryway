-- Drop all unused tables
-- These tables are not currently being used in the application

-- Drop tables in order to avoid foreign key constraint issues
DROP TABLE IF EXISTS public.homework_photos CASCADE;
DROP TABLE IF EXISTS public.materials CASCADE;
DROP TABLE IF EXISTS public.session_exercise_sets CASCADE;
DROP TABLE IF EXISTS public.session_registrations CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.qr_tokens CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.exercises CASCADE;
DROP TABLE IF EXISTS public.exercise_sets CASCADE;
DROP TABLE IF EXISTS public.session_slots CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.verification_requests CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;

-- Keep only:
-- public.profiles (used for user information)
-- public.user_roles (used for role-based access control)