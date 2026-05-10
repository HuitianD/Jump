import { Schema, models, model } from 'mongoose';

const TrialSchema = new Schema({
  trial: { type: Number },
  landingTimestamp: { type: Number, default: null },
  pressTimestamp: { type: Number, default: null },
  jumpTimestamp: { type: Number, default: null },
  landingToPressMs: { type: Number, default: null },
  pressToJumpMs: { type: Number, default: null },
  postLandingTimestamp: { type: Number, default: null },
  targetPlatformWidth: { type: Number, default: null },
  targetPlatformHeight: { type: Number, default: null },
  startX: { type: Number, default: null },
  startY: { type: Number, default: null },
  landingX: { type: Number, default: null },
  landingY: { type: Number, default: null },
  outcome: { type: String, enum: ['success', 'failure', null], default: null },
});

const SessionSchema = new Schema({
  participantId: { type: String, default: '' },
  submittedAt: { type: Date, required: true },
  savedAt: { type: Date, default: Date.now },
  successCount: { type: Number, required: true },
  failureCount: { type: Number, required: true },
  totalTrials: { type: Number, required: true },
  successRate: { type: Number, required: true },
  trials: [TrialSchema],
});

export const SessionModel = models.Session ?? model('Session', SessionSchema);
