import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jump Game',
  description: 'Charge-jump platform game for the David Levari Lab — Brown CPS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
