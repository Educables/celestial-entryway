-- Add RLS policies for qr_tokens table
-- Students can view active (non-expired) QR tokens for attendance scanning
CREATE POLICY "Students can view active QR tokens"
ON public.qr_tokens
FOR SELECT
USING (
  auth.role() = 'authenticated' 
  AND expires_at > now()
);

-- TAs and instructors can create QR tokens
CREATE POLICY "TAs and instructors can create QR tokens"
ON public.qr_tokens
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ta', 'instructor', 'admin')
  )
);

-- TAs and instructors can update QR tokens
CREATE POLICY "TAs and instructors can update QR tokens"
ON public.qr_tokens
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ta', 'instructor', 'admin')
  )
);

-- TAs and instructors can delete QR tokens
CREATE POLICY "TAs and instructors can delete QR tokens"
ON public.qr_tokens
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ta', 'instructor', 'admin')
  )
);