-- Add RLS policies for exercises table
-- Authenticated users can view all exercises
CREATE POLICY "Authenticated users can view exercises"
ON public.exercises
FOR SELECT
USING (auth.role() = 'authenticated');

-- TAs and instructors can create exercises
CREATE POLICY "TAs and instructors can create exercises"
ON public.exercises
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ta', 'instructor', 'admin')
  )
);

-- TAs and instructors can update exercises
CREATE POLICY "TAs and instructors can update exercises"
ON public.exercises
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ta', 'instructor', 'admin')
  )
);

-- TAs and instructors can delete exercises
CREATE POLICY "TAs and instructors can delete exercises"
ON public.exercises
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ta', 'instructor', 'admin')
  )
);