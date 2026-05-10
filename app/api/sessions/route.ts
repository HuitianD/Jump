import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongoose';
import { SessionModel } from '@/lib/db/models';

export const dynamic = 'force-dynamic';

export async function GET() {
  await connectMongo();
  const sessions = await SessionModel.find().sort({ savedAt: -1 }).lean();
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  await connectMongo();
  const body = await req.json();
  const { participantId, submittedAt, successCount, failureCount, totalTrials, successRate, trials } = body;

  if (
    submittedAt === undefined ||
    successCount === undefined ||
    failureCount === undefined ||
    totalTrials === undefined ||
    successRate === undefined
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const session = await SessionModel.create({
      participantId: participantId || '',
      submittedAt: new Date(submittedAt),
      successCount,
      failureCount,
      totalTrials,
      successRate,
      trials: trials || [],
    });
    return NextResponse.json({ status: 'ok', sessionId: session._id }, { status: 201 });
  } catch (err) {
    console.error('Error saving session:', err);
    return NextResponse.json({ error: 'Failed to save results' }, { status: 500 });
  }
}
