import { NextResponse } from 'next/server';
import { ensureSchema, pool } from '@/lib/db';

export async function POST(request:Request){
  try{
    await ensureSchema();
    const body=await request.json();
    const workerId=Number(body.worker_id);
    const start=new Date(`${body.date}T${body.start}:00+07:00`);
    const end=new Date(`${body.date}T${body.end}:00+07:00`);
    if(!workerId||!body.title?.trim()||Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<=start){
      return NextResponse.json({error:'Enter a valid worker, title, date, and time range'},{status:400});
    }
    const conflict=await pool.query(`select id,title,starts_at,ends_at from shifts where worker_id=$1 and status <> 'cancelled' and starts_at < $3 and ends_at > $2 limit 1`,[workerId,start.toISOString(),end.toISOString()]);
    if(conflict.rowCount){return NextResponse.json({error:'This worker already has an overlapping shift'},{status:409});}
    const result=await pool.query(`insert into shifts(worker_id,title,starts_at,ends_at,notes) values($1,$2,$3,$4,$5) returning id,worker_id,title,starts_at,ends_at,status,notes`,[workerId,body.title.trim(),start.toISOString(),end.toISOString(),body.notes?.trim()||null]);
    return NextResponse.json(result.rows[0],{status:201});
  }catch(error){console.error(error);return NextResponse.json({error:'Could not create shift'},{status:500});}
}

export async function DELETE(request:Request){
  try{
    await ensureSchema();
    const id=Number(new URL(request.url).searchParams.get('id'));
    if(!id) return NextResponse.json({error:'Invalid shift id'},{status:400});
    await pool.query('delete from shifts where id=$1',[id]);
    return NextResponse.json({ok:true});
  }catch(error){console.error(error);return NextResponse.json({error:'Could not delete shift'},{status:500});}
}
