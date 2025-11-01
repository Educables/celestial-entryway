-- Create tasks table for homework assignments
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  material_reference TEXT,
  num_questions INTEGER NOT NULL,
  options TEXT[] NOT NULL DEFAULT ARRAY['A', 'B', 'C', 'D'],
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task submissions table
CREATE TABLE public.task_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  answers JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, student_id)
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Instructors view tasks for their sessions"
ON public.tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.id = tasks.session_id
      AND (c.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Instructors create tasks for their sessions"
ON public.tasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.id = tasks.session_id
      AND c.instructor_id = auth.uid()
  )
);

CREATE POLICY "Instructors update/delete their tasks"
ON public.tasks
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.id = tasks.session_id
      AND (c.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Students view tasks for enrolled sessions"
ON public.tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM sessions s
    JOIN enrollments e ON e.course_id = s.course_id
    WHERE s.id = tasks.session_id
      AND e.student_id = auth.uid()
  )
);

-- RLS Policies for task submissions
CREATE POLICY "Students view own submissions"
ON public.task_submissions
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students submit their answers"
ON public.task_submissions
FOR INSERT
WITH CHECK (
  auth.uid() = student_id
  AND has_role(auth.uid(), 'student')
  AND EXISTS (
    SELECT 1
    FROM tasks t
    JOIN sessions s ON s.id = t.session_id
    JOIN enrollments e ON e.course_id = s.course_id
    WHERE t.id = task_submissions.task_id
      AND e.student_id = auth.uid()
  )
);

CREATE POLICY "Students update own submissions"
ON public.task_submissions
FOR UPDATE
USING (auth.uid() = student_id);

CREATE POLICY "Instructors view submissions for their tasks"
ON public.task_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM tasks t
    JOIN sessions s ON s.id = t.session_id
    JOIN courses c ON c.id = s.course_id
    WHERE t.id = task_submissions.task_id
      AND (c.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);