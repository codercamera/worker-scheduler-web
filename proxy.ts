import {NextRequest,NextResponse} from 'next/server';

const publicPaths=['/login','/setup','/api/auth/login','/api/auth/setup','/api/auth/status'];

export async function proxy(request:NextRequest){
  const {pathname}=request.nextUrl;
  if(publicPaths.includes(pathname)||pathname.startsWith('/_next/')||pathname==='/favicon.ico')return NextResponse.next();

  try{
    const statusUrl=new URL('/api/auth/status',request.url);
    const statusResponse=await fetch(statusUrl,{headers:{cookie:request.headers.get('cookie')||''},cache:'no-store'});
    if(statusResponse.ok){
      const status=await statusResponse.json();
      if(status.setupRequired){
        if(pathname.startsWith('/api/'))return NextResponse.json({error:'Setup required'},{status:409});
        const url=request.nextUrl.clone();url.pathname='/setup';url.search='';return NextResponse.redirect(url);
      }
      if(status.user)return NextResponse.next();
    }
  }catch{}

  if(pathname.startsWith('/api/'))return NextResponse.json({error:'Unauthorized'},{status:401});
  const url=request.nextUrl.clone();url.pathname='/login';url.search='';return NextResponse.redirect(url);
}

export const config={matcher:['/((?!_next/static|_next/image).*)']};
