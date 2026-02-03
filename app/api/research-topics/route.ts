import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { loadTopics, saveTopics, type ResearchTopic } from '@/lib/researchTopicsStore';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const topics = await loadTopics();
    // Sort: active first, then least-recently-used, then title
    topics.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      const aLast = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      const bLast = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      if (aLast !== bLast) return aLast - bLast;
      return a.title.localeCompare(b.title);
    });
    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Error loading research topics:', error);
    return NextResponse.json({ topics: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const now = new Date().toISOString();
    const topics = await loadTopics();

    const newTopic: ResearchTopic = {
      id: crypto.randomUUID(),
      title: (body.title || '').trim(),
      category: body.category || 'other',
      notes: body.notes || '',
      links: Array.isArray(body.links) ? body.links : [],
      active: body.active ?? true,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: body.lastUsedAt || undefined,
      usedCount: 0,
    };

    if (!newTopic.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    topics.unshift(newTopic);
    await saveTopics(topics);

    return NextResponse.json({ topic: newTopic });
  } catch (error) {
    console.error('Error creating research topic:', error);
    return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 });
  }
}
