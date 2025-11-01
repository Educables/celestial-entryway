-- Allow enrolled students to view course materials
CREATE POLICY "Enrolled students can view course materials"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'course-materials'
  AND has_role(auth.uid(), 'student'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE enrollments.student_id = auth.uid()
    AND enrollments.course_id::text = (storage.foldername(name))[1]
  )
);

-- Instructors can upload materials for their courses
CREATE POLICY "Instructors can upload course materials"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'course-materials'
  AND EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id::text = (storage.foldername(name))[1]
    AND (courses.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Instructors can update materials for their courses
CREATE POLICY "Instructors can update course materials"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'course-materials'
  AND EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id::text = (storage.foldername(name))[1]
    AND (courses.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Instructors can delete materials for their courses
CREATE POLICY "Instructors can delete course materials"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'course-materials'
  AND EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id::text = (storage.foldername(name))[1]
    AND (courses.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);