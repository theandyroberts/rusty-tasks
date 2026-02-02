import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const oldest = searchParams.get('oldest') === 'true';

    let query = supabase.from('tasks').select('*');

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Order: oldest first if filtering for actionable tasks, otherwise newest first
    if (oldest || status === 'todo') {
      query = query.order('created_at', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Limit results if specified
    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ tasks: data });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ tasks: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, status = 'todo', priority, source = 'manual' } = body;

    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          title,
          description,
          status,
          priority,
          source,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ task: data });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
