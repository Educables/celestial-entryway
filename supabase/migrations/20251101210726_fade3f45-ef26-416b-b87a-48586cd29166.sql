-- Update RLS policies to properly distinguish between instructor and TA permissions

-- ============================================
-- COURSES TABLE: Only instructors and admins can create/modify courses
-- ============================================

-- Drop existing policies that allow TAs to create courses
DROP POLICY IF EXISTS "Instructors create courses" ON public.courses;

-- Recreate with proper permissions (no TA access)
CREATE POLICY "Instructors create courses"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = instructor_id 
  AND (
    has_role(auth.uid(), 'instructor'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- TAs should be able to view courses they're assigned to
DROP POLICY IF EXISTS "TAs view assigned courses" ON public.courses;
CREATE POLICY "TAs view assigned courses"
ON public.courses
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'ta'::app_role)
  AND has_role_for_course(auth.uid(), 'ta'::app_role, id)
);

-- ============================================
-- SESSIONS TABLE: Only instructors can create/modify sessions, TAs can view
-- ============================================

-- Ensure only instructors (not TAs) can create sessions
DROP POLICY IF EXISTS "Create sessions for own courses" ON public.sessions;
CREATE POLICY "Create sessions for own courses"
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = sessions.course_id
    AND courses.instructor_id = auth.uid()
    AND (
      has_role(auth.uid(), 'instructor'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Ensure only instructors (not TAs) can update sessions
DROP POLICY IF EXISTS "Update sessions for own courses" ON public.sessions;
CREATE POLICY "Update sessions for own courses"
ON public.sessions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = sessions.course_id
    AND (
      courses.instructor_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
    )
    AND (
      has_role(auth.uid(), 'instructor'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Ensure only instructors (not TAs) can delete sessions
DROP POLICY IF EXISTS "Delete sessions for own courses" ON public.sessions;
CREATE POLICY "Delete sessions for own courses"
ON public.sessions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = sessions.course_id
    AND (
      courses.instructor_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
    )
    AND (
      has_role(auth.uid(), 'instructor'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- TAs can view sessions for courses they're assigned to
DROP POLICY IF EXISTS "TAs view assigned course sessions" ON public.sessions;
CREATE POLICY "TAs view assigned course sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'ta'::app_role)
  AND EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = sessions.course_id
    AND has_role_for_course(auth.uid(), 'ta'::app_role, courses.id)
  )
);

-- ============================================
-- TASKS TABLE: Both instructors and TAs can create/manage tasks
-- ============================================

DROP POLICY IF EXISTS "Instructors create tasks for their sessions" ON public.tasks;
CREATE POLICY "Instructors and TAs create tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.id = tasks.session_id
    AND (
      (c.instructor_id = auth.uid() AND has_role(auth.uid(), 'instructor'::app_role))
      OR has_role_for_course(auth.uid(), 'ta'::app_role, c.id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

DROP POLICY IF EXISTS "Instructors update/delete their tasks" ON public.tasks;
CREATE POLICY "Instructors and TAs manage tasks"
ON public.tasks
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.id = tasks.session_id
    AND (
      (c.instructor_id = auth.uid() AND has_role(auth.uid(), 'instructor'::app_role))
      OR has_role_for_course(auth.uid(), 'ta'::app_role, c.id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

DROP POLICY IF EXISTS "Instructors view tasks for their sessions" ON public.tasks;
CREATE POLICY "Instructors and TAs view tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.id = tasks.session_id
    AND (
      (c.instructor_id = auth.uid() AND has_role(auth.uid(), 'instructor'::app_role))
      OR has_role_for_course(auth.uid(), 'ta'::app_role, c.id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- ============================================
-- TASK SUBMISSIONS: Both instructors and TAs can view submissions
-- ============================================

DROP POLICY IF EXISTS "Instructors view submissions for their tasks" ON public.task_submissions;
CREATE POLICY "Instructors and TAs view submissions"
ON public.task_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN sessions s ON s.id = t.session_id
    JOIN courses c ON c.id = s.course_id
    WHERE t.id = task_submissions.task_id
    AND (
      (c.instructor_id = auth.uid() AND has_role(auth.uid(), 'instructor'::app_role))
      OR has_role_for_course(auth.uid(), 'ta'::app_role, c.id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- ============================================
-- ATTENDANCE: Both instructors and TAs can manage attendance
-- ============================================

DROP POLICY IF EXISTS "Instructors mark attendance" ON public.attendance;
CREATE POLICY "Instructors and TAs mark attendance"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.id = attendance.session_id
    AND (
      (c.instructor_id = auth.uid() AND has_role(auth.uid(), 'instructor'::app_role))
      OR has_role_for_course(auth.uid(), 'ta'::app_role, c.id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

DROP POLICY IF EXISTS "Instructors view session attendance" ON public.attendance;
CREATE POLICY "Instructors and TAs view attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.id = attendance.session_id
    AND (
      (c.instructor_id = auth.uid() AND has_role(auth.uid(), 'instructor'::app_role))
      OR has_role_for_course(auth.uid(), 'ta'::app_role, c.id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

DROP POLICY IF EXISTS "Instructors delete attendance" ON public.attendance;
CREATE POLICY "Instructors and TAs delete attendance"
ON public.attendance
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.id = attendance.session_id
    AND (
      (c.instructor_id = auth.uid() AND has_role(auth.uid(), 'instructor'::app_role))
      OR has_role_for_course(auth.uid(), 'ta'::app_role, c.id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- ============================================
-- ENROLLMENTS: TAs can view enrollments for their courses
-- ============================================

DROP POLICY IF EXISTS "Instructors view course enrollments" ON public.enrollments;
CREATE POLICY "Instructors and TAs view enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = enrollments.course_id
    AND (
      (courses.instructor_id = auth.uid() AND has_role(auth.uid(), 'instructor'::app_role))
      OR has_role_for_course(auth.uid(), 'ta'::app_role, courses.id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- ============================================
-- PROFILES: TAs can view student profiles for their courses
-- ============================================

DROP POLICY IF EXISTS "Instructors view enrolled students profiles" ON public.profiles;
CREATE POLICY "Instructors and TAs view student profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.student_id = profiles.id
    AND (
      (c.instructor_id = auth.uid() AND has_role(auth.uid(), 'instructor'::app_role))
      OR has_role_for_course(auth.uid(), 'ta'::app_role, c.id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);