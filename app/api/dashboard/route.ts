import { NextResponse } from 'next/server';
import { ensureSchema, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(){
  try{
    await ensureSchema();
    const [workers,shifts]=await Promise.all([
      pool.query(`select id, full_name, role_title, email, weekly_target_hours::float8 as weekly_target_hours from workers where active = true order by full_name`),
      pool.query(`select id, worker_id, title, starts_at, ends_at, status, notes from shifts where starts_at >= now() - interval '60 days' and starts_at < now() + interval '180 days' order by starts_at`)
    ]);
    return NextResponse.json({workers:workers.rows,shifts:shifts.rows});
  }catch(error){
    console.error(error);
    return NextResponse.json({error:'Database unavailable'}, {status:500});
  }
}
