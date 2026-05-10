import Link from 'next/link';

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <div className="page">
      <header className="header-card">
        <h1>{title}</h1>
        {subtitle && <p className="subhead">{subtitle}</p>}
        <nav className="page-nav">
          <Link href="/play">Play</Link>
          <Link href="/replay">Replay</Link>
          <Link href="/intervene">Intervention</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
