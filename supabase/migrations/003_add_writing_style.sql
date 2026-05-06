-- Add writing_style column to personas table
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS writing_style TEXT;

-- Set a default writing style for existing personas
UPDATE personas
SET writing_style = 'casual, terse'
WHERE writing_style IS NULL;
