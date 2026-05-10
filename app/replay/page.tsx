'use client';

import { useEffect, useRef, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { GameCanvas } from '@/components/GameCanvas';
import { SessionPicker } from '@/components/SessionPicker';
import { StatsPanel } from '@/components/StatsPanel';
import { GameEngine, getTrialPhase } from '@/lib/game/engine';
import { ReplayController } from '@/lib/controllers/ReplayController';
import { SessionDoc } from '@/lib/game/types';
import { TOTAL_TRIALS } from '@/lib/game/config';

const SPEED_OPTIONS = [0.5, 1, 2, 3];

export default function ReplayPage() {
  const engineRef = useRef<GameEngine | null>(null);
  const controllerRef = useRef<ReplayController | null>(null);
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [, setTick] = useState(0);
  const force = () => setTick((t) => t + 1);

  if (!engineRef.current) {
    const engine = new GameEngine();
    const controller = new ReplayController(engine);
    engineRef.current = engine;
    controllerRef.current = controller;
  }
  const engine = engineRef.current!;
  const controller = controllerRef.current!;

  useEffect(() => {
    const id = setInterval(force, 200);
    return () => clearInterval(id);
  }, []);

  function loadSession(s: SessionDoc) {
    controller.abort();
    setSession(s);
    setRunning(false);
    setPaused(false);
    engine.reset();
  }

  async function play() {
    if (!session) return;
    setRunning(true);
    setPaused(false);
    controller.setSpeed(SPEED_OPTIONS[speedIdx]);
    await controller.run(session.trials.slice(0, TOTAL_TRIALS));
    setRunning(false);
  }

  function togglePause() {
    if (paused) {
      controller.resume();
      setPaused(false);
    } else {
      controller.pause();
      setPaused(true);
    }
  }

  function restart() {
    controller.abort();
    setRunning(false);
    setPaused(false);
    engine.reset();
    setTimeout(play, 60);
  }

  const phase = getTrialPhase(Math.min(engine.trial, TOTAL_TRIALS - 1));

  return (
    <PageShell title="Jump Game — Replay" subtitle="Load a saved session and watch it play back.">
      <SessionPicker onLoad={loadSession} loadButtonLabel="Load & Watch" />
      <div className="main-grid">
        <section className="stage-card">
          <div className="stage-top">
            <span className="status-line">
              {!session
                ? 'No session loaded'
                : running
                  ? `Trial ${Math.min(engine.trial + 1, TOTAL_TRIALS)} / ${TOTAL_TRIALS}`
                  : engine.gameEnded
                    ? 'Replay complete'
                    : 'Ready — press Play'}
            </span>
          </div>

          <div className="canvas-shell">
            <GameCanvas engine={engine} />
          </div>

          <div className="action-row">
            <button className="btn" onClick={play} disabled={!session || running}>
              {engine.gameEnded ? 'Replay' : 'Play'}
            </button>
            <button className="btn" onClick={togglePause} disabled={!running}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button className="btn btn-ghost" onClick={restart} disabled={!session}>
              Restart
            </button>
            <div className="speed-wrap">
              <label htmlFor="speed-slider">Speed</label>
              <input
                id="speed-slider"
                type="range"
                min={0}
                max={3}
                step={1}
                value={speedIdx}
                onChange={(e) => {
                  const idx = +e.target.value;
                  setSpeedIdx(idx);
                  controller.setSpeed(SPEED_OPTIONS[idx]);
                }}
              />
              <span id="speed-label">{SPEED_OPTIONS[speedIdx]}×</span>
            </div>
          </div>
        </section>

        <StatsPanel
          successCount={session?.successCount ?? 0}
          failureCount={session?.failureCount ?? 0}
          trialRecords={session?.trials ?? []}
          phaseName={phase.name}
          phaseDescription={phase.description}
        />
      </div>
    </PageShell>
  );
}
