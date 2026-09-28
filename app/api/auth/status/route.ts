import {NextResponse} from 'next/server';
import {ensureSchema,pool} from '@/lib/db';
import {getCurrentUser} from '@/lib/auth';

export const dynamic='force-dynamic';

export async function GET(){
  await ensureSchema();
  const [count,user]=await Promise.all([
    pool.query('select count(*)::int as count from app_users'),
    getCurrentUser()
  ]);
  return NextResponse.json({setupRequired:Number(count.rows[0].count)===0,user});
}
