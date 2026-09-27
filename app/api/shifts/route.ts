import { NextResponse } from 'next/server';
import { ensureSchema, pool } from '@/lib/db';

function bangkokDate(date:string,time:string){
  return new Date(`${date}T${time}:00+07:00`);
}

export async function POST(request:Request){
  try{
    await ensureSchema();
    const body=await request.json();
    const workerId=Number(body.worker_id);
    const title=String(body.title||'').trim();
    const date=String(body.date||'');
    const startText=String(body.start||'');
    const endText=String(body.end||'');

    if(!workerId||!title||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(startText)||!/^\d{2}:\d{2}$/.test(endText)){
      return NextResponse.json({error:'Please complete worker, title, date, start time, and end time.'},{status:400});
    }

    const start=bangkokDate(date,startText);
    let end=bangkokDate(date,endText);
    if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())){
      return NextResponse.json({error:'The date or time is invalid.'},{status:400});
    }

    // Treat an end time equal to or earlier than start as an overnight shift.
    if(end<=start) end=new Date(end.getTime()+24*60*60*1000);
    const durationHours=(end.getTime()-start.getTime())/3600000;
    if(durationHours<=0||durationHours>24){
      return NextResponse.json({error:'A shift must be longer than 0 hours and no longer than 24 hours.'},{status:400});
    }

    const worker=await pool.query('select id from workers where id=$1 and active=true',[workerId]);
    if(!worker.rowCount){
      return NextResponse.json({error:'That worker no longer exists or is inactive. Refresh and try again.'},{status:400});
    }

    const conflict=await pool.query(
      `select id,title,starts_at,ends_at from shifts
       where worker_id=$1 and status <> 'cancelled'
       and starts_at < $3 and ends_at > $2 limit 1`,
      [workerId,start.toISOString(),end.toISOString()]
    );
    if(conflict.rowCount){
      return NextResponse.json({error:'This worker already has a shift that overlaps this time range.'},{status:409});
    }

    const result=await pool.query(
      `insert into shifts(worker_id,title,starts_at,ends_at,notes)
       values($1,$2,$3,$4,$5)
       returning id,worker_id,title,starts_at,ends_at,status,notes`,
      [workerId,title,start.toISOString(),end.toISOString(),String(body.notes||'').trim()||null]
    );
    return NextResponse.json(result.rows[0],{status:201});
  }catch(error){
    console.error('create shift failed',error);
    return NextResponse.json({error:'Could not create shift. Please try again.'},{status:500});
  }
}

export async function DELETE(request:Request){
  try{
    await ensureSchema();
    const id=Number(new URL(request.url).searchParams.get('id'));
    if(!id) return NextResponse.json({error:'Invalid shift id'},{status:400});
    await pool.query('delete from shifts where id=$1',[id]);
    return NextResponse.json({ok:true});
  }catch(error){
    console.error(error);
    return NextResponse.json({error:'Could not delete shift'},{status:500});
  }
}
