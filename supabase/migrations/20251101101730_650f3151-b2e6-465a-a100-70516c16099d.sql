-- Create storage bucket for course materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', false);

-- Allow instructors to upload materials for their courses
CREATE POLICY "Instructors can upload materials for their courses"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'course-materials' AND
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id::text = (storage.foldername(name))[1]
    AND courses.instructor_id = auth.uid()
  )
);

-- Allow instructors to view materials for their courses
CREATE POLICY "Instructors can view materials for their courses"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'course-materials' AND
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id::text = (storage.foldername(name))[1]
    AND courses.instructor_id = auth.uid()
  )
);

-- Allow instructors to delete materials for their courses
CREATE POLICY "Instructors can delete materials for their courses"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'course-materials' AND
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id::text = (storage.foldername(name))[1]
    AND courses.instructor_id = auth.uid()
  )
);