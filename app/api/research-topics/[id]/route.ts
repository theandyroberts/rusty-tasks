import { NextResponse } from 'next/server';
import { loadTopics, saveTopics } from '@/lib/researchTopicsStore';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const topics = await loadTopics();
    const idx = topics.findIndex((t) => t.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    topics[idx] = {
      ...topics[idx],
      ...(body.title !== undefined ? { title: String(body.title) } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.notes !== undefined ? { notes: String(body.notes) } : {}),
      ...(body.links !== undefined ? { links: Array.isArray(body.links) ? body.links : [] } : {}),
      ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
      ...(body.lastUsedAt !== undefined ? { lastUsedAt: body.lastUsedAt || undefined } : {}),
      ...(body.bumpUsedCount ? { usedCount: (topics[idx].usedCount || 0) + 1 } : {}),
      updatedAt: now,
    };

    await saveTopics(topics);
    return NextResponse.json({ topic: topics[idx] });
  } catch (error) {
    console.error('Error updating research topic:', error);
    return NextResponse.json({ error: 'Failed to update topic' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const topics = await loadTopics();
    const next = topics.filter((t) => t.id !== id);
    await saveTopics(next);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting research topic:', error);
    return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 });
  }
}
