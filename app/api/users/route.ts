import {NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {ensureSchema,pool} from '@/lib/db';
import {requireAdmin,AppRole} from '@/lib/auth';

const manageableRoles:AppRole[]=['authorizer','hrm','worker'];

function authError(error:unknown){
  if(error instanceof Error&&error.message==='UNAUTHORIZED')return NextResponse.json({error:'Unauthorized'},{status:401});
  if(error instanceof Error&&error.message==='FORBIDDEN')return NextResponse.json({error:'Forbidden'},{status:403});
  return null;
}

async function validateWorkerLink(role:AppRole,workerId:number|null,excludeUserId?:number){
  if(!workerId)return null;
  if(role!=='worker')return NextResponse.json({error:'Only users with the Worker role can be linked to a worker.'},{status:400});
  const worker=await pool.query('select id from workers where id=$1 and active=true',[workerId]);
  if(!worker.rowCount)return NextResponse.json({error:'Selected worker does not exist.'},{status:400});
  const linked=excludeUserId
    ? await pool.query('select id from app_users where worker_id=$1 and id<>$2 limit 1',[workerId,excludeUserId])
    : await pool.query('select id from app_users where worker_id=$1 limit 1',[workerId]);
  if(linked.rowCount)return NextResponse.json({error:'That worker is already linked to another system user.'},{status:409});
  return null;
}

export async function GET(){
  try{
    await requireAdmin();
    await ensureSchema();
    const result=await pool.query(`select id,full_name,email,role,active,worker_id,created_at from app_users order by case when role='admin' then 0 else 1 end, created_at asc`);
    return NextResponse.json({users:result.rows});
  }catch(error){
    const response=authError(error);if(response)return response;
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
    if(fullName.length<2||!email.includes('@')||password.length<8||!manageableRoles.includes(role)) return NextResponse.json({error:'Enter valid user details. New accounts can only be Authorizer, HRM, or Worker.'},{status:400});
    const exists=await pool.query('select id from app_users where lower(email)=lower($1) limit 1',[email]);
    if(exists.rowCount)return NextResponse.json({error:'That email is already in use.'},{status:409});
    const linkError=await validateWorkerLink(role,workerId);if(linkError)return linkError;
    const passwordHash=await bcrypt.hash(password,12);
    const result=await pool.query(`insert into app_users(full_name,email,password_hash,role,worker_id) values($1,$2,$3,$4,$5) returning id,full_name,email,role,active,worker_id,created_at`,[fullName,email,passwordHash,role,workerId]);
    return NextResponse.json({user:result.rows[0]},{status:201});
  }catch(error){
    const response=authError(error);if(response)return response;
    console.error(error);return NextResponse.json({error:'Could not create user.'},{status:500});
  }
}

export async function PATCH(request:Request){
  try{
    await requireAdmin();
    await ensureSchema();
    const body=await request.json();
    const id=Number(body.id);
    const fullName=String(body.full_name||'').trim();
    const email=String(body.email||'').trim().toLowerCase();
    const role=String(body.role||'worker') as AppRole;
    const active=body.active!==false;
    const requestedWorkerId=body.worker_id?Number(body.worker_id):null;
    const workerId=role==='worker'?requestedWorkerId:null;
    const password=String(body.password||'');
    if(!id||fullName.length<2||!email.includes('@')||!manageableRoles.includes(role)) return NextResponse.json({error:'Enter valid user details and a non-Admin role.'},{status:400});
    if(password&&password.length<8)return NextResponse.json({error:'New password must be at least 8 characters.'},{status:400});
    const current=await pool.query('select id,role from app_users where id=$1',[id]);
    if(!current.rowCount)return NextResponse.json({error:'User not found.'},{status:404});
    if(current.rows[0].role==='admin')return NextResponse.json({error:'Admin accounts cannot be modified.'},{status:403});
    const duplicate=await pool.query('select id from app_users where lower(email)=lower($1) and id<>$2 limit 1',[email,id]);
    if(duplicate.rowCount)return NextResponse.json({error:'That email is already in use.'},{status:409});
    const linkError=await validateWorkerLink(role,workerId,id);if(linkError)return linkError;
    if(password){
      const passwordHash=await bcrypt.hash(password,12);
      await pool.query(`update app_users set full_name=$2,email=$3,role=$4,active=$5,worker_id=$6,password_hash=$7,updated_at=now() where id=$1`,[id,fullName,email,role,active,workerId,passwordHash]);
      await pool.query('delete from user_sessions where user_id=$1',[id]);
    }else{
      await pool.query(`update app_users set full_name=$2,email=$3,role=$4,active=$5,worker_id=$6,updated_at=now() where id=$1`,[id,fullName,email,role,active,workerId]);
      if(!active)await pool.query('delete from user_sessions where user_id=$1',[id]);
    }
    const result=await pool.query(`select id,full_name,email,role,active,worker_id,created_at from app_users where id=$1`,[id]);
    return NextResponse.json({user:result.rows[0]});
  }catch(error){
    const response=authError(error);if(response)return response;
    console.error(error);return NextResponse.json({error:'Could not update user.'},{status:500});
  }
}

export async function DELETE(request:Request){
  try{
    await requireAdmin();
    await ensureSchema();
    const id=Number(new URL(request.url).searchParams.get('id'));
    if(!id)return NextResponse.json({error:'Invalid user id.'},{status:400});
    const current=await pool.query('select role from app_users where id=$1',[id]);
    if(!current.rowCount)return NextResponse.json({error:'User not found.'},{status:404});
    if(current.rows[0].role==='admin')return NextResponse.json({error:'Admin accounts cannot be deleted.'},{status:403});
    await pool.query('delete from app_users where id=$1',[id]);
    return NextResponse.json({ok:true});
  }catch(error){
    const response=authError(error);if(response)return response;
    console.error(error);return NextResponse.json({error:'Could not delete user.'},{status:500});
  }
}
