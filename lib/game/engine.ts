import {
  CONFIG,
  PLATFORM_Y,
  PLATFORM_ANCHOR_X,
  PLATFORM_RIGHT_CENTER_X,
  PLAYER_INITIAL_Y,
  TOTAL_TRIALS,
} from './config';
import {
  MotionGroup,
  Outcome,
  Platform,
  PlatformRole,
  PlayerState,
  TrialRecord,
} from './types';

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function seededUnit(trialIndex: number) {
  const v = Math.sin((trialIndex + 1) * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

export function getTrialPhase(trialIndex: number) {
  const n = clamp(trialIndex + 1, 1, TOTAL_TRIALS);
  return (
    CONFIG.trials.phases.find((p) => n >= p.start && n <= p.end) ??
    CONFIG.trials.phases[CONFIG.trials.phases.length - 1]
  );
}

export function widthForTrial(trialIndex: number, override?: number | null) {
  if (override != null && Number.isFinite(override) && override > 10) return override;
  const phase = getTrialPhase(trialIndex);
  const { min, max } = phase.platformWidth;
  if (max <= min) return min;
  return min + seededUnit(trialIndex) * (max - min);
}

function makePlatform(
  baseCenterX: number,
  baseY: number,
  width: number,
  role: PlatformRole,
  phaseOffset = 0,
): Platform {
  return {
    baseCenterX,
    centerX: baseCenterX,
    baseY,
    y: baseY,
    width,
    height: CONFIG.platform.height,
    role,
    phaseOffset,
    get left() {
      return this.centerX - this.width / 2;
    },
    get right() {
      return this.centerX + this.width / 2;
    },
    get top() {
      return this.y - this.height;
    },
  };
}

export interface EngineCallbacks {
  onTrialResolved?: (outcome: Outcome, trialNumber: number) => void;
  onSessionComplete?: () => void;
}

export class GameEngine {
  player = {
    x: PLATFORM_ANCHOR_X,
    y: PLAYER_INITIAL_Y,
    vx: 0,
    vy: 0,
    scaleX: 1,
    scaleY: 1,
    state: 'idle' as PlayerState,
    chargeTime: 0,
    spring: { active: false, time: 0, amplitude: 0 },
  };

  trial = 0;
  successCount = 0;
  failureCount = 0;
  gameEnded = false;

  currentPlatform: Platform | null = null;
  targetPlatforms: Platform[] = [];
  motionGroup: MotionGroup | null = null;
  scrollAnchor: Platform | null = null;

  lastLandingTimestamp = performance.now();
  lastPressTimestamp: number | null = null;
  currentTrialRecord: TrialRecord | null = null;
  trialRecords: TrialRecord[] = [];

  pendingOutcome: Outcome | null = null;
  // For replay/intervention modes — when set, override landing detection.
  forcedOutcome: Outcome | null = null;
  // assistMargin makes replay landing detection forgiving (used by ReplayController).
  assistMargin = 0;

  callbacks: EngineCallbacks = {};

  constructor() {
    this.setupTrial(0);
    this.respawn();
  }

  reset() {
    this.trial = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.gameEnded = false;
    this.trialRecords = [];
    this.currentTrialRecord = null;
    this.lastPressTimestamp = null;
    this.pendingOutcome = null;
    this.forcedOutcome = null;
    this.assistMargin = 0;
    this.setupTrial(0);
    this.respawn();
  }

  respawn() {
    this.player.x = PLATFORM_ANCHOR_X;
    this.player.y = PLAYER_INITIAL_Y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.scaleX = 1;
    this.player.scaleY = 1;
    this.player.state = 'idle';
    this.player.chargeTime = 0;
    this.player.spring.active = false;
    this.player.spring.time = 0;
    this.player.spring.amplitude = 0;
    this.lastPressTimestamp = null;
    this.currentTrialRecord = null;
    this.lastLandingTimestamp = performance.now();
  }

  setupTrial(trialIndex: number, overrideWidth?: number | null) {
    const phase = getTrialPhase(trialIndex);
    const targetWidth = widthForTrial(trialIndex, overrideWidth);

    this.currentPlatform = makePlatform(
      PLATFORM_ANCHOR_X,
      PLATFORM_Y,
      CONFIG.platform.currentWidth,
      'current',
    );

    if (phase.targetLayout === 'dual') {
      const dualXOffset = phase.dualXOffset ?? 120;
      this.targetPlatforms = [
        makePlatform(PLATFORM_RIGHT_CENTER_X - dualXOffset, PLATFORM_Y, targetWidth, 'target', 0),
        makePlatform(PLATFORM_RIGHT_CENTER_X, PLATFORM_Y, targetWidth, 'alternate', Math.PI * 0.6),
      ];
    } else {
      this.targetPlatforms = [
        makePlatform(PLATFORM_RIGHT_CENTER_X, PLATFORM_Y, targetWidth, 'target'),
      ];
    }

    this.motionGroup = this.createMotionGroup(phase.motionType, trialIndex);
    this.scrollAnchor = this.targetPlatforms[0] ?? null;
    this.applyMotion(0);
  }

  createMotionGroup(motionType: string, trialIndex: number): MotionGroup | null {
    if (motionType === 'none') return null;
    const phase = seededUnit(trialIndex) * Math.PI * 2;
    if (motionType === 'vertical') {
      return {
        type: 'vertical',
        phase,
        amplitude: CONFIG.platform.moving.vertical.amplitude,
        speed: CONFIG.platform.moving.vertical.speed,
      };
    }
    return {
      type: 'horizontal',
      phase,
      amplitude: CONFIG.platform.moving.horizontal.amplitude,
      speed: CONFIG.platform.moving.horizontal.speed,
    };
  }

  applyMotion(dt: number) {
    if (!this.motionGroup) {
      this.targetPlatforms.forEach((target) => {
        target.centerX = target.baseCenterX;
        target.y = target.baseY;
      });
      return;
    }

    if (dt > 0 && this.player.state !== 'scrolling') {
      this.motionGroup.phase += dt * this.motionGroup.speed;
    }

    this.targetPlatforms.forEach((target) => {
      const offset =
        Math.sin(this.motionGroup!.phase + (target.phaseOffset ?? 0)) * this.motionGroup!.amplitude;
      target.centerX =
        target.baseCenterX + (this.motionGroup!.type === 'horizontal' ? offset : 0);
      target.y = target.baseY + (this.motionGroup!.type === 'vertical' ? offset : 0);
    });
  }

  shiftAll(dx: number) {
    if (this.currentPlatform) {
      this.currentPlatform.baseCenterX += dx;
      this.currentPlatform.centerX += dx;
    }
    this.targetPlatforms.forEach((target) => {
      target.baseCenterX += dx;
      target.centerX += dx;
    });
    this.player.x += dx;
  }

  startCharging(): boolean {
    if (this.player.state !== 'idle' || this.gameEnded) return false;

    const pressTimestamp = performance.now();
    const landingTimestamp = this.lastLandingTimestamp;
    const targetPlatform = this.targetPlatforms[0] ?? null;

    this.lastPressTimestamp = pressTimestamp;
    this.currentTrialRecord = {
      trial: this.trial + 1,
      landingTimestamp,
      pressTimestamp,
      jumpTimestamp: null,
      landingToPressMs:
        landingTimestamp !== null ? pressTimestamp - landingTimestamp : null,
      pressToJumpMs: null,
      postLandingTimestamp: null,
      targetPlatformWidth: targetPlatform?.width ?? null,
      targetPlatformHeight: targetPlatform?.height ?? null,
      startX: this.player.x,
      startY: this.player.y,
      landingX: null,
      landingY: null,
      outcome: null,
    };

    this.player.state = 'charging';
    this.player.chargeTime = 0;
    return true;
  }

  releaseJump(): boolean {
    if (this.player.state !== 'charging') return false;

    const jumpTimestamp = performance.now();
    if (this.currentTrialRecord) {
      this.currentTrialRecord.jumpTimestamp = jumpTimestamp;
      if (this.currentTrialRecord.pressTimestamp !== null) {
        this.currentTrialRecord.pressToJumpMs =
          jumpTimestamp - this.currentTrialRecord.pressTimestamp;
      }
      this.trialRecords.push(this.currentTrialRecord);
      this.currentTrialRecord = null;
    }
    this.lastPressTimestamp = null;

    this.launch(this.player.chargeTime);
    return true;
  }

  // Used by replay mode — ignores currentTrialRecord bookkeeping.
  launchFromChargeTimeMs(ms: number) {
    this.player.chargeTime = ms / 1000;
    this.launch(this.player.chargeTime);
  }

  beginChargeVisual() {
    this.player.state = 'charging';
    this.player.chargeTime = 0;
    this.player.scaleX = 1;
    this.player.scaleY = 1;
  }

  private launch(seconds: number) {
    const rawSpeed =
      CONFIG.physics.chargeCoefficient *
      Math.pow(seconds * 1000, CONFIG.physics.chargeGamma) *
      1000;
    const speed = Math.min(CONFIG.physics.maxJumpSpeed, rawSpeed);
    this.player.vx = Math.cos(CONFIG.physics.jumpAngle) * speed;
    this.player.vy = Math.sin(CONFIG.physics.jumpAngle) * speed;
    this.player.state = 'jumping';
    this.player.spring.active = true;
    this.player.spring.time = 0;
    this.player.spring.amplitude = (1 - this.player.scaleY) * 0.95;
  }

  private updateCharging(dt: number) {
    this.player.chargeTime += dt;
    const scaleY = Math.max(
      1 - CONFIG.animation.chargeScale * Math.pow(this.player.chargeTime, CONFIG.physics.chargeGamma),
      CONFIG.animation.minScaleY,
    );
    this.player.scaleY = scaleY;
    this.player.scaleX = Math.pow(1 / scaleY, CONFIG.animation.scaleBeta);
  }

  private updateJumping(dt: number) {
    this.player.vy += CONFIG.physics.gravity * dt;
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    const stretchFactor = 1 + clamp(-this.player.vy / 2400, -0.1, 0.1);
    const airScaleX = stretchFactor;
    const airScaleY = 1 / stretchFactor;

    if (this.player.spring.active) {
      this.player.spring.time += dt;
      const { time, amplitude } = this.player.spring;
      const w = CONFIG.animation.springOmega;
      const z = CONFIG.animation.springZeta;
      const wd = w * Math.sqrt(1 - z * z);
      const rebound = 1 + amplitude * Math.exp(-z * w * time) * Math.cos(wd * time);
      this.player.scaleY = rebound * airScaleY;
      this.player.scaleX = Math.pow(1 / rebound, CONFIG.animation.scaleBeta) * airScaleX;
      if (time > 0.85) {
        this.player.spring.active = false;
        this.player.scaleX = airScaleX;
        this.player.scaleY = airScaleY;
      }
    } else {
      this.player.scaleX = airScaleX;
      this.player.scaleY = airScaleY;
    }
  }

  private checkLanding(): Platform | null {
    if (this.player.vy <= 0) return null;
    const playerBottom = this.player.y + CONFIG.player.height / 2;
    const playerLeft = this.player.x - CONFIG.player.width / 2;
    const playerRight = this.player.x + CONFIG.player.width / 2;
    const m = this.assistMargin;

    for (const target of this.targetPlatforms) {
      if (playerBottom < target.top) continue;
      if (
        playerRight >= target.left - m &&
        playerLeft <= target.right + m &&
        this.player.x >= target.left - m &&
        this.player.x <= target.right + m
      ) {
        return target;
      }
    }
    return null;
  }

  private checkFailure(): boolean {
    // Only declare failure once the player is fully off the canvas — let
    // gravity carry the player past the bottom edge naturally.
    return this.player.y > CONFIG.canvas.height + 100;
  }

  private getReplayFallbackTarget(): Platform | null {
    if (!this.targetPlatforms.length) return null;
    let best = this.targetPlatforms[0];
    let bestDistance = Math.abs(best.centerX - this.player.x);
    for (const t of this.targetPlatforms.slice(1)) {
      const d = Math.abs(t.centerX - this.player.x);
      if (d < bestDistance) {
        best = t;
        bestDistance = d;
      }
    }
    return best;
  }

  private finalizeTrial(outcome: Outcome, landed: Platform | null) {
    const trialNumber = this.trial + 1;
    this.pendingOutcome = outcome;

    if (outcome === 'success') {
      this.successCount += 1;
      if (landed) this.player.y = landed.top - CONFIG.player.height / 2;
    } else {
      this.failureCount += 1;
    }

    // Stamp outcome on the most recent record (live mode pushed it on release).
    const latest = this.trialRecords[this.trialRecords.length - 1];
    if (latest && latest.trial === trialNumber && latest.outcome === null) {
      latest.outcome = outcome;
      if (outcome === 'success') {
        latest.postLandingTimestamp = performance.now();
        latest.landingX = this.player.x;
        latest.landingY = this.player.y;
      }
    }

    this.trial += 1;
    this.scrollAnchor = landed || this.targetPlatforms[0] || null;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.scaleX = 1;
    this.player.scaleY = 1;
    this.player.state = 'scrolling';

    this.callbacks.onTrialResolved?.(outcome, trialNumber);
  }

  private scrollStep(dt: number): boolean {
    const anchor = this.scrollAnchor || this.targetPlatforms[0];
    if (!anchor) return true;
    const diff = anchor.centerX - PLATFORM_ANCHOR_X;
    if (diff > 0) {
      const move = Math.min(CONFIG.world.scrollSpeed * dt, diff);
      this.shiftAll(-move);
      return false;
    }
    const snap = PLATFORM_ANCHOR_X - anchor.centerX;
    this.shiftAll(snap);
    return true;
  }

  tick(dt: number) {
    if (this.gameEnded) return;
    this.applyMotion(dt);

    switch (this.player.state) {
      case 'charging':
        this.updateCharging(dt);
        break;

      case 'jumping': {
        this.updateJumping(dt);

        if (this.forcedOutcome === 'failure') {
          if (this.checkFailure()) this.finalizeTrial('failure', null);
          break;
        }

        const landed = this.checkLanding();
        if (landed) {
          this.finalizeTrial('success', landed);
          break;
        }

        if (this.checkFailure()) {
          if (this.forcedOutcome === 'success') {
            // Replay must honor the saved outcome — snap to nearest target.
            const fallback = this.getReplayFallbackTarget();
            if (fallback) {
              this.player.x = fallback.centerX;
              this.player.y = fallback.top - CONFIG.player.height / 2;
            }
            this.finalizeTrial('success', fallback);
          } else {
            this.finalizeTrial('failure', null);
          }
        }
        break;
      }

      case 'scrolling': {
        if (this.scrollStep(dt)) {
          if (this.trial >= TOTAL_TRIALS) {
            this.gameEnded = true;
            this.callbacks.onSessionComplete?.();
            this.respawn();
          } else {
            this.setupTrial(this.trial);
            this.respawn();
          }
          this.forcedOutcome = null;
        }
        break;
      }
    }
  }

  getPlatforms(): Platform[] {
    return [this.currentPlatform, ...this.targetPlatforms].filter(
      (p): p is Platform => p !== null,
    );
  }
}
