-- Add AI validation fields to validation_materials table
ALTER TABLE public.validation_materials 
ADD COLUMN ai_validation_status text DEFAULT 'pending' CHECK (ai_validation_status IN ('pending', 'validating', 'approved', 'rejected', 'error')),
ADD COLUMN ai_validation_result text,
ADD COLUMN ai_validated_at timestamp with time zone;