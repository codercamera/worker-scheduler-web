'use client';

import {useEffect,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';

type User={id:number;full_name:string;email:string;role:'admin'|'authorizer'|'hrm'|'worker';worker_id:number|null};

export default function UserBadge(){
  const router=useRouter();
  const pathname=usePathname();
  const [user,setUser]=useState<User|null>(null);
  const [confirmLogout,setConfirmLogout]=useState(false);
  const [loggingOut,setLoggingOut]=useState(false);

  useEffect(()=>{
    if(pathname==='/login'||pathname==='/setup')return;
    fetch('/api/auth/status',{cache:'no-store'})
      .then(r=>r.json())
      .then(b=>{if(!b.user){router.replace('/login');return}setUser(b.user)})
      .catch(()=>router.replace('/login'));
  },[pathname,router]);

  if(!user||pathname==='/login'||pathname==='/setup')return null;
  const initials=user.full_name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();

  async function logout(){
    setLoggingOut(true);
    try{
      await fetch('/api/auth/logout',{method:'POST'});
      router.replace('/login');
      router.refresh();
    }finally{
      setLoggingOut(false);
      setConfirmLogout(false);
    }
  }

  return <>
    <div className="signed-user">
      <div className="signed-user-profile">
        <div className="signed-user-avatar">{initials}</div>
        <div className="signed-user-copy"><strong>{user.full_name}</strong><span>{user.role.toUpperCase()}</span></div>
        {user.role==='admin'&&<button className="signed-user-users" onClick={()=>router.push('/users')} title="User Management" aria-label="User Management"><span aria-hidden="true">👥</span><span>Users</span></button>}
      </div>
      <button className="signed-user-logout" onClick={()=>setConfirmLogout(true)}>Logout</button>
    </div>

    {confirmLogout&&<div className="modal-backdrop" onMouseDown={()=>!loggingOut&&setConfirmLogout(false)}>
      <div className="modal" onMouseDown={e=>e.stopPropagation()} style={{width:'min(440px,100%)'}}>
        <div className="modal-head">
          <div><h2>Confirm logout</h2><p className="subtle" style={{marginTop:5}}>Are you sure you want to log out?</p></div>
          <button type="button" className="icon-btn" onClick={()=>setConfirmLogout(false)} disabled={loggingOut}>×</button>
        </div>
        <div style={{padding:'14px',border:'1px solid var(--border)',borderRadius:12,background:'var(--surface-2)'}}>
          <strong style={{display:'block'}}>{user.full_name}</strong>
          <span style={{display:'block',marginTop:4,fontSize:12,color:'var(--muted)'}}>{user.email}</span>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={()=>setConfirmLogout(false)} disabled={loggingOut}>Cancel</button>
          <button type="button" onClick={logout} disabled={loggingOut} style={{border:'1px solid #f04438',background:'#d92d20',color:'#fff',borderRadius:10,padding:'10px 16px',fontWeight:800,cursor:'pointer'}}>{loggingOut?'Logging out…':'Logout'}</button>
        </div>
      </div>
    </div>}
  </>;
}
