import { NextResponse } from 'next/server';
import { ensureSchema, pool } from '@/lib/db';
import {requireUser} from '@/lib/auth';

export async function POST(request:Request){
  try{
    await requireUser();
    await ensureSchema();
    const body=await request.json();
    const workerId=Number(body.worker_id); const weekday=Number(body.weekday);
    const start=String(body.start_time||''); const end=String(body.end_time||'');
    const isAvailable=body.is_available!==false;
    if(!workerId||weekday<0||weekday>6||!/^\d{2}:\d{2}$/.test(start)||!/^\d{2}:\d{2}$/.test(end)||end<=start){
      return NextResponse.json({error:'Enter a valid worker, weekday, and time range.'},{status:400});
    }
    const worker=await pool.query('select id from workers where id=$1 and active=true',[workerId]);
    if(!worker.rowCount) return NextResponse.json({error:'Worker not found.'},{status:404});
    const overlap=await pool.query(`select id from worker_availability where worker_id=$1 and weekday=$2 and start_time < $4::time and end_time > $3::time limit 1`,[workerId,weekday,start,end]);
    if(overlap.rowCount) return NextResponse.json({error:'This availability range overlaps an existing range.'},{status:409});
    const result=await pool.query(`insert into worker_availability(worker_id,weekday,start_time,end_time,is_available,note) values($1,$2,$3,$4,$5,$6) returning *`,[workerId,weekday,start,end,isAvailable,String(body.note||'').trim()||null]);
    return NextResponse.json(result.rows[0],{status:201});
  }catch(error){if(error instanceof Error&&error.message==='UNAUTHORIZED')return NextResponse.json({error:'Unauthorized'},{status:401});console.error(error);return NextResponse.json({error:'Could not save availability.'},{status:500});}
}

export async function DELETE(request:Request){
  try{
    await requireUser();
    await ensureSchema();
    const id=Number(new URL(request.url).searchParams.get('id'));
    if(!id) return NextResponse.json({error:'Invalid availability id'},{status:400});
    await pool.query('delete from worker_availability where id=$1',[id]);
    return NextResponse.json({ok:true});
  }catch(error){if(error instanceof Error&&error.message==='UNAUTHORIZED')return NextResponse.json({error:'Unauthorized'},{status:401});console.error(error);return NextResponse.json({error:'Could not delete availability.'},{status:500});}
}
