-- Update the sessions INSERT policy to allow TAs to create sessions for assigned courses
DROP POLICY IF EXISTS "Create sessions for own courses" ON public.sessions;

CREATE POLICY "Create sessions for own courses"
ON public.sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = sessions.course_id
      AND (
        -- Instructors can create sessions for their own courses
        (courses.instructor_id = auth.uid() AND has_role(auth.uid(), 'instructor'::app_role))
        -- Admins can create sessions for any course
        OR has_role(auth.uid(), 'admin'::app_role)
        -- TAs can create sessions for courses they are assigned to
        OR has_role_for_course(auth.uid(), 'ta'::app_role, courses.id)
      )
  )
);