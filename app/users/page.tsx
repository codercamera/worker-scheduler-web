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
  const [users,setUsers]=useState<User[]>([]);const [workers,setWorkers]=useState<Worker[]>([]);const [error,setError]=useState('');const [saving,setSaving]=useState(false);
  const [dialogOpen,setDialogOpen]=useState(false);const [editingId,setEditingId]=useState<number|null>(null);const [form,setForm]=useState<Form>(emptyForm);const [deleteUser,setDeleteUser]=useState<User|null>(null);const [deleting,setDeleting]=useState(false);

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

  function openCreate(){setEditingId(null);setForm(emptyForm);setError('');setDialogOpen(true)}
  function openEdit(user:User){
    if(user.role==='admin')return;
    setEditingId(user.id);
    setForm({full_name:user.full_name,email:user.email,password:'',role:user.role,worker_id:user.role==='worker'&&user.worker_id?String(user.worker_id):'',active:user.active});
    setError('');setDialogOpen(true);
  }
  function closeDialog(){if(saving)return;setDialogOpen(false);setEditingId(null);setForm(emptyForm)}

  async function submit(e:React.FormEvent){
    e.preventDefault();setSaving(true);setError('');
    try{
      const method=editingId?'PATCH':'POST';
      const worker_id=form.role==='worker'&&form.worker_id?form.worker_id:null;
      const payload=editingId?{id:editingId,...form,worker_id}:{...form,worker_id};
      const r=await fetch('/api/users',{method,headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const b=await r.json();if(!r.ok)throw new Error(b.error||(editingId?'Could not update user.':'Could not create user.'));
      setDialogOpen(false);setEditingId(null);setForm(emptyForm);await load();
    }catch(e){setError(e instanceof Error?e.message:'Could not save user.')}finally{setSaving(false)}
  }

  async function confirmRemove(){
    if(!deleteUser||deleteUser.role==='admin')return;
    setDeleting(true);setError('');
    try{const r=await fetch(`/api/users?id=${deleteUser.id}`,{method:'DELETE'});const b=await r.json();if(!r.ok)throw new Error(b.error||'Could not delete user.');setDeleteUser(null);await load()}catch(e){setError(e instanceof Error?e.message:'Could not delete user.')}finally{setDeleting(false)}
  }

  const availableWorkers=workers.filter(w=>!users.some(u=>u.worker_id===w.id&&u.id!==editingId));
  const linkedWorker=(u:User)=>workers.find(w=>w.id===u.worker_id)?.full_name||'Not linked';

  return <main className="users-page" style={{minHeight:'100vh',background:'var(--bg)',color:'var(--text)',padding:24}}><div style={{maxWidth:1120,margin:'0 auto'}}>
    <div className="users-page-header" style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',marginBottom:24,flexWrap:'wrap'}}><div><p className="eyebrow">WORKLY ADMIN</p><h1 style={{margin:0}}>User Management</h1><p className="subtle">Manage Authorizer, HRM, and Worker accounts. Only Worker-role users can be linked to workers.</p></div><div className="users-page-actions" style={{display:'flex',gap:8}}><button className="secondary" onClick={()=>router.push('/')}>← Back</button><button className="primary" onClick={openCreate}>+ Create User</button></div></div>
    {error&&!dialogOpen&&!deleteUser&&<div className="error-banner">{error}</div>}

    <section className="users-desktop-table" style={{border:'1px solid var(--border)',borderRadius:16,background:'var(--surface)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
      <div style={{display:'grid',gridTemplateColumns:'1.3fr 1.5fr .7fr 1fr .7fr auto',gap:14,padding:'13px 18px',background:'var(--surface-2)',borderBottom:'1px solid var(--border)',fontSize:12,fontWeight:800,color:'var(--muted)'}}><span>Name</span><span>Email</span><span>Role</span><span>Linked Worker</span><span>Status</span><span>Actions</span></div>
      {users.map(u=>{const locked=u.role==='admin';return <div key={u.id} style={{display:'grid',gridTemplateColumns:'1.3fr 1.5fr .7fr 1fr .7fr auto',gap:14,padding:'15px 18px',borderBottom:'1px solid var(--border)',alignItems:'center',opacity:u.active?1:.62}}><div><strong>{u.full_name}</strong>{locked&&<div style={{fontSize:11,color:'var(--muted)',marginTop:3}}>Protected admin account</div>}</div><span style={{fontSize:13,color:'var(--muted)'}}>{u.email}</span><span style={{padding:'6px 10px',borderRadius:999,background:'var(--accent-soft)',color:'var(--accent)',fontSize:12,fontWeight:800,textTransform:'uppercase',justifySelf:'start'}}>{u.role}</span><span style={{fontSize:12,color:'var(--muted)'}}>{u.role==='worker'?linkedWorker(u):'—'}</span><span style={{fontSize:12,fontWeight:800,color:u.active?'#027a48':'#b42318'}}>{u.active?'Active':'Inactive'}</span><div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>{locked?<span style={{fontSize:12,color:'var(--muted)'}}>Locked</span>:<><button className="secondary" onClick={()=>openEdit(u)} disabled={saving}>Edit</button><button onClick={()=>setDeleteUser(u)} disabled={saving} style={{border:'1px solid #fda29b',background:'#fff1f3',color:'#b42318',borderRadius:10,padding:'9px 12px',fontWeight:800,cursor:'pointer'}}>Delete</button></>}</div></div>})}
      {users.length===0&&<div className="empty-state">No users found.</div>}
    </section>

    <section className="users-mobile-list">
      {users.map(u=>{const locked=u.role==='admin';return <article key={u.id} className="mobile-user-card" style={{opacity:u.active?1:.62}}>
        <div className="mobile-user-top"><div><strong>{u.full_name}</strong><span>{u.email}</span></div><span className="mobile-user-role">{u.role}</span></div>
        <div className="mobile-user-meta"><div><span>Status</span><strong className={u.active?'mobile-status-active':'mobile-status-inactive'}>{u.active?'Active':'Inactive'}</strong></div><div><span>Linked worker</span><strong>{u.role==='worker'?linkedWorker(u):'—'}</strong></div></div>
        {locked?<div className="mobile-user-locked">Protected admin account</div>:<div className="mobile-user-actions"><button className="secondary" onClick={()=>openEdit(u)} disabled={saving}>Edit</button><button onClick={()=>setDeleteUser(u)} disabled={saving} className="mobile-delete-user">Delete</button></div>}
      </article>})}
      {users.length===0&&<div className="empty-state">No users found.</div>}
    </section>
  </div>

  {dialogOpen&&<div className="modal-backdrop" onMouseDown={closeDialog}><form className="modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}>
    <div className="modal-head"><div><h2>{editingId?'Edit User':'Create User'}</h2><p className="subtle" style={{fontSize:13,marginTop:5}}>{editingId?'Update account details. Leave password blank to keep the current password.':'Create an Authorizer, HRM, or Worker account.'}</p></div><button type="button" className="icon-btn" onClick={closeDialog}>×</button></div>
    {error&&<div className="error-banner" style={{marginTop:0}}>{error}</div>}
    <label>Full name<input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label>
    <label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label>{editingId?'New password (optional)':'Temporary password'}<input type="password" minLength={8} required={!editingId} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
    <label>Role<select value={form.role} onChange={e=>{const role=e.target.value as Form['role'];setForm({...form,role,worker_id:role==='worker'?form.worker_id:''})}}><option value="authorizer">Authorizer</option><option value="hrm">HRM</option><option value="worker">Worker</option></select></label>
    {form.role==='worker'&&<label>Linked worker (optional)<select value={form.worker_id} onChange={e=>setForm({...form,worker_id:e.target.value})}><option value="">Not linked</option>{availableWorkers.map(w=><option key={w.id} value={w.id}>{w.full_name}</option>)}</select><span style={{fontSize:11,color:'var(--muted)',fontWeight:500}}>Only Worker-role users can be linked. Each worker can be linked to one system user.</span></label>}
    {editingId&&<label style={{display:'flex',gridTemplateColumns:'none',gap:9,alignItems:'center'}}><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})} style={{width:18,height:18}}/> Active account</label>}
    <div className="modal-actions"><button type="button" className="secondary" onClick={closeDialog} disabled={saving}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving…':editingId?'Save Changes':'Create User'}</button></div>
  </form></div>}

  {deleteUser&&<div className="modal-backdrop" onMouseDown={()=>!deleting&&setDeleteUser(null)}><div className="modal" onMouseDown={e=>e.stopPropagation()} style={{width:'min(500px,100%)'}}>
    <div className="modal-head"><div><h2>Confirm user deletion</h2><p className="subtle" style={{fontSize:13,marginTop:5}}>You are about to permanently delete this account.</p></div><button type="button" className="icon-btn" onClick={()=>setDeleteUser(null)} disabled={deleting}>×</button></div>
    {error&&<div className="error-banner" style={{marginTop:0}}>{error}</div>}
    <div style={{display:'grid',gap:8,padding:'14px',border:'1px solid var(--border)',borderRadius:12,background:'var(--surface-2)'}}><strong>{deleteUser.full_name}</strong><span style={{fontSize:12,color:'var(--muted)'}}>{deleteUser.email}</span><span style={{fontSize:12,color:'var(--muted)',textTransform:'uppercase',fontWeight:800}}>{deleteUser.role} • {deleteUser.active?'Active':'Inactive'}</span></div>
    <p className="subtle" style={{fontSize:12}}>This will also sign out the account and cannot be undone.</p>
    <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setDeleteUser(null)} disabled={deleting}>Cancel</button><button type="button" onClick={confirmRemove} disabled={deleting} style={{border:'1px solid #f04438',background:'#d92d20',color:'#fff',borderRadius:10,padding:'10px 16px',fontWeight:800,cursor:'pointer'}}>{deleting?'Deleting…':'Delete User'}</button></div>
  </div></div>}

  <style jsx>{`
    .users-mobile-list{display:none}
    @media(max-width:720px){
      .users-page{padding:16px!important;padding-top:118px!important}
      .users-page-header{align-items:flex-start!important;margin-bottom:18px!important}
      .users-page-header h1{font-size:26px}
      .users-page-actions{width:100%}
      .users-page-actions button{flex:1}
      .users-desktop-table{display:none}
      .users-mobile-list{display:grid;gap:12px}
      .mobile-user-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:15px;box-shadow:var(--shadow);display:grid;gap:14px}
      .mobile-user-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .mobile-user-top>div{min-width:0}
      .mobile-user-top strong,.mobile-user-top span{display:block}
      .mobile-user-top strong{font-size:15px}
      .mobile-user-top>div span{font-size:12px;color:var(--muted);margin-top:4px;overflow-wrap:anywhere}
      .mobile-user-role{flex:0 0 auto;padding:6px 9px;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:10px;font-weight:900;text-transform:uppercase}
      .mobile-user-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:11px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
      .mobile-user-meta div{display:grid;gap:4px;min-width:0}
      .mobile-user-meta span{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-weight:800}
      .mobile-user-meta strong{font-size:12px;overflow-wrap:anywhere}
      .mobile-status-active{color:#027a48}.mobile-status-inactive{color:#b42318}
      .mobile-user-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .mobile-user-actions button{width:100%}
      .mobile-delete-user{border:1px solid #fda29b;background:#fff1f3;color:#b42318;border-radius:10px;padding:10px 12px;font-weight:800;cursor:pointer}
      .mobile-user-locked{font-size:12px;color:var(--muted);font-weight:700;padding-top:2px}
    }
  `}</style>
 </main>
}
