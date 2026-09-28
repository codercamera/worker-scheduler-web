import { NextResponse } from 'next/server';
import { ensureSchema, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  if (!process.env.RESET_TOKEN || token !== process.env.RESET_TOKEN) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await ensureSchema();
  await pool.query(`
    TRUNCATE TABLE
      user_sessions,
      app_users,
      worker_availability,
      leave_requests,
      shifts,
      workers
    RESTART IDENTITY CASCADE;
  `);

  return NextResponse.json({ ok: true, reset: true });
}
