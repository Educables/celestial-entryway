-- Create attendance table to track student attendance at sessions
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, student_id)
);

-- Enable Row Level Security
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Instructors can view attendance for their sessions
CREATE POLICY "Instructors view session attendance"
ON public.attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.id = attendance.session_id
      AND (c.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Instructors can mark attendance for their sessions
CREATE POLICY "Instructors mark attendance"
ON public.attendance
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.id = attendance.session_id
      AND (c.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Students can view their own attendance
CREATE POLICY "Students view own attendance"
ON public.attendance
FOR SELECT
USING (auth.uid() = student_id);

-- Instructors can delete attendance records
CREATE POLICY "Instructors delete attendance"
ON public.attendance
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.id = attendance.session_id
      AND (c.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Create index for faster queries
CREATE INDEX idx_attendance_session_id ON public.attendance(session_id);
CREATE INDEX idx_attendance_student_id ON public.attendance(student_id);