-- Create function to check if user owns the course
CREATE OR REPLACE FUNCTION public.user_owns_course(_user_id uuid, _course_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses
    WHERE id::text = _course_id
      AND instructor_id = _user_id
  )
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Instructors can upload materials for their courses" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can view materials for their courses" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete materials for their courses" ON storage.objects;

-- Create policies using the security definer function
CREATE POLICY "Instructors can upload materials for their courses"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'course-materials' AND
  public.user_owns_course(auth.uid(), (storage.foldername(name))[1])
);

CREATE POLICY "Instructors can view materials for their courses"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'course-materials' AND
  public.user_owns_course(auth.uid(), (storage.foldername(name))[1])
);

CREATE POLICY "Instructors can delete materials for their courses"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'course-materials' AND
  public.user_owns_course(auth.uid(), (storage.foldername(name))[1])
);