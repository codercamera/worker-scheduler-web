'use client';

import { useEffect, useMemo, useState } from 'react';

type Worker = { id:number; full_name:string; role_title:string|null; email:string|null; weekly_target_hours:number };
type Shift = { id:number; worker_id:number; title:string; starts_at:string; ends_at:string; status:string; notes:string|null };

type Dashboard = { workers:Worker[]; shifts:Shift[] };

function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}
function dateKey(date: Date) { return date.toISOString().slice(0,10); }
function fmtTime(value:string){ return new Date(value).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }

export default function Home() {
  const [data,setData]=useState<Dashboard>({workers:[],shifts:[]});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [weekStart,setWeekStart]=useState(()=>mondayOf(new Date()));
  const [panel,setPanel]=useState<'schedule'|'workers'>('schedule');
  const [shiftModal,setShiftModal]=useState(false);
  const [workerModal,setWorkerModal]=useState(false);
  const [saving,setSaving]=useState(false);
  const [shiftForm,setShiftForm]=useState({worker_id:'',title:'Shift',date:dateKey(new Date()),start:'09:00',end:'17:00',notes:''});
  const [workerForm,setWorkerForm]=useState({full_name:'',role_title:'',email:'',weekly_target_hours:'40'});

  async function load(){
    setLoading(true); setError('');
    try{
      const res=await fetch('/api/dashboard',{cache:'no-store'});
      if(!res.ok) throw new Error(await res.text());
      setData(await res.json());
    }catch(e){setError(e instanceof Error?e.message:'Failed to load');}
    finally{setLoading(false);}
  }
  useEffect(()=>{load();},[]);

  const days=useMemo(()=>Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d;}),[weekStart]);
  const weeklyShifts=useMemo(()=>data.shifts.filter(s=>{const d=new Date(s.starts_at);return d>=weekStart&&d<new Date(weekStart.getTime()+7*86400000);}),[data.shifts,weekStart]);
  const scheduledHours=weeklyShifts.reduce((sum,s)=>sum+(new Date(s.ends_at).getTime()-new Date(s.starts_at).getTime())/3600000,0);
  const workersScheduled=new Set(weeklyShifts.map(s=>s.worker_id)).size;

  async function addWorker(e:React.FormEvent){
    e.preventDefault(); setSaving(true); setError('');
    try{
      const res=await fetch('/api/workers',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(workerForm)});
      if(!res.ok) throw new Error((await res.json()).error||'Could not create worker');
      setWorkerModal(false); setWorkerForm({full_name:'',role_title:'',email:'',weekly_target_hours:'40'}); await load();
    }catch(e){setError(e instanceof Error?e.message:'Could not create worker');}
    finally{setSaving(false);}
  }

  async function addShift(e:React.FormEvent){
    e.preventDefault(); setSaving(true); setError('');
    try{
      const res=await fetch('/api/shifts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(shiftForm)});
      const body=await res.json(); if(!res.ok) throw new Error(body.error||'Could not create shift');
      setShiftModal(false); await load();
    }catch(e){setError(e instanceof Error?e.message:'Could not create shift');}
    finally{setSaving(false);}
  }

  async function removeShift(id:number){
    if(!confirm('Delete this shift?')) return;
    const res=await fetch(`/api/shifts?id=${id}`,{method:'DELETE'});
    if(!res.ok){const body=await res.json();setError(body.error||'Could not delete shift');return;}
    await load();
  }

  const moveWeek=(n:number)=>{const d=new Date(weekStart);d.setDate(d.getDate()+n*7);setWeekStart(d)};
  const initials=(name:string)=>name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">W</div><div><strong>Workly</strong><span>Scheduler</span></div></div>
      <nav><button className={panel==='schedule'?'active':''} onClick={()=>setPanel('schedule')}>Schedule</button><button className={panel==='workers'?'active':''} onClick={()=>setPanel('workers')}>Workers</button><button disabled>Availability</button><button disabled>Leave requests</button><button disabled>Reports</button></nav>
      <div className="profile"><div className="avatar">AD</div><div><strong>Admin</strong><span>Administrator</span></div></div>
    </aside>
    <section className="content">
      <header className="topbar"><div><p className="eyebrow">WORKFORCE MANAGEMENT</p><h1>{panel==='schedule'?'Schedule':'Workers'}</h1><p className="subtle">{panel==='schedule'?'Plan shifts, balance hours, and prevent overlaps.':'Manage the people available for scheduling.'}</p></div><div className="top-actions"><button className="secondary" onClick={()=>setWorkerModal(true)}>+ Worker</button>{panel==='schedule'&&<button className="primary" onClick={()=>{setShiftForm(f=>({...f,worker_id:f.worker_id||String(data.workers[0]?.id||''),date:dateKey(days[0])}));setShiftModal(true)}} disabled={!data.workers.length}>+ Add shift</button>}</div></header>
      {error&&<div className="error-banner">{error}</div>}
      {loading?<div className="loading">Loading scheduler…</div>:panel==='schedule'?<>
        <section className="stats"><article><span>Scheduled hours</span><strong>{scheduledHours.toFixed(1)}h</strong><small>This week</small></article><article><span>Workers scheduled</span><strong>{workersScheduled}</strong><small>{data.workers.length} total workers</small></article><article><span>Shifts</span><strong>{weeklyShifts.length}</strong><small>Current week</small></article><article><span>Conflicts</span><strong>0</strong><small>Overlaps are blocked</small></article></section>
        <section className="calendar-card"><div className="calendar-toolbar"><div className="toolbar-left"><button onClick={()=>moveWeek(-1)}>‹</button><button onClick={()=>setWeekStart(mondayOf(new Date()))}>Today</button><button onClick={()=>moveWeek(1)}>›</button><strong>{days[0].toLocaleDateString(undefined,{month:'short',day:'numeric'})} – {days[6].toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</strong></div></div>
          <div className="schedule-grid"><div className="corner">Worker</div>{days.map(d=><div className="day-head" key={dateKey(d)}>{d.toLocaleDateString(undefined,{weekday:'short',day:'numeric'})}</div>)}
          {data.workers.map(w=><div className="row-fragment" key={w.id}><div className="worker-cell"><div className="avatar small">{initials(w.full_name)}</div><div><strong>{w.full_name}</strong><span>{w.role_title||'Worker'}</span></div></div>{days.map(d=>{const dayShifts=weeklyShifts.filter(s=>s.worker_id===w.id&&dateKey(new Date(s.starts_at))===dateKey(d));return <div className="shift-cell" key={dateKey(d)}>{dayShifts.map(s=><button className="shift" key={s.id} onClick={()=>removeShift(s.id)} title="Click to delete"><strong>{s.title}</strong><span>{fmtTime(s.starts_at)} – {fmtTime(s.ends_at)}</span></button>)}</div>})}</div>)}</div>
          {!data.workers.length&&<div className="empty-state">No workers yet. Add your first worker to start scheduling.</div>}
        </section>
      </>:<section className="workers-card"><div className="workers-table"><div className="table-head"><span>Name</span><span>Role</span><span>Email</span><span>Target</span></div>{data.workers.map(w=><div className="table-row" key={w.id}><span><div className="avatar small">{initials(w.full_name)}</div><strong>{w.full_name}</strong></span><span>{w.role_title||'—'}</span><span>{w.email||'—'}</span><span>{w.weekly_target_hours}h/week</span></div>)}</div></section>}
    </section>

    {workerModal&&<div className="modal-backdrop" onMouseDown={()=>setWorkerModal(false)}><form className="modal" onSubmit={addWorker} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">NEW WORKER</p><h2>Add worker</h2></div><button type="button" className="icon-btn" onClick={()=>setWorkerModal(false)}>×</button></div><label>Full name<input required value={workerForm.full_name} onChange={e=>setWorkerForm({...workerForm,full_name:e.target.value})}/></label><label>Role<input value={workerForm.role_title} onChange={e=>setWorkerForm({...workerForm,role_title:e.target.value})}/></label><label>Email<input type="email" value={workerForm.email} onChange={e=>setWorkerForm({...workerForm,email:e.target.value})}/></label><label>Weekly target hours<input type="number" min="1" max="168" value={workerForm.weekly_target_hours} onChange={e=>setWorkerForm({...workerForm,weekly_target_hours:e.target.value})}/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setWorkerModal(false)}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving…':'Add worker'}</button></div></form></div>}

    {shiftModal&&<div className="modal-backdrop" onMouseDown={()=>setShiftModal(false)}><form className="modal" onSubmit={addShift} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">NEW SHIFT</p><h2>Create shift</h2></div><button type="button" className="icon-btn" onClick={()=>setShiftModal(false)}>×</button></div><label>Worker<select required value={shiftForm.worker_id} onChange={e=>setShiftForm({...shiftForm,worker_id:e.target.value})}>{data.workers.map(w=><option value={w.id} key={w.id}>{w.full_name}</option>)}</select></label><label>Shift title<input required value={shiftForm.title} onChange={e=>setShiftForm({...shiftForm,title:e.target.value})}/></label><div className="form-grid"><label>Date<input type="date" required value={shiftForm.date} onChange={e=>setShiftForm({...shiftForm,date:e.target.value})}/></label><label>Start<input type="time" required value={shiftForm.start} onChange={e=>setShiftForm({...shiftForm,start:e.target.value})}/></label><label>End<input type="time" required value={shiftForm.end} onChange={e=>setShiftForm({...shiftForm,end:e.target.value})}/></label></div><label>Notes<textarea rows={3} value={shiftForm.notes} onChange={e=>setShiftForm({...shiftForm,notes:e.target.value})}/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShiftModal(false)}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving…':'Create shift'}</button></div></form></div>}
  </main>
}
