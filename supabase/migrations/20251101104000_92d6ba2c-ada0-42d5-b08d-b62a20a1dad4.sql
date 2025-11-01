-- Allow students to view all courses
CREATE POLICY "Students can view all courses"
ON public.courses
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role)
);