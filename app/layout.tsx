import './globals.css';
import './accent.css';
import type { Metadata } from 'next';
import UserBadge from './user-badge';
import WorkerRowToggle from './worker-row-toggle';

export const metadata: Metadata = {
  title: 'Worker Scheduler',
  description: 'Multi-worker scheduling and shift management',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<UserBadge/><WorkerRowToggle/></body>
    </html>
  );
}
