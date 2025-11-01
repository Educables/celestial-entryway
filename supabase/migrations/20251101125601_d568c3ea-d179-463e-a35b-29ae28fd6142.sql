-- Update tasks table to store points for each option
-- The questions column will now store: [{ question_number: number, options: [{ text: string, points: number }] }]
-- No schema change needed, just updating the data structure within the existing JSONB column

-- Add a comment to document the new structure
COMMENT ON COLUMN tasks.questions IS 'Array of questions with structure: [{ question_number: number, options: [{ text: string, points: number }] }]';
