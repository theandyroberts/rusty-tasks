import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { completed } = body;
    
    const today = new Date().toISOString().split('T')[0];

    if (completed) {
      // Add completion record
      const { error } = await supabase
        .from('daily_completions')
        .insert([
          {
            recurring_task_id: id,
            date: today,
            completed_at: new Date().toISOString(),
          },
        ]);

      if (error && error.code !== '23505') throw error; // Ignore duplicate key
    } else {
      // Remove completion record
      const { error } = await supabase
        .from('daily_completions')
        .delete()
        .eq('recurring_task_id', id)
        .eq('date', today);

      if (error) throw error;
    }

    // Update last_completed on the recurring task
    if (completed) {
      await supabase
        .from('recurring_tasks')
        .update({ last_completed: new Date().toISOString() })
        .eq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error toggling completion:', error);
    return NextResponse.json({ error: 'Failed to toggle completion' }, { status: 500 });
  }
}
