-- Create session_registrations table for students to register for sessions
CREATE TABLE public.session_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  registered_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, session_id)
);

-- Enable RLS
ALTER TABLE public.session_registrations ENABLE ROW LEVEL SECURITY;

-- Students can view their own registrations
CREATE POLICY "Students view own registrations"
ON public.session_registrations
FOR SELECT
USING (auth.uid() = student_id);

-- Students can register for sessions only if enrolled in the course
CREATE POLICY "Enrolled students can register for sessions"
ON public.session_registrations
FOR INSERT
WITH CHECK (
  auth.uid() = student_id 
  AND has_role(auth.uid(), 'student'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.sessions s ON s.course_id = e.course_id
    WHERE e.student_id = auth.uid()
    AND s.id = session_id
  )
);

-- Students can unregister from sessions
CREATE POLICY "Students can unregister from sessions"
ON public.session_registrations
FOR DELETE
USING (
  auth.uid() = student_id 
  AND has_role(auth.uid(), 'student'::app_role)
);

-- Instructors can view registrations for their course sessions
CREATE POLICY "Instructors view session registrations"
ON public.session_registrations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = session_registrations.session_id
    AND (c.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Allow students to view sessions for courses they're enrolled in
CREATE POLICY "Students view sessions for enrolled courses"
ON public.sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE enrollments.student_id = auth.uid()
    AND enrollments.course_id = sessions.course_id
  )
);