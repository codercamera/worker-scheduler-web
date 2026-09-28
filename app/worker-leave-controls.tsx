'use client';

import {useEffect,useState} from 'react';

type User={role:'admin'|'authorizer'|'hrm'|'worker';worker_id:number|null};
type Leave={id:number;worker_id:number;worker_name:string;leave_type:string;starts_on:string;ends_on:string;reason:string|null;status:'pending'|'approved'|'rejected'|'cancelled';cancellation_reason:string|null};

export default function WorkerLeaveControls(){
  const [user,setUser]=useState<User|null>(null);
  const [leaves,setLeaves]=useState<Leave[]>([]);
  const [target,setTarget]=useState<Leave|null>(null);
  const [reason,setReason]=useState('');
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [isThai,setIsThai]=useState(false);

  useEffect(()=>{
    setIsThai(document.documentElement.lang==='th');
    const langObserver=new MutationObserver(()=>setIsThai(document.documentElement.lang==='th'));
    langObserver.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    let active=true;
    async function init(){
      const auth=await fetch('/api/auth/status',{cache:'no-store'}).then(r=>r.json());
      if(!active||auth.user?.role!=='worker')return;
      setUser(auth.user);
      const data=await fetch('/api/dashboard',{cache:'no-store'}).then(r=>r.json());
      if(!active)return;
      setLeaves(data.leaveRequests||[]);
    }
    init().catch(()=>{});
    return()=>{active=false;langObserver.disconnect()};
  },[]);

  useEffect(()=>{
    if(!user||user.role!=='worker')return;
    function sync(){
      const rows=Array.from(document.querySelectorAll<HTMLElement>('.leave-card .leave-row'));
      rows.forEach((row,index)=>{
        const leave=leaves[index];
        if(!leave)return;
        const actions=row.querySelector<HTMLElement>('.leave-actions');
        if(!actions)return;
        actions.querySelectorAll('.worker-cancel-btn').forEach(x=>x.remove());
        if(leave.status==='pending'||leave.status==='approved'){
          const btn=document.createElement('button');
          btn.type='button';
          btn.className='worker-cancel-btn reject-btn';
          btn.textContent=isThai?'ยกเลิกคำขอ':'Cancel request';
          btn.onclick=()=>{setTarget(leave);setReason('');setError('')};
          actions.appendChild(btn);
        }
        if(leave.status==='cancelled'&&leave.cancellation_reason){
          let note=row.querySelector<HTMLElement>('.worker-cancel-reason');
          if(!note){note=document.createElement('div');note.className='worker-cancel-reason';row.appendChild(note)}
          note.textContent=(isThai?'เหตุผลที่ยกเลิก: ':'Cancellation reason: ')+leave.cancellation_reason;
        }
      });

      document.querySelectorAll<HTMLElement>('.modal').forEach(modal=>{
        const heading=modal.querySelector('h2')?.textContent?.trim().toLowerCase();
        if(heading==='request leave'||heading==='ขอลางาน'){
          const select=modal.querySelector<HTMLSelectElement>('select');
          if(select&&user.worker_id){
            select.value=String(user.worker_id);
            select.dispatchEvent(new Event('change',{bubbles:true}));
            select.disabled=true;
            const label=select.closest('label');
            if(label)label.classList.add('worker-self-field');
          }
        }
      });
    }
    sync();
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[user,leaves,isThai]);

  if(!user||user.role!=='worker')return null;

  async function cancelLeave(){
    if(!target||!reason.trim())return;
    setSaving(true);setError('');
    try{
      const r=await fetch('/api/leave',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:target.id,status:'cancelled',cancellation_reason:reason.trim()})});
      const b=await r.json();
      if(!r.ok)throw new Error(b.error||'Could not cancel leave request.');
      window.location.reload();
    }catch(e){setError(e instanceof Error?e.message:'Could not cancel leave request.');setSaving(false)}
  }

  return target?<div className="modal-backdrop" onMouseDown={()=>!saving&&setTarget(null)}>
    <div className="modal" onMouseDown={e=>e.stopPropagation()} style={{width:'min(480px,100%)'}}>
      <div className="modal-head"><div><h2>{isThai?'ยกเลิกคำขอลา':'Cancel leave request'}</h2><p className="subtle">{target.worker_name}</p></div><button className="icon-btn" onClick={()=>setTarget(null)} disabled={saving}>×</button></div>
      <div style={{padding:'12px 14px',border:'1px solid var(--border)',borderRadius:12,background:'var(--surface-2)'}}>
        <strong>{target.starts_on.slice(0,10)} – {target.ends_on.slice(0,10)}</strong>
        {target.reason&&<span style={{display:'block',marginTop:5,fontSize:12,color:'var(--muted)'}}>{target.reason}</span>}
      </div>
      <label>{isThai?'เหตุผลที่ยกเลิก':'Cancellation reason'}<textarea rows={4} value={reason} onChange={e=>setReason(e.target.value)} placeholder={isThai?'กรุณาระบุเหตุผล':'Please provide a reason'} /></label>
      {error&&<div className="error-banner" style={{marginTop:0}}>{error}</div>}
      <div className="modal-actions"><button className="secondary" onClick={()=>setTarget(null)} disabled={saving}>{isThai?'กลับ':'Back'}</button><button className="reject-btn" onClick={cancelLeave} disabled={saving||!reason.trim()}>{saving?(isThai?'กำลังยกเลิก…':'Cancelling…'):(isThai?'ยืนยันยกเลิก':'Confirm cancellation')}</button></div>
    </div>
  </div>:null;
}
