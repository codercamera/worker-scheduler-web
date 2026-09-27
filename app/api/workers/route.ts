import { NextResponse } from 'next/server';
import { ensureSchema, pool } from '@/lib/db';

export async function POST(request:Request){
  try{
    await ensureSchema();
    const body=await request.json();
    if(!body.full_name?.trim()) return NextResponse.json({error:'Full name is required'},{status:400});
    const hours=Number(body.weekly_target_hours||40);
    const result=await pool.query(`insert into workers(full_name,role_title,email,weekly_target_hours) values($1,$2,$3,$4) returning id,full_name,role_title,email,weekly_target_hours::float8 as weekly_target_hours`,[
      body.full_name.trim(),body.role_title?.trim()||null,body.email?.trim()||null,Number.isFinite(hours)?hours:40
    ]);
    return NextResponse.json(result.rows[0],{status:201});
  }catch(error){
    console.error(error);
    return NextResponse.json({error:'Could not create worker'},{status:500});
  }
}
