-- Add grade column to task_submissions to store calculated points
ALTER TABLE task_submissions ADD COLUMN grade numeric DEFAULT 0;

-- Add comment to tasks.questions column to document new structure
COMMENT ON COLUMN tasks.questions IS 'JSONB array of questions with structure: [{ question_number: number, options: [{ text: string, points: number }] }]';