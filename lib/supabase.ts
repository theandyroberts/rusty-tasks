import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'archive';
  priority?: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  source?: string; // 'manual' | 'telegram' | 'cron'
  dev_notes?: string; // Developer notes/explanation for completed tasks
};

export type RecurringTask = {
  id: string;
  cron_job_id: string;
  name: string;
  schedule: string;
  last_completed?: string;
  completed_today: boolean;
};

export type DailyCompletion = {
  id: string;
  recurring_task_id: string;
  completed_at: string;
  date: string; // YYYY-MM-DD
};
