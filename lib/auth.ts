import {createHash,randomBytes} from 'crypto';
import {cookies} from 'next/headers';
import {ensureSchema,pool} from '@/lib/db';

export type AppRole='admin'|'authorizer'|'hrm'|'worker';
export type SessionUser={id:number;full_name:string;email:string;role:AppRole;worker_id:number|null};

const COOKIE_NAME='workly_session';
const SESSION_DAYS=30;

function hashToken(token:string){return createHash('sha256').update(token).digest('hex')}

export async function createSession(userId:number){
  await ensureSchema();
  const token=randomBytes(32).toString('hex');
  const tokenHash=hashToken(token);
  const expires=new Date(Date.now()+SESSION_DAYS*24*60*60*1000);
  await pool.query('delete from user_sessions where expires_at <= now()');
  await pool.query('insert into user_sessions(user_id,token_hash,expires_at) values($1,$2,$3)',[userId,tokenHash,expires]);
  const jar=await cookies();
  jar.set(COOKIE_NAME,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',expires});
}

export async function destroySession(){
  const jar=await cookies();
  const token=jar.get(COOKIE_NAME)?.value;
  if(token){
    await ensureSchema();
    await pool.query('delete from user_sessions where token_hash=$1',[hashToken(token)]);
  }
  jar.set(COOKIE_NAME,'',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',expires:new Date(0)});
}

export async function getCurrentUser():Promise<SessionUser|null>{
  const jar=await cookies();
  const token=jar.get(COOKIE_NAME)?.value;
  if(!token)return null;
  await ensureSchema();
  const result=await pool.query(`
    select u.id,u.full_name,u.email,u.role,u.worker_id
    from user_sessions s
    join app_users u on u.id=s.user_id
    where s.token_hash=$1 and s.expires_at>now() and u.active=true
    limit 1
  `,[hashToken(token)]);
  if(!result.rowCount)return null;
  return result.rows[0] as SessionUser;
}

export async function requireUser(){
  const user=await getCurrentUser();
  if(!user)throw new Error('UNAUTHORIZED');
  return user;
}

export async function requireAdmin(){
  const user=await requireUser();
  if(user.role!=='admin')throw new Error('FORBIDDEN');
  return user;
}
