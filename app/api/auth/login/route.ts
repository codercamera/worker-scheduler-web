import {NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {ensureSchema,pool} from '@/lib/db';
import {createSession} from '@/lib/auth';

export async function POST(request:Request){
  try{
    await ensureSchema();
    const body=await request.json();
    const email=String(body.email||'').trim().toLowerCase();
    const password=String(body.password||'');
    const result=await pool.query('select id,full_name,email,password_hash,role,active from app_users where lower(email)=lower($1) limit 1',[email]);
    if(!result.rowCount||!result.rows[0].active) return NextResponse.json({error:'Invalid email or password.'},{status:401});
    const ok=await bcrypt.compare(password,result.rows[0].password_hash);
    if(!ok) return NextResponse.json({error:'Invalid email or password.'},{status:401});
    await createSession(Number(result.rows[0].id));
    return NextResponse.json({user:{id:result.rows[0].id,full_name:result.rows[0].full_name,email:result.rows[0].email,role:result.rows[0].role}});
  }catch(error){console.error(error);return NextResponse.json({error:'Could not sign in.'},{status:500});}
}
