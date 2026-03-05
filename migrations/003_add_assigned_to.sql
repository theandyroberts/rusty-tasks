-- Add assignee support for tasks created/executed by Rusty or Claude Code
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS assigned_to TEXT
  CHECK (assigned_to IN ('rusty', 'claude_code', 'unassigned'))
  DEFAULT 'unassigned';
