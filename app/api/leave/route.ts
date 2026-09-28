import { NextResponse } from 'next/server';
import { ensureSchema, pool } from '@/lib/db';
import {requireUser} from '@/lib/auth';

export async function POST(request:Request){
  try{
    const user=await requireUser();
    await ensureSchema();
    const body=await request.json();
    const requestedWorkerId=Number(body.worker_id);
    const workerId=user.role==='worker'?Number(user.worker_id):requestedWorkerId;
    const leaveType=String(body.leave_type||'annual').trim().toLowerCase();
    const startsOn=String(body.starts_on||'');
    const endsOn=String(body.ends_on||'');
    const reason=String(body.reason||'').trim();

    if(user.role==='worker'&&!user.worker_id){
      return NextResponse.json({error:'Your account is not linked to a worker profile.'},{status:400});
    }
    if(!workerId||!/^\d{4}-\d{2}-\d{2}$/.test(startsOn)||!/^\d{4}-\d{2}-\d{2}$/.test(endsOn)||endsOn<startsOn){
      return NextResponse.json({error:'Choose a worker and a valid leave date range.'},{status:400});
    }

    const worker=await pool.query('select id from workers where id=$1 and active=true',[workerId]);
    if(!worker.rowCount) return NextResponse.json({error:'That worker does not exist or is inactive.'},{status:400});

    const duplicate=await pool.query(`select id from leave_requests where worker_id=$1 and status in ('pending','approved') and starts_on <= $3::date and ends_on >= $2::date limit 1`,[workerId,startsOn,endsOn]);
    if(duplicate.rowCount) return NextResponse.json({error:'This worker already has a pending or approved leave request overlapping those dates.'},{status:409});

    const result=await pool.query(`insert into leave_requests(worker_id,leave_type,starts_on,ends_on,reason) values($1,$2,$3,$4,$5) returning *`,[workerId,leaveType||'annual',startsOn,endsOn,reason||null]);
    return NextResponse.json(result.rows[0],{status:201});
  }catch(error){
    if(error instanceof Error&&error.message==='UNAUTHORIZED')return NextResponse.json({error:'Unauthorized'},{status:401});
    console.error('create leave failed',error);
    return NextResponse.json({error:'Could not create leave request.'},{status:500});
  }
}

export async function PATCH(request:Request){
  try{
    const user=await requireUser();
    await ensureSchema();
    const body=await request.json();
    const id=Number(body.id);
    const status=String(body.status||'').toLowerCase();
    const managerNote=String(body.manager_note||'').trim();
    const cancellationReason=String(body.cancellation_reason||'').trim();
    if(!id||!['approved','rejected','cancelled'].includes(status)) return NextResponse.json({error:'Invalid leave request update.'},{status:400});

    const current=await pool.query('select * from leave_requests where id=$1',[id]);
    if(!current.rowCount) return NextResponse.json({error:'Leave request not found.'},{status:404});
    const leave=current.rows[0];

    if(user.role==='worker'){
      if(!user.worker_id||Number(leave.worker_id)!==Number(user.worker_id)) return NextResponse.json({error:'You can only update your own leave requests.'},{status:403});
      if(status!=='cancelled') return NextResponse.json({error:'Workers cannot approve or reject leave requests.'},{status:403});
      if(!['pending','approved'].includes(String(leave.status))) return NextResponse.json({error:'Only pending or approved leave requests can be cancelled.'},{status:409});
      if(!cancellationReason) return NextResponse.json({error:'Cancellation reason is required.'},{status:400});
      const result=await pool.query(`update leave_requests set status='cancelled', cancellation_reason=$2, reviewed_at=now() where id=$1 returning *`,[id,cancellationReason]);
      return NextResponse.json(result.rows[0]);
    }

    if(status==='approved'){
      const conflicts=await pool.query(`select id,title,starts_at,ends_at from shifts where worker_id=$1 and status <> 'cancelled' and (starts_at at time zone 'Asia/Bangkok')::date <= $3::date and (ends_at at time zone 'Asia/Bangkok')::date >= $2::date order by starts_at`,[leave.worker_id,leave.starts_on,leave.ends_on]);
      if(conflicts.rowCount) return NextResponse.json({error:`Cannot approve leave while ${conflicts.rowCount} scheduled shift(s) overlap the requested dates.`},{status:409});
    }

    const result=await pool.query(`update leave_requests set status=$2, manager_note=$3, cancellation_reason=case when $2='cancelled' then $4 else cancellation_reason end, reviewed_at=now() where id=$1 returning *`,[id,status,managerNote||null,cancellationReason||null]);
    return NextResponse.json(result.rows[0]);
  }catch(error){
    if(error instanceof Error&&error.message==='UNAUTHORIZED')return NextResponse.json({error:'Unauthorized'},{status:401});
    console.error('update leave failed',error);
    return NextResponse.json({error:'Could not update leave request.'},{status:500});
  }
}
