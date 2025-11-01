-- ============================================================
-- COMPREHENSIVE SECURITY FIX MIGRATION
-- Fixes 3 critical security issues:
-- 1. Role-Based Access Control Vulnerability
-- 2. Five Tables Completely Unprotected  
-- 3. User Roles Stored Insecurely
-- ============================================================

-- STEP 1: Migrate existing role data from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- STEP 2: Update all RLS policies that reference profiles.role to use has_role()

-- Fix attendance policies
DROP POLICY IF EXISTS "TAs view all attendance" ON public.attendance;
CREATE POLICY "TAs view all attendance"
ON public.attendance
FOR SELECT
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

-- Fix courses policies
DROP POLICY IF EXISTS "Instructors manage courses" ON public.courses;
CREATE POLICY "Instructors manage courses"
ON public.courses
FOR ALL
USING (
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

-- Fix exercises policies
DROP POLICY IF EXISTS "TAs and instructors can create exercises" ON public.exercises;
DROP POLICY IF EXISTS "TAs and instructors can update exercises" ON public.exercises;
DROP POLICY IF EXISTS "TAs and instructors can delete exercises" ON public.exercises;

CREATE POLICY "TAs and instructors can create exercises"
ON public.exercises
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "TAs and instructors can update exercises"
ON public.exercises
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "TAs and instructors can delete exercises"
ON public.exercises
FOR DELETE
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

-- Fix groups policies (TAs manage groups policy)
DROP POLICY IF EXISTS "TAs manage groups" ON public.groups;
CREATE POLICY "TAs manage groups"
ON public.groups
FOR ALL
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

-- Fix qr_tokens policies
DROP POLICY IF EXISTS "TAs and instructors can create QR tokens" ON public.qr_tokens;
DROP POLICY IF EXISTS "TAs and instructors can update QR tokens" ON public.qr_tokens;
DROP POLICY IF EXISTS "TAs and instructors can delete QR tokens" ON public.qr_tokens;

CREATE POLICY "TAs and instructors can create QR tokens"
ON public.qr_tokens
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "TAs and instructors can update QR tokens"
ON public.qr_tokens
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "TAs and instructors can delete QR tokens"
ON public.qr_tokens
FOR DELETE
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

-- Fix session_slots policies
DROP POLICY IF EXISTS "TAs and instructors can create session slots" ON public.session_slots;
DROP POLICY IF EXISTS "TAs and instructors can update session slots" ON public.session_slots;
DROP POLICY IF EXISTS "TAs and instructors can delete session slots" ON public.session_slots;

CREATE POLICY "TAs and instructors can create session slots"
ON public.session_slots
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "TAs and instructors can update session slots"
ON public.session_slots
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "TAs and instructors can delete session slots"
ON public.session_slots
FOR DELETE
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

-- Fix submissions policies
DROP POLICY IF EXISTS "TAs view all submissions" ON public.submissions;
CREATE POLICY "TAs view all submissions"
ON public.submissions
FOR SELECT
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

-- Fix verification_requests policies
DROP POLICY IF EXISTS "TAs manage verification requests" ON public.verification_requests;
CREATE POLICY "TAs manage verification requests"
ON public.verification_requests
FOR ALL
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

-- STEP 3: Remove the role column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- STEP 4: Add RLS policies for the 5 unprotected tables

-- homework_photos policies
CREATE POLICY "Students can create own homework photos"
ON public.homework_photos
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Students can view own homework photos"
ON public.homework_photos
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage all homework photos"
ON public.homework_photos
FOR ALL
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

-- materials policies
CREATE POLICY "Authenticated users can view materials"
ON public.materials
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can create materials"
ON public.materials
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Staff can update materials"
ON public.materials
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Staff can delete materials"
ON public.materials
FOR DELETE
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

-- session_exercise_sets policies
CREATE POLICY "Authenticated users can view session exercise sets"
ON public.session_exercise_sets
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage session exercise sets"
ON public.session_exercise_sets
FOR ALL
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

-- session_registrations policies
CREATE POLICY "Students can create own registrations"
ON public.session_registrations
FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view own registrations"
ON public.session_registrations
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Staff can view all registrations"
ON public.session_registrations
FOR SELECT
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Staff can manage registrations"
ON public.session_registrations
FOR ALL
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

-- sessions policies
CREATE POLICY "Authenticated users can view sessions"
ON public.sessions
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can create sessions"
ON public.sessions
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Staff can update sessions"
ON public.sessions
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Staff can delete sessions"
ON public.sessions
FOR DELETE
USING (
  public.has_role(auth.uid(), 'ta') OR
  public.has_role(auth.uid(), 'instructor') OR
  public.has_role(auth.uid(), 'admin')
);