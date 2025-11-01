-- Update tasks table to support different options per question
ALTER TABLE public.tasks DROP COLUMN options;
ALTER TABLE public.tasks ADD COLUMN questions jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tasks.questions IS 'Array of questions with their options: [{question_number: 1, options: ["A", "B", "C"]}, ...]';