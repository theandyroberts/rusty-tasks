import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Sync recurring tasks from Clawdbot cron jobs
// This endpoint should be called periodically or when cron jobs change

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cron_jobs } = body;

    if (!Array.isArray(cron_jobs)) {
      return NextResponse.json({ error: 'cron_jobs must be an array' }, { status: 400 });
    }

    // Upsert all cron jobs as recurring tasks
    const tasks = cron_jobs.map((job: {
      id: string;
      name: string;
      schedule: { expr?: string; kind?: string };
      enabled: boolean;
      state?: { nextRunAtMs?: number };
    }) => ({
      cron_job_id: job.id,
      name: job.name,
      schedule: job.schedule?.expr || job.schedule?.kind || 'unknown',
      enabled: job.enabled,
      next_run: job.state?.nextRunAtMs 
        ? new Date(job.state.nextRunAtMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : null,
      updated_at: new Date().toISOString(),
    }));

    for (const task of tasks) {
      const { error } = await supabase
        .from('recurring_tasks')
        .upsert(task, { onConflict: 'cron_job_id' });
      
      if (error) {
        console.error('Error upserting task:', error);
      }
    }

    return NextResponse.json({ success: true, synced: tasks.length });
  } catch (error) {
    console.error('Error syncing cron jobs:', error);
    return NextResponse.json({ error: 'Failed to sync' }, { status: 500 });
  }
}
