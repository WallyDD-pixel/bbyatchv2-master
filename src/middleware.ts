import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Créer une nouvelle réponse pour chaque cookie à définir
          cookiesToSet.forEach(({ name, value, options }) => {
            // Définir les options par défaut pour la persistance
            const cookieOptions = {
              ...options,
              path: options?.path || '/',
              sameSite: options?.sameSite || 'lax' as const,
              httpOnly: options?.httpOnly ?? true,
              secure: options?.secure ?? (process.env.NODE_ENV === 'production'),
              maxAge: options?.maxAge || 60 * 60 * 24 * 365, // 1 an par défaut
            };
            
            // Mettre à jour la réponse avec le cookie
            response.cookies.set(name, value, cookieOptions);
          });
        },
      },
    }
  );

  // Rafraîchir la session si nécessaire
  // Appeler getSession() pour rafraîchir la session et mettre à jour les cookies
  const { data: { session }, error } = await supabase.auth.getSession();
  
  // Si la session existe, s'assurer qu'elle est rafraîchie
  if (session && !error) {
    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
