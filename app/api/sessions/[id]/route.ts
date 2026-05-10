import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongoose';
import { SessionModel } from '@/lib/db/models';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await connectMongo();
  try {
    const session = await SessionModel.findById(params.id).lean();
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    return NextResponse.json(session);
  } catch (err) {
    console.error('Error fetching session:', err);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}
