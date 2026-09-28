'use client';

import {useEffect,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';

type User={id:number;full_name:string;email:string;role:'admin'|'authorizer'|'hrm'|'worker';worker_id:number|null};

export default function UserBadge(){
  const router=useRouter();const pathname=usePathname();const [user,setUser]=useState<User|null>(null);
  useEffect(()=>{if(pathname==='/login'||pathname==='/setup')return;fetch('/api/auth/status',{cache:'no-store'}).then(r=>r.json()).then(b=>{if(!b.user){router.replace('/login');return}setUser(b.user)}).catch(()=>router.replace('/login'))},[pathname,router]);
  if(!user||pathname==='/login'||pathname==='/setup')return null;
  const initials=user.full_name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
  async function logout(){await fetch('/api/auth/logout',{method:'POST'});router.replace('/login');router.refresh()}
  return <div className="signed-user"><div className="signed-user-profile"><div className="signed-user-avatar">{initials}</div><div className="signed-user-copy"><strong>{user.full_name}</strong><span>{user.role.toUpperCase()}</span></div>{user.role==='admin'&&<button className="signed-user-users" onClick={()=>router.push('/users')} title="User Management" aria-label="User Management"><span aria-hidden="true">👥</span><span>Users</span></button>}</div><button className="signed-user-logout" onClick={logout}>Logout</button></div>
}
