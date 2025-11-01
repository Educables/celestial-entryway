-- Allow instructors to view profiles of students enrolled in their courses
CREATE POLICY "Instructors view enrolled students profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.student_id = profiles.id
      AND (c.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Allow TAs and admins to view all profiles
CREATE POLICY "TAs and admins view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'ta') OR has_role(auth.uid(), 'admin')
);