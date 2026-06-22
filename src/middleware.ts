import { type NextRequest, NextResponse } from 'next/server';
import { updateSupabaseSession } from '@/lib/supabase-middleware';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Assets statiques : aucun traitement auth
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot)$/i)
  ) {
    return NextResponse.next();
  }

  // API health + webhooks : pas de refresh session
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot)$).*)',
  ],
};
