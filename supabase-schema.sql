-- Henry Tasks Database Schema
-- Run this in Supabase SQL Editor

-- Tasks table (Kanban board items)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'needs_feedback', 'done', 'archive')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  source TEXT DEFAULT 'manual',
  dev_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Recurring tasks (synced from Clawdbot cron jobs)
CREATE TABLE IF NOT EXISTS recurring_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cron_job_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  schedule TEXT,
  enabled BOOLEAN DEFAULT true,
  next_run TEXT,
  last_completed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily completions (tracks which recurring tasks were done each day)
CREATE TABLE IF NOT EXISTS daily_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_task_id UUID REFERENCES recurring_tasks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recurring_task_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_completions_date ON daily_completions(date);
CREATE INDEX IF NOT EXISTS idx_daily_completions_task_date ON daily_completions(recurring_task_id, date);

-- Enable Row Level Security (optional, for multi-user scenarios)
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recurring_tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_completions ENABLE ROW LEVEL SECURITY;
