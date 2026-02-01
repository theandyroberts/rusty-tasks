import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// This route fetches recurring tasks from both:
// 1. Supabase (for completion tracking)
// 2. Clawdbot cron system (for schedule info)

export async function GET(request: Request) {
  try {
    // Get date from query param or default to today
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const targetDate = dateParam || new Date().toISOString().split('T')[0];

    // Fetch recurring tasks from Supabase
    const { data: recurringTasks, error } = await supabase
      .from('recurring_tasks')
      .select('*')
      .order('name');

    if (error) throw error;

    // Fetch completions for target date
    const { data: completions, error: completionsError } = await supabase
      .from('daily_completions')
      .select('*')
      .eq('date', targetDate);

    if (completionsError) throw completionsError;

    // Merge completion status
    const tasksWithStatus = (recurringTasks || []).map((task) => ({
      ...task,
      completed_today: completions?.some((c) => c.recurring_task_id === task.id) || false,
    }));

    return NextResponse.json({ tasks: tasksWithStatus });
  } catch (error) {
    console.error('Error fetching recurring tasks:', error);
    return NextResponse.json({ tasks: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cron_job_id, name, schedule, next_run } = body;

    const { data, error } = await supabase
      .from('recurring_tasks')
      .upsert(
        [
          {
            cron_job_id,
            name,
            schedule,
            next_run,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'cron_job_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ task: data });
  } catch (error) {
    console.error('Error creating recurring task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
