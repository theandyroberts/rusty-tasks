-- Add sequential reference number to tasks
-- Run this in Supabase SQL Editor

-- Add ref_num column with auto-increment sequence
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ref_num SERIAL;

-- Create index for fast lookups by ref_num
CREATE INDEX IF NOT EXISTS idx_tasks_ref_num ON tasks(ref_num);

-- Backfill existing tasks with sequential numbers (ordered by created_at)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_num
  FROM tasks
  WHERE ref_num = 0 OR ref_num IS NULL
)
UPDATE tasks
SET ref_num = numbered.new_num
FROM numbered
WHERE tasks.id = numbered.id;
