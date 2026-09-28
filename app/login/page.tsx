'use client';

import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';

export default function LoginPage(){
  const router=useRouter();
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [saving,setSaving]=useState(false);
  useEffect(()=>{fetch('/api/auth/status',{cache:'no-store'}).then(r=>r.json()).then(b=>{if(b.user)router.replace('/');else if(b.setupRequired)router.replace('/setup')}).catch(()=>{})},[router]);
  async function submit(e:React.FormEvent){e.preventDefault();setSaving(true);setError('');try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});const b=await r.json();if(!r.ok)throw new Error(b.error||'Could not sign in.');router.replace('/');router.refresh()}catch(e){setError(e instanceof Error?e.message:'Could not sign in.')}finally{setSaving(false)}}
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:20,background:'var(--bg)',color:'var(--text)'}}><form onSubmit={submit} style={{width:'min(420px,100%)',display:'grid',gap:16,padding:28,border:'1px solid var(--border)',borderRadius:20,background:'var(--surface)',boxShadow:'var(--shadow)'}}><div><div style={{width:46,height:46,borderRadius:14,display:'grid',placeItems:'center',background:'var(--accent)',color:'#fff',fontWeight:900,marginBottom:18}}>W</div><h1 style={{margin:0}}>Sign in to Workly</h1><p style={{color:'var(--muted)'}}>Use your organization account to continue.</p></div>{error&&<div className="error-banner" style={{marginTop:0}}>{error}</div>}<label style={{display:'grid',gap:7,fontWeight:700}}>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{padding:12,borderRadius:10,border:'1px solid var(--border-strong)',background:'var(--input-bg)',color:'var(--text)'}}/></label><label style={{display:'grid',gap:7,fontWeight:700}}>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} style={{padding:12,borderRadius:10,border:'1px solid var(--border-strong)',background:'var(--input-bg)',color:'var(--text)'}}/></label><button className="primary" disabled={saving}>{saving?'Signing in…':'Sign in'}</button></form></main>
}
