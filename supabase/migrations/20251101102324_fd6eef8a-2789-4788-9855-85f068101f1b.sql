-- Drop existing policies
DROP POLICY IF EXISTS "Instructors can upload materials for their courses" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can view materials for their courses" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete materials for their courses" ON storage.objects;

-- Create correct policies using storage.foldername()
CREATE POLICY "Instructors can upload materials for their courses"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'course-materials' AND
  auth.uid() IN (
    SELECT instructor_id FROM public.courses
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Instructors can view materials for their courses"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'course-materials' AND
  auth.uid() IN (
    SELECT instructor_id FROM public.courses
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Instructors can delete materials for their courses"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'course-materials' AND
  auth.uid() IN (
    SELECT instructor_id FROM public.courses
    WHERE id::text = (storage.foldername(name))[1]
  )
);