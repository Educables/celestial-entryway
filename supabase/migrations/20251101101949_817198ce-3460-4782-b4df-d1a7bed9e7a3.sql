-- Drop existing storage policies
DROP POLICY IF EXISTS "Instructors can upload materials for their courses" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can view materials for their courses" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete materials for their courses" ON storage.objects;

-- Create improved policies with better path handling
CREATE POLICY "Instructors can upload materials for their courses"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'course-materials' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id::text = (string_to_array(name, '/'))[1]
    AND courses.instructor_id = auth.uid()
  )
);

CREATE POLICY "Instructors can view materials for their courses"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'course-materials' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id::text = (string_to_array(name, '/'))[1]
    AND courses.instructor_id = auth.uid()
  )
);

CREATE POLICY "Instructors can delete materials for their courses"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'course-materials' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id::text = (string_to_array(name, '/'))[1]
    AND courses.instructor_id = auth.uid()
  )
);