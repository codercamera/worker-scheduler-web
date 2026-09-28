import {NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {ensureSchema,pool} from '@/lib/db';
import {requireAdmin,AppRole} from '@/lib/auth';

const roles:AppRole[]=['admin','authorizer','hrm','worker'];

export async function GET(){
  try{
    await requireAdmin();
    await ensureSchema();
    const result=await pool.query(`select id,full_name,email,role,active,worker_id,created_at from app_users order by created_at asc`);
    return NextResponse.json({users:result.rows});
  }catch(error){
    if(error instanceof Error&&error.message==='UNAUTHORIZED')return NextResponse.json({error:'Unauthorized'},{status:401});
    if(error instanceof Error&&error.message==='FORBIDDEN')return NextResponse.json({error:'Forbidden'},{status:403});
    console.error(error);return NextResponse.json({error:'Could not load users.'},{status:500});
  }
}

export async function POST(request:Request){
  try{
    await requireAdmin();
    await ensureSchema();
    const body=await request.json();
    const fullName=String(body.full_name||'').trim();
    const email=String(body.email||'').trim().toLowerCase();
    const password=String(body.password||'');
    const role=String(body.role||'worker') as AppRole;
    const workerId=body.worker_id?Number(body.worker_id):null;
    if(fullName.length<2||!email.includes('@')||password.length<8||!roles.includes(role)) return NextResponse.json({error:'Enter valid user details, role, and a password of at least 8 characters.'},{status:400});
    const exists=await pool.query('select id from app_users where lower(email)=lower($1) limit 1',[email]);
    if(exists.rowCount)return NextResponse.json({error:'That email is already in use.'},{status:409});
    if(workerId){const worker=await pool.query('select id from workers where id=$1 and active=true',[workerId]);if(!worker.rowCount)return NextResponse.json({error:'Selected worker does not exist.'},{status:400});}
    const passwordHash=await bcrypt.hash(password,12);
    const result=await pool.query(`insert into app_users(full_name,email,password_hash,role,worker_id) values($1,$2,$3,$4,$5) returning id,full_name,email,role,active,worker_id,created_at`,[fullName,email,passwordHash,role,workerId]);
    return NextResponse.json({user:result.rows[0]},{status:201});
  }catch(error){
    if(error instanceof Error&&error.message==='UNAUTHORIZED')return NextResponse.json({error:'Unauthorized'},{status:401});
    if(error instanceof Error&&error.message==='FORBIDDEN')return NextResponse.json({error:'Forbidden'},{status:403});
    console.error(error);return NextResponse.json({error:'Could not create user.'},{status:500});
  }
}
