import { GameEngine } from '@/lib/game/engine';
import { TrialRecord } from '@/lib/game/types';

interface ReplayHooks {
  onTrialStart?: (idx: number) => void;
  onTrialEnd?: (idx: number, outcome: string) => void;
  stopBefore?: () => boolean;
}

export class ReplayController {
  engine: GameEngine;
  speed = 1;
  active = false;
  paused = false;
  private runId = 0;
  private trialDoneResolver: ((outcome: string) => void) | null = null;

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.engine.assistMargin = 14;
    this.engine.callbacks.onTrialResolved = (outcome) => {
      this.trialDoneResolver?.(outcome);
      this.trialDoneResolver = null;
    };
  }

  setSpeed(s: number) {
    this.speed = s;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  abort() {
    this.runId += 1;
    this.active = false;
    this.paused = false;
    if (this.trialDoneResolver) {
      this.trialDoneResolver('abort');
      this.trialDoneResolver = null;
    }
  }

  private async sleep(ms: number, runId: number) {
    let remaining = Math.max(0, ms);
    let last = performance.now();
    while (remaining > 0) {
      if (runId !== this.runId || !this.active) return false;
      if (this.paused) {
        await new Promise((r) => setTimeout(r, 20));
        last = performance.now();
        continue;
      }
      const now = performance.now();
      remaining -= (now - last) * this.speed;
      last = now;
      await new Promise((r) => setTimeout(r, 10));
    }
    return runId === this.runId && this.active;
  }

  private armTrialDone(): Promise<string> {
    return new Promise((resolve) => {
      this.trialDoneResolver = resolve;
    });
  }

  async run(trials: TrialRecord[], hooks: ReplayHooks = {}) {
    this.runId += 1;
    const runId = this.runId;
    this.active = true;
    this.engine.reset();
    this.engine.assistMargin = 14;

    for (let i = 0; i < trials.length; i++) {
      if (runId !== this.runId || !this.active) return;
      if (hooks.stopBefore?.()) return;

      const rec = trials[i];
      this.engine.setupTrial(i, rec.targetPlatformWidth);
      this.engine.respawn();
      this.engine.forcedOutcome = rec.outcome === 'success' ? 'success' : 'failure';

      hooks.onTrialStart?.(i);

      const ready = await this.sleep(rec.landingToPressMs ?? 500, runId);
      if (!ready) return;

      this.engine.beginChargeVisual();
      const charged = await this.sleep(rec.pressToJumpMs ?? 100, runId);
      if (!charged) return;

      const trialDone = this.armTrialDone();
      this.engine.launchFromChargeTimeMs(rec.pressToJumpMs ?? 100);
      const outcome = await trialDone;
      if (outcome === 'abort' || runId !== this.runId) return;

      // Persist a copy of the replayed record so post-run analysis can read engine.trialRecords.
      this.engine.trialRecords.push({ ...rec, trial: i + 1 });

      hooks.onTrialEnd?.(i, outcome);
      if (hooks.stopBefore?.()) return;

      const settled = await this.sleep(600, runId);
      if (!settled) return;
    }

    this.active = false;
  }
}
