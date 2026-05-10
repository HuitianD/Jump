'use client';

import { useRef, useState } from 'react';
import { GameCanvas } from '@/components/GameCanvas';
import { GameEngine } from '@/lib/game/engine';
import { LiveController } from '@/lib/controllers/LiveController';
import { TOTAL_TRIALS } from '@/lib/game/config';

type Phase = 'idle' | 'playing' | 'done';

export default function PlayPage() {
  const [pid, setPid] = useState('');
  const [pidError, setPidError] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [paused, setPaused] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const engineRef = useRef<GameEngine | null>(null);
  const controllerRef = useRef<LiveController | null>(null);
  const pidRef = useRef(pid);
  pidRef.current = pid;

  if (!engineRef.current) {
    const engine = new GameEngine();
    const controller = new LiveController(engine);
    controller.enabled = false;
    engine.callbacks.onSessionComplete = () => {
      // Transition immediately — fetch runs in the background.
      setPhase('done');
      void submitResults(engine, pidRef.current);
    };
    engineRef.current = engine;
    controllerRef.current = controller;
  }
  const engine = engineRef.current!;
  const controller = controllerRef.current!;

  async function submitResults(e: GameEngine, participantId: string) {
    if (e.trialRecords.length < TOTAL_TRIALS) return;
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          submittedAt: new Date().toISOString(),
          successCount: e.successCount,
          failureCount: e.failureCount,
          totalTrials: TOTAL_TRIALS,
          successRate: e.successCount / TOTAL_TRIALS,
          trials: e.trialRecords,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSavedSessionId(data.sessionId);
    } catch {
      setSubmitError('Failed to save results.');
    }
  }

  function start() {
    const id = pid.trim();
    if (!id) {
      setPidError('Please enter a participant ID.');
      return;
    }
    setPidError('');
    engine.reset();
    controller.setEnabled(true);
    setSavedSessionId(null);
    setSubmitError(null);
    setPaused(false);
    setPhase('playing');
  }

  // Discard the in-progress run and return to the ID-entry phase.
  // Nothing is sent to MongoDB — partial sessions are not saved.
  function restart() {
    controller.setEnabled(false);
    engine.reset();
    setPaused(false);
    setSavedSessionId(null);
    setSubmitError(null);
    setPid('');
    setPhase('idle');
  }

  function reset() {
    controller.setEnabled(false);
    engine.reset();
    setPid('');
    setPhase('idle');
  }

  function togglePause() {
    setPaused((p) => !p);
  }

  return (
    <main className="play-shell">
      {phase === 'idle' && (
        <div className="play-id-card">
          <p className="play-hint">Enter a participant ID to start</p>
          <input
            type="text"
            value={pid}
            onChange={(e) => setPid(e.target.value)}
            placeholder="e.g. P042"
            autoComplete="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === 'Enter') start();
            }}
          />
          {pidError && <span className="error-hint">{pidError}</span>}
          <button className="btn" onClick={start}>
            Start
          </button>
        </div>
      )}

      {phase === 'playing' && (
        <div className="play-stage">
          <div className="action-row play-controls">
            <button className="btn" onClick={togglePause}>
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button className="btn btn-ghost" onClick={restart}>
              ↺ Restart
            </button>
          </div>
          <div className="canvas-shell">
            <GameCanvas
              engine={engine}
              paused={paused}
              onPointerDown={() => controller.handlePointerDown()}
              onPointerUp={() => controller.handlePointerUp()}
            />
          </div>
          <p className="play-hint">Hold to charge, release to jump</p>
        </div>
      )}

      {phase === 'done' && (
        <div className="play-id-card">
          <p className="play-hint">
            {savedSessionId
              ? `Session saved (id ${savedSessionId})`
              : submitError ?? 'Session complete'}
          </p>
          <button className="btn" onClick={reset}>
            Start new session
          </button>
        </div>
      )}
    </main>
  );
}
