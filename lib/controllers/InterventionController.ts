import { GameEngine } from '@/lib/game/engine';
import { TrialRecord } from '@/lib/game/types';
import { LiveController } from './LiveController';
import { ReplayController } from './ReplayController';

export type InterventionMode = 'replay' | 'live';

export class InterventionController {
  engine: GameEngine;
  replay: ReplayController;
  live: LiveController;

  mode: InterventionMode = 'replay';
  intervened = false;
  willIntervene = false;

  onModeChange?: (mode: InterventionMode) => void;
  onTrialStart?: (idx: number) => void;
  onTrialEnd?: (idx: number, outcome: string) => void;
  onComplete?: () => void;

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.replay = new ReplayController(engine);
    this.live = new LiveController(engine);
    this.live.enabled = false;

    const baseSessionComplete = engine.callbacks.onSessionComplete;
    engine.callbacks.onSessionComplete = () => {
      baseSessionComplete?.();
      if (this.intervened) {
        this.onComplete?.();
      }
    };
  }

  queueIntervention() {
    if (this.mode === 'live' || this.intervened) return;
    this.willIntervene = true;
  }

  pause() {
    this.replay.pause();
  }

  resume() {
    this.replay.resume();
  }

  abort() {
    this.replay.abort();
    this.live.enabled = false;
  }

  handlePointerDown() {
    if (this.mode === 'live') this.live.handlePointerDown();
  }

  handlePointerUp() {
    if (this.mode === 'live') this.live.handlePointerUp();
  }

  async run(trials: TrialRecord[]) {
    this.mode = 'replay';
    this.intervened = false;
    this.willIntervene = false;
    this.live.enabled = false;
    this.onModeChange?.('replay');

    await this.replay.run(trials, {
      onTrialStart: (i) => this.onTrialStart?.(i),
      onTrialEnd: (i, outcome) => {
        this.onTrialEnd?.(i, outcome);
        if (this.willIntervene && i + 1 < trials.length) {
          this.activateLive();
        }
      },
      stopBefore: () => this.intervened,
    });

    if (!this.intervened) {
      this.onComplete?.();
    }
  }

  private activateLive() {
    this.intervened = true;
    this.willIntervene = false;
    this.mode = 'live';
    this.engine.assistMargin = 0;
    this.engine.forcedOutcome = null;
    this.replay.abort();
    this.live.enabled = true;
    this.onModeChange?.('live');
  }
}
