'use client';

import { useEffect, useRef, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { GameCanvas } from '@/components/GameCanvas';
import { SessionPicker } from '@/components/SessionPicker';
import { StatsPanel } from '@/components/StatsPanel';
import { GameEngine, getTrialPhase } from '@/lib/game/engine';
import { InterventionController, InterventionMode } from '@/lib/controllers/InterventionController';
import { SessionDoc } from '@/lib/game/types';
import { TOTAL_TRIALS } from '@/lib/game/config';

export default function IntervenePage() {
  const engineRef = useRef<GameEngine | null>(null);
  const controllerRef = useRef<InterventionController | null>(null);

  const [session, setSession] = useState<SessionDoc | null>(null);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mode, setMode] = useState<InterventionMode>('replay');
  const [intervened, setIntervened] = useState(false);
  const [willIntervene, setWillIntervene] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [submitId, setSubmitId] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');

  const [, setTick] = useState(0);
  const force = () => setTick((t) => t + 1);

  if (!engineRef.current) {
    const engine = new GameEngine();
    const controller = new InterventionController(engine);
    controller.onModeChange = (m) => setMode(m);
    controller.onComplete = () => {
      setCompleted(true);
      setRunning(false);
    };
    engineRef.current = engine;
    controllerRef.current = controller;
  }
  const engine = engineRef.current!;
  const controller = controllerRef.current!;

  useEffect(() => {
    const id = setInterval(() => {
      setIntervened(controller.intervened);
      setWillIntervene(controller.willIntervene);
      force();
    }, 150);
    return () => clearInterval(id);
  }, [controller]);

  async function loadSession(s: SessionDoc) {
    controller.abort();
    setSession(s);
    setRunning(false);
    setPaused(false);
    setIntervened(false);
    setWillIntervene(false);
    setCompleted(false);
    setMode('replay');
    setSubmitStatus('');
    setSubmitError('');
    setSubmitId('');
    engine.reset();

    setTimeout(async () => {
      setRunning(true);
      await controller.run(s.trials.slice(0, TOTAL_TRIALS));
    }, 60);
  }

  function intervene() {
    if (controller.mode === 'live' || controller.intervened) return;
    controller.queueIntervention();
    setWillIntervene(true);
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
    if (session) loadSession(session);
  }

  async function submit() {
    if (!completed || !controller.intervened) return;
    const id = submitId.trim();
    if (!id) {
      setSubmitError('Please enter a participant ID.');
      return;
    }
    if (engine.trialRecords.length < TOTAL_TRIALS) {
      setSubmitError('Results are incomplete.');
      return;
    }

    setSubmitError('');
    setSubmitStatus('Submitting…');
    const participantId = `${id.replace(/_replay$/i, '')}_replay`;

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          submittedAt: new Date().toISOString(),
          successCount: engine.successCount,
          failureCount: engine.failureCount,
          totalTrials: TOTAL_TRIALS,
          successRate: engine.successCount / TOTAL_TRIALS,
          trials: engine.trialRecords.slice(0, TOTAL_TRIALS),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSubmitStatus(`Saved as ${participantId}. Session ID: ${data.sessionId}`);
    } catch {
      setSubmitStatus('Submission failed.');
    }
  }

  const phase = getTrialPhase(Math.min(engine.trial, TOTAL_TRIALS - 1));

  return (
    <PageShell
      title="Jump Game — Intervention"
      subtitle="Auto-replay a saved session, then click Intervene to hand control to the participant at the next trial."
    >
      <SessionPicker onLoad={loadSession} loadButtonLabel="Load & Start" />

      <div className="main-grid">
        <section className="stage-card">
          <div className="stage-top">
            <span className={`pill pill-${mode}`}>
              {mode === 'live' ? 'Participant Control' : 'Replay Autoplay'}
            </span>
            <span className={`pill ${willIntervene ? 'pill-queue' : ''}`}>
              {willIntervene
                ? 'Intervention Starts Next Trial'
                : intervened
                  ? 'Participant Intervened'
                  : 'No Intervention Queued'}
            </span>
            <span className="status-line">
              {!session
                ? 'Load a session to begin'
                : completed
                  ? intervened
                    ? 'Takeover complete — submit below'
                    : 'Replay complete'
                  : `Trial ${Math.min(engine.trial + 1, TOTAL_TRIALS)} / ${TOTAL_TRIALS}`}
            </span>
          </div>

          <div className="canvas-shell">
            <GameCanvas
              engine={engine}
              paused={paused || !running}
              onPointerDown={() => controller.handlePointerDown()}
              onPointerUp={() => controller.handlePointerUp()}
            />
          </div>

          <div className="action-row">
            <button className="btn" onClick={togglePause} disabled={!session || completed}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button className="btn btn-ghost" onClick={restart} disabled={!session}>
              Restart
            </button>
            <button
              className="btn btn-accent"
              onClick={intervene}
              disabled={!session || mode === 'live' || willIntervene || completed}
            >
              {mode === 'live'
                ? 'Live Control Active'
                : willIntervene
                  ? 'Intervention Queued'
                  : 'Intervene'}
            </button>
          </div>
        </section>

        <StatsPanel
          successCount={engine.successCount}
          failureCount={engine.failureCount}
          trialRecords={engine.trialRecords}
          phaseName={phase.name}
          phaseDescription={phase.description}
        />
      </div>

      {completed && intervened && (
        <section className="submit-card">
          <h2>Participant intervened — what's the ID?</h2>
          <p>
            Type the participant ID. The game appends <strong>_replay</strong> before saving to MongoDB.
          </p>
          <input
            type="text"
            value={submitId}
            onChange={(e) => setSubmitId(e.target.value)}
            placeholder="e.g. P042"
            autoComplete="off"
            spellCheck={false}
          />
          {submitError && <div className="error-hint">{submitError}</div>}
          <button className="btn btn-accent" onClick={submit}>
            Submit Results
          </button>
          {submitStatus && <div className="muted-meta">{submitStatus}</div>}
        </section>
      )}
    </PageShell>
  );
}
