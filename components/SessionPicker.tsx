'use client';

import { useEffect, useMemo, useState } from 'react';
import { SessionDoc } from '@/lib/game/types';

interface SessionPickerProps {
  onLoad: (session: SessionDoc) => void;
  loadButtonLabel?: string;
}

function sessionOptionText(s: SessionDoc, totalCount: number, idx: number) {
  const num = totalCount - idx;
  const pid = s.participantId ? `[${s.participantId}]` : '[no ID]';
  const date = s.submittedAt ? new Date(s.submittedAt).toLocaleString() : 'Unknown date';
  const total = s.totalTrials ?? s.trials?.length ?? 0;
  const pct = Number.isFinite(s.successRate) ? `${Math.round(s.successRate * 100)}%` : '—';
  return `${pid} — Session #${num} — ${date} — ${s.successCount ?? 0}/${total} success — ${pct}`;
}

export function SessionPicker({ onLoad, loadButtonLabel = 'Load' }: SessionPickerProps) {
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/sessions')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: SessionDoc[]) => {
        if (cancelled) return;
        setSessions(data);
        if (data.length) setSelected(data[0]._id);
      })
      .catch(() => {
        if (!cancelled) setError('Could not connect to the server.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = appliedQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => (s.participantId || '').toLowerCase().includes(q));
  }, [sessions, appliedQuery]);

  useEffect(() => {
    if (!filtered.length) {
      setSelected('');
    } else if (!filtered.some((s) => s._id === selected)) {
      setSelected(filtered[0]._id);
    }
  }, [filtered, selected]);

  async function load() {
    if (!selected) return;
    setLoadingDetail(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${selected}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SessionDoc = await res.json();
      onLoad(data);
    } catch {
      setError('Failed to load session.');
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <section className="toolbar-card">
      {error && <div className="error-banner">{error}</div>}
      <div className="toolbar-row">
        <label htmlFor="pid-search">Participant ID</label>
        <input
          id="pid-search"
          type="text"
          className="search-input"
          placeholder="e.g. P042"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setAppliedQuery(query);
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <button className="btn" onClick={() => setAppliedQuery(query)}>
          Search
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setQuery('');
            setAppliedQuery('');
          }}
        >
          Show All
        </button>
        <span className="muted-meta">
          {filtered.length} session{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="toolbar-row">
        <select
          className="session-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={loading || filtered.length === 0}
        >
          {loading && <option value="">Loading sessions…</option>}
          {!loading && filtered.length === 0 && <option value="">No matching sessions</option>}
          {!loading &&
            filtered.map((s) => (
              <option key={s._id} value={s._id}>
                {sessionOptionText(s, sessions.length, sessions.indexOf(s))}
              </option>
            ))}
        </select>
        <button className="btn" onClick={load} disabled={!selected || loadingDetail}>
          {loadingDetail ? 'Loading…' : loadButtonLabel}
        </button>
      </div>
    </section>
  );
}
