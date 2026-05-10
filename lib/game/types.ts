export type PlayerState = 'idle' | 'charging' | 'jumping' | 'scrolling';
export type Outcome = 'success' | 'failure';
export type PlatformRole = 'current' | 'target' | 'alternate';

export interface Platform {
  baseCenterX: number;
  centerX: number;
  baseY: number;
  y: number;
  width: number;
  height: number;
  role: PlatformRole;
  phaseOffset: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

export interface MotionGroup {
  type: 'vertical' | 'horizontal';
  phase: number;
  amplitude: number;
  speed: number;
}

export interface TrialRecord {
  trial: number;
  landingTimestamp: number | null;
  pressTimestamp: number | null;
  jumpTimestamp: number | null;
  landingToPressMs: number | null;
  pressToJumpMs: number | null;
  postLandingTimestamp: number | null;
  targetPlatformWidth: number | null;
  targetPlatformHeight: number | null;
  startX: number | null;
  startY: number | null;
  landingX: number | null;
  landingY: number | null;
  outcome: Outcome | null;
}

export interface SessionDoc {
  _id: string;
  participantId: string;
  submittedAt: string;
  savedAt?: string;
  successCount: number;
  failureCount: number;
  totalTrials: number;
  successRate: number;
  trials: TrialRecord[];
}
