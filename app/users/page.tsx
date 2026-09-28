'use client';

import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';

type Role='admin'|'authorizer'|'hrm'|'worker';
type User={id:number;full_name:string;email:string;role:Role;active:boolean;worker_id:number|null};
type Worker={id:number;full_name:string};
type Form={full_name:string;email:string;password:string;role:'authorizer'|'hrm'|'worker';worker_id:string;active:boolean};

const emptyForm:Form={full_name:'',email:'',password:'',role:'worker',worker_id:'',active:true};

export default function UsersPage(){
  const router=useRouter();
  const [users,setUsers]=useState<User[]>([]);const [workers,setWorkers]=useState<Worker[]>([]);const [error,setError]=useState('');const [saving,setSaving]=useState(false);const [editingId,setEditingId]=useState<number|null>(null);
  const [form,setForm]=useState<Form>(emptyForm);

  async function load(){
    setError('');
    const [u,d]=await Promise.all([fetch('/api/users',{cache:'no-store'}),fetch('/api/dashboard',{cache:'no-store'})]);
    if(u.status===401){router.replace('/login');return}
    if(u.status===403){router.replace('/');return}
    const ub=await u.json(),db=await d.json();
    if(!u.ok)throw new Error(ub.error||'Could not load users.');
    setUsers(ub.users||[]);setWorkers(db.workers||[]);
  }

  useEffect(()=>{load().catch(e=>setError(e instanceof Error?e.message:'Could not load users.'))},[]);

  function startEdit(user:User){
    if(user.role==='admin')return;
    setEditingId(user.id);
    setForm({full_name:user.full_name,email:user.email,password:'',role:user.role,worker_id:user.worker_id?String(user.worker_id):'',active:user.active});
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function cancelEdit(){setEditingId(null);setForm(emptyForm);setError('')}

  async function submit(e:React.FormEvent){
    e.preventDefault();setSaving(true);setError('');
    try{
      const method=editingId?'PATCH':'POST';
      const payload=editingId?{id:editingId,...form,worker_id:form.worker_id||null}:{...form,worker_id:form.worker_id||null};
      const r=await fetch('/api/users',{method,headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const b=await r.json();if(!r.ok)throw new Error(b.error||(editingId?'Could not update user.':'Could not create user.'));
      setEditingId(null);setForm(emptyForm);await load();
    }catch(e){setError(e instanceof Error?e.message:'Could not save user.')}finally{setSaving(false)}
  }

  async function remove(user:User){
    if(user.role==='admin')return;
    if(!confirm(`Delete ${user.full_name}? This will also sign out that account.`))return;
    setSaving(true);setError('');
    try{const r=await fetch(`/api/users?id=${user.id}`,{method:'DELETE'});const b=await r.json();if(!r.ok)throw new Error(b.error||'Could not delete user.');if(editingId===user.id)cancelEdit();await load()}catch(e){setError(e instanceof Error?e.message:'Could not delete user.')}finally{setSaving(false)}
  }

  return <main style={{minHeight:'100vh',background:'var(--bg)',color:'var(--text)',padding:24}}><div style={{maxWidth:1120,margin:'0 auto'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',marginBottom:24}}><div><p className="eyebrow">WORKLY ADMIN</p><h1 style={{margin:0}}>User Management</h1><p className="subtle">Create, update, disable, or delete Authorizer, HRM, and Worker accounts. Admin accounts are protected.</p></div><button className="secondary" onClick={()=>router.push('/')}>← Back</button></div>
    {error&&<div className="error-banner">{error}</div>}
    <div style={{display:'grid',gridTemplateColumns:'minmax(300px,400px) 1fr',gap:20,alignItems:'start',marginTop:24}}>
      <form onSubmit={submit} style={{display:'grid',gap:14,padding:20,border:'1px solid var(--border)',borderRadius:16,background:'var(--surface)',boxShadow:'var(--shadow)',position:'sticky',top:20}}>
        <div><h2 style={{margin:'0 0 4px'}}>{editingId?'Edit user':'Add user'}</h2><p className="subtle" style={{fontSize:13}}>{editingId?'Leave password blank to keep the current password.':'Admin role cannot be created here.'}</p></div>
        <label style={{display:'grid',gap:6,fontWeight:700}}>Full name<input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label>
        <label style={{display:'grid',gap:6,fontWeight:700}}>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
        <label style={{display:'grid',gap:6,fontWeight:700}}>{editingId?'New password (optional)':'Temporary password'}<input type="password" minLength={8} required={!editingId} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
        <label style={{display:'grid',gap:6,fontWeight:700}}>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value as Form['role']})}><option value="authorizer">Authorizer</option><option value="hrm">HRM</option><option value="worker">Worker</option></select></label>
        <label style={{display:'grid',gap:6,fontWeight:700}}>Linked worker (optional)<select value={form.worker_id} onChange={e=>setForm({...form,worker_id:e.target.value})}><option value="">Not linked</option>{workers.map(w=><option key={w.id} value={w.id}>{w.full_name}</option>)}</select></label>
        {editingId&&<label style={{display:'flex',gap:9,alignItems:'center',fontWeight:700}}><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})} style={{width:18,height:18}}/> Active account</label>}
        <div style={{display:'flex',gap:8}}><button className="primary" disabled={saving} style={{flex:1}}>{saving?'Saving…':editingId?'Save changes':'Create user'}</button>{editingId&&<button type="button" className="secondary" onClick={cancelEdit}>Cancel</button>}</div>
      </form>
      <section style={{border:'1px solid var(--border)',borderRadius:16,background:'var(--surface)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
        <div style={{padding:'14px 18px',background:'var(--surface-2)',borderBottom:'1px solid var(--border)',fontWeight:800}}>Accounts</div>
        {users.map(u=>{const locked=u.role==='admin';return <div key={u.id} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:14,padding:'16px 18px',borderBottom:'1px solid var(--border)',alignItems:'center',opacity:u.active?1:.6}}><div><div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><strong>{u.full_name}</strong>{locked&&<span style={{fontSize:11,fontWeight:800,padding:'4px 7px',borderRadius:999,background:'var(--surface-2)',color:'var(--muted)'}}>PROTECTED</span>}{!u.active&&<span style={{fontSize:11,fontWeight:800,padding:'4px 7px',borderRadius:999,background:'#fef3f2',color:'#b42318'}}>INACTIVE</span>}</div><div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>{u.email}</div></div><div style={{display:'flex',gap:8,alignItems:'center'}}><span style={{padding:'6px 10px',borderRadius:999,background:'var(--accent-soft)',color:'var(--accent)',fontSize:12,fontWeight:800,textTransform:'uppercase'}}>{u.role}</span>{locked?<span style={{fontSize:12,color:'var(--muted)'}}>Cannot edit/delete</span>:<><button className="secondary" onClick={()=>startEdit(u)} disabled={saving}>Edit</button><button onClick={()=>remove(u)} disabled={saving} style={{border:'1px solid #fda29b',background:'#fff1f3',color:'#b42318',borderRadius:10,padding:'9px 12px',fontWeight:800,cursor:'pointer'}}>Delete</button></>}</div></div>})}
      </section>
    </div>
  </div></main>
}
