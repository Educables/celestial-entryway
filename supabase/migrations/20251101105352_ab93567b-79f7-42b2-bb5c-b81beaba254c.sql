-- Create enrollments table for student course registration
CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Enable RLS
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Students can view their own enrollments
CREATE POLICY "Students view own enrollments"
ON public.enrollments
FOR SELECT
USING (auth.uid() = student_id);

-- Students can enroll themselves in courses
CREATE POLICY "Students can enroll in courses"
ON public.enrollments
FOR INSERT
WITH CHECK (
  auth.uid() = student_id 
  AND has_role(auth.uid(), 'student'::app_role)
);

-- Students can unenroll themselves
CREATE POLICY "Students can unenroll from courses"
ON public.enrollments
FOR DELETE
USING (
  auth.uid() = student_id 
  AND has_role(auth.uid(), 'student'::app_role)
);

-- Instructors and admins can view enrollments for their courses
CREATE POLICY "Instructors view course enrollments"
ON public.enrollments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = enrollments.course_id
    AND (courses.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);