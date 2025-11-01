-- Add RLS policies for session_slots table
-- Authenticated users can view all session slots (needed for course registration)
CREATE POLICY "Authenticated users can view session slots"
ON public.session_slots
FOR SELECT
USING (auth.role() = 'authenticated');

-- TAs and instructors can create session slots
CREATE POLICY "TAs and instructors can create session slots"
ON public.session_slots
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ta', 'instructor', 'admin')
  )
);

-- TAs and instructors can update session slots
CREATE POLICY "TAs and instructors can update session slots"
ON public.session_slots
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ta', 'instructor', 'admin')
  )
);

-- TAs and instructors can delete session slots
CREATE POLICY "TAs and instructors can delete session slots"
ON public.session_slots
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ta', 'instructor', 'admin')
  )
);