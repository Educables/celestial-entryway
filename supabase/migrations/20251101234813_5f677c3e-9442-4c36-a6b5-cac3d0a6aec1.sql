-- Create validation_requests table
CREATE TABLE public.validation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_submission_id UUID NOT NULL REFERENCES public.task_submissions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  ta_id UUID NOT NULL,
  request_message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create validation_materials table
CREATE TABLE public.validation_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_request_id UUID NOT NULL REFERENCES public.validation_requests(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  notes TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for validation materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('validation-materials', 'validation-materials', false);

-- Enable RLS on validation_requests
ALTER TABLE public.validation_requests ENABLE ROW LEVEL SECURITY;

-- TAs can create validation requests
CREATE POLICY "TAs create validation requests"
ON public.validation_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = ta_id AND
  EXISTS (
    SELECT 1 FROM public.task_submissions ts
    JOIN public.tasks t ON t.id = ts.task_id
    JOIN public.sessions s ON s.id = t.session_id
    JOIN public.courses c ON c.id = s.course_id
    WHERE ts.id = task_submission_id
    AND (
      has_role_for_course(auth.uid(), 'ta'::app_role, c.id) OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- TAs and students can view relevant validation requests
CREATE POLICY "View own validation requests"
ON public.validation_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id OR
  auth.uid() = ta_id OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- TAs can update validation requests
CREATE POLICY "TAs update validation requests"
ON public.validation_requests
FOR UPDATE
TO authenticated
USING (
  auth.uid() = ta_id OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Students can update status when submitting materials
CREATE POLICY "Students update own validation requests"
ON public.validation_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- Enable RLS on validation_materials
ALTER TABLE public.validation_materials ENABLE ROW LEVEL SECURITY;

-- Students can upload their validation materials
CREATE POLICY "Students upload validation materials"
ON public.validation_materials
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.validation_requests vr
    WHERE vr.id = validation_request_id
    AND vr.student_id = auth.uid()
  )
);

-- View validation materials
CREATE POLICY "View validation materials"
ON public.validation_materials
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.validation_requests vr
    WHERE vr.id = validation_request_id
    AND (vr.student_id = auth.uid() OR vr.ta_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Storage policies for validation materials
CREATE POLICY "Students upload validation materials to storage"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'validation-materials' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "View own validation materials in storage"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'validation-materials' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    has_role(auth.uid(), 'ta'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_validation_requests_updated_at
BEFORE UPDATE ON public.validation_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();