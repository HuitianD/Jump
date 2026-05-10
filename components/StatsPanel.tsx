'use client';

import { TrialRecord } from '@/lib/game/types';

interface StatsPanelProps {
  successCount: number;
  failureCount: number;
  trialRecords: TrialRecord[];
  phaseName?: string;
  phaseDescription?: string;
}

function avgMs(values: number[]) {
  if (!values.length) return '—';
  return `${Math.round(values.reduce((a, b) => a + b, 0) / values.length)} ms`;
}

export function StatsPanel({
  successCount,
  failureCount,
  trialRecords,
  phaseName,
  phaseDescription,
}: StatsPanelProps) {
  const reactions = trialRecords
    .map((t) => t.landingToPressMs)
    .filter((v): v is number => v != null);
  const charges = trialRecords
    .map((t) => t.pressToJumpMs)
    .filter((v): v is number => v != null);

  return (
    <aside className="stats-card">
      <div className="stats-grid">
        <Stat label="Successes" value={String(successCount)} />
        <Stat label="Failures" value={String(failureCount)} />
        <Stat label="Avg Reaction" value={avgMs(reactions)} />
        <Stat label="Avg Charge" value={avgMs(charges)} />
      </div>
      {phaseName && (
        <div className="phase-card">
          <div className="phase-label">Current Phase</div>
          <div className="phase-value">{phaseName}</div>
          {phaseDescription && <div className="phase-desc">{phaseDescription}</div>}
        </div>
      )}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
