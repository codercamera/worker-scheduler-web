import {NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {ensureSchema,pool} from '@/lib/db';
import {createSession} from '@/lib/auth';

export async function POST(request:Request){
  try{
    await ensureSchema();
    const count=await pool.query('select count(*)::int as count from app_users');
    if(Number(count.rows[0].count)!==0) return NextResponse.json({error:'Setup is already complete.'},{status:409});
    const body=await request.json();
    const fullName=String(body.full_name||'').trim();
    const email=String(body.email||'').trim().toLowerCase();
    const password=String(body.password||'');
    if(fullName.length<2||!email.includes('@')||password.length<8) return NextResponse.json({error:'Enter a name, valid email, and password of at least 8 characters.'},{status:400});
    const passwordHash=await bcrypt.hash(password,12);
    const result=await pool.query(`insert into app_users(full_name,email,password_hash,role) values($1,$2,$3,'admin') returning id,full_name,email,role`,[fullName,email,passwordHash]);
    await createSession(Number(result.rows[0].id));
    return NextResponse.json({user:result.rows[0]},{status:201});
  }catch(error){console.error(error);return NextResponse.json({error:'Could not create the first admin account.'},{status:500});}
}
