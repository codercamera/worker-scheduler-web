import './globals.css';
import './accent.css';
import './mobile-header.css';
import type { Metadata } from 'next';
import UserBadge from './user-badge';
import WorkerRowToggle from './worker-row-toggle';
import {getCurrentUser} from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Worker Scheduler',
  description: 'Multi-worker scheduling and shift management',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user=await getCurrentUser();
  return (
    <html lang="en">
      <body data-role={user?.role??'guest'}>{children}<UserBadge/><WorkerRowToggle/></body>
    </html>
  );
}
