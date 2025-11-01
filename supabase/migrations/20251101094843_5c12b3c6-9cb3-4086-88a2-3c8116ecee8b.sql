-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create courses table
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Instructors can view their own courses
CREATE POLICY "Instructors view own courses"
ON public.courses
FOR SELECT
USING (
  auth.uid() = instructor_id OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Instructors can create courses
CREATE POLICY "Instructors create courses"
ON public.courses
FOR INSERT
WITH CHECK (
  auth.uid() = instructor_id AND (
    has_role(auth.uid(), 'instructor'::app_role) OR
    has_role(auth.uid(), 'ta'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Instructors can update their own courses
CREATE POLICY "Instructors update own courses"
ON public.courses
FOR UPDATE
USING (
  auth.uid() = instructor_id OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Instructors can delete their own courses
CREATE POLICY "Instructors delete own courses"
ON public.courses
FOR DELETE
USING (
  auth.uid() = instructor_id OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add trigger for courses updated_at
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create sessions table
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- View sessions for courses you can access
CREATE POLICY "View sessions for accessible courses"
ON public.sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = sessions.course_id
    AND (courses.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Create sessions for your own courses
CREATE POLICY "Create sessions for own courses"
ON public.sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = sessions.course_id
    AND courses.instructor_id = auth.uid()
  )
);

-- Update sessions for your own courses
CREATE POLICY "Update sessions for own courses"
ON public.sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = sessions.course_id
    AND (courses.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Delete sessions for your own courses
CREATE POLICY "Delete sessions for own courses"
ON public.sessions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = sessions.course_id
    AND (courses.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Add validation trigger for session times
CREATE OR REPLACE FUNCTION public.validate_session_times()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'Session end time must be after start time';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_session_times_trigger
BEFORE INSERT OR UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.validate_session_times();