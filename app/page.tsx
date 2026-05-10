import Link from 'next/link';
import { PageShell } from '@/components/PageShell';

export default function HomePage() {
  return (
    <PageShell
      title="Jump Game"
      subtitle="Charge-jump platform game for the David Levari Lab. Choose a mode below."
    >
      <section className="mode-grid">
        <Link href="/play" className="mode-card">
          <h2>Play</h2>
          <p>Run an 18-trial experiment session and submit results.</p>
        </Link>
        <Link href="/replay" className="mode-card">
          <h2>Replay</h2>
          <p>Load any saved session and watch it play back at your chosen speed.</p>
        </Link>
        <Link href="/intervene" className="mode-card">
          <h2>Intervention</h2>
          <p>Auto-replay a session, then hand control to a participant mid-run.</p>
        </Link>
      </section>
    </PageShell>
  );
}
