import { GameEngine } from '@/lib/game/engine';

export class LiveController {
  engine: GameEngine;
  enabled = true;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  handlePointerDown() {
    if (!this.enabled) return;
    this.engine.startCharging();
  }

  handlePointerUp() {
    if (!this.enabled) return;
    this.engine.releaseJump();
  }

  setEnabled(b: boolean) {
    this.enabled = b;
  }
}
