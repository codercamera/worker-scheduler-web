'use client';

import {useEffect,useState} from 'react';

type User={role:'admin'|'authorizer'|'hrm'|'worker'};
type Leave={id:number;worker_id:number;worker_name:string;leave_type:string;starts_on:string;ends_on:string;reason:string|null;status:'pending'|'approved'|'rejected'|'cancelled'};
type ReviewTarget={leave:Leave;status:'approved'|'rejected'};

export default function LeaveReviewControls(){
  const [user,setUser]=useState<User|null>(null);
  const [leaves,setLeaves]=useState<Leave[]>([]);
  const [target,setTarget]=useState<ReviewTarget|null>(null);
  const [note,setNote]=useState('');
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
      if(!active||!auth.user||auth.user.role==='worker')return;
      setUser(auth.user);
      const data=await fetch('/api/dashboard',{cache:'no-store'}).then(r=>r.json());
      if(!active)return;
      setLeaves(data.leaveRequests||[]);
    }
    init().catch(()=>{});
    return()=>{active=false;langObserver.disconnect()};
  },[]);

  useEffect(()=>{
    if(!user||user.role==='worker')return;
    function wire(){
      const rows=Array.from(document.querySelectorAll<HTMLElement>('.leave-card .leave-row'));
      rows.forEach((row,index)=>{
        const leave=leaves[index];
        if(!leave||leave.status!=='pending')return;
        const approve=row.querySelector<HTMLButtonElement>('.approve-btn');
        const reject=row.querySelector<HTMLButtonElement>('.reject-btn');
        if(approve&&!approve.dataset.confirmWired){
          approve.dataset.confirmWired='1';
          approve.addEventListener('click',e=>{
            e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
            setNote('');setError('');setTarget({leave,status:'approved'});
          },true);
        }
        if(reject&&!reject.dataset.confirmWired){
          reject.dataset.confirmWired='1';
          reject.addEventListener('click',e=>{
            e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
            setNote('');setError('');setTarget({leave,status:'rejected'});
          },true);
        }
      });
    }
    wire();
    const observer=new MutationObserver(wire);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[user,leaves]);

  if(!user||user.role==='worker'||!target)return null;

  const approving=target.status==='approved';
  const close=()=>{if(!saving){setTarget(null);setNote('');setError('')}};

  async function confirmReview(){
    setSaving(true);setError('');
    try{
      const r=await fetch('/api/leave',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:target.leave.id,status:target.status,manager_note:note.trim()||null})});
      const b=await r.json();
      if(!r.ok)throw new Error(b.error||'Could not update leave request.');
      window.location.reload();
    }catch(e){setError(e instanceof Error?e.message:'Could not update leave request.');setSaving(false)}
  }

  return <div className="modal-backdrop" onMouseDown={close}>
    <div className="modal" onMouseDown={e=>e.stopPropagation()} style={{width:'min(520px,100%)'}}>
      <div className="modal-head"><div><h2>{isThai?(approving?'ยืนยันอนุมัติการลา':'ยืนยันไม่อนุมัติการลา'):(approving?'Confirm leave approval':'Confirm leave rejection')}</h2><p className="subtle" style={{marginTop:5}}>{isThai?'ตรวจสอบรายละเอียดก่อนยืนยัน':'Review the request before confirming.'}</p></div><button type="button" className="icon-btn" onClick={close} disabled={saving}>×</button></div>
      <div style={{display:'grid',gap:6,padding:'14px',border:'1px solid var(--border)',borderRadius:12,background:'var(--surface-2)'}}>
        <strong>{target.leave.worker_name}</strong>
        <span style={{fontSize:12,color:'var(--muted)'}}>{target.leave.starts_on.slice(0,10)} – {target.leave.ends_on.slice(0,10)}</span>
        <span style={{fontSize:12,color:'var(--muted)',textTransform:'capitalize'}}>{target.leave.leave_type}</span>
        {target.leave.reason&&<span style={{fontSize:12,color:'var(--muted)'}}>{isThai?'เหตุผลการลา: ':'Leave reason: '}{target.leave.reason}</span>}
      </div>
      <label>{isThai?'เหตุผล / หมายเหตุ (ไม่บังคับ)':'Reason / note (optional)'}<textarea rows={4} value={note} onChange={e=>setNote(e.target.value)} placeholder={isThai?'เพิ่มเหตุผลหรือหมายเหตุได้ตามต้องการ':'Add an optional reason or manager note'} /></label>
      {error&&<div className="error-banner" style={{marginTop:0}}>{error}</div>}
      <div className="modal-actions"><button type="button" className="secondary" onClick={close} disabled={saving}>{isThai?'ยกเลิก':'Cancel'}</button><button type="button" className={approving?'approve-btn':'reject-btn'} onClick={confirmReview} disabled={saving}>{saving?(isThai?'กำลังบันทึก…':'Saving…'):(isThai?(approving?'ยืนยันอนุมัติ':'ยืนยันไม่อนุมัติ'):(approving?'Approve leave':'Reject leave'))}</button></div>
    </div>
  </div>;
}
