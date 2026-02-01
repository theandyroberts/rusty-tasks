-- Migration: Add 'needs_feedback' status + dev_notes column to tasks table
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)

-- 1. Add dev_notes column (for developer feedback on completed tasks)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS dev_notes TEXT;

-- 2. Drop the old status constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- 3. Add the new constraint with needs_feedback status
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('todo', 'in_progress', 'needs_feedback', 'done', 'archive'));

-- Verify it worked (should show the new constraint)
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'tasks'::regclass;
