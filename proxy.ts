import {NextRequest,NextResponse} from 'next/server';

const publicPaths=['/login','/setup','/api/auth/login','/api/auth/setup','/api/auth/status'];

export function proxy(request:NextRequest){
  const {pathname}=request.nextUrl;
  if(publicPaths.includes(pathname)||pathname.startsWith('/_next/')||pathname==='/favicon.ico')return NextResponse.next();

  const hasSession=Boolean(request.cookies.get('workly_session')?.value);
  if(hasSession)return NextResponse.next();

  if(pathname.startsWith('/api/'))return NextResponse.json({error:'Unauthorized'},{status:401});
  const url=request.nextUrl.clone();url.pathname='/login';url.search='';return NextResponse.redirect(url);
}

export const config={matcher:['/((?!_next/static|_next/image).*)']};
