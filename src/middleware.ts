import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Ne jamais traiter les assets Next.js : éviter tout traitement qui pourrait
  // faire retourner du HTML (erreur, redirect) au lieu du fichier JS/CSS.
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot)$/i)
  ) {
    return NextResponse.next();
  }

  // API : pas de rafraîchissement session ici (évite latence / timeouts sur POST signup, webhooks, etc.)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Garde-fou : si Next n'a pas chargé les variables d'env Supabase,
  // on évite que le middleware fasse crash toute la page.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.includes("...")) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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
     * Ne pas exécuter le middleware pour les assets (JS, CSS, fonts, images)
     * pour éviter de renvoyer du HTML à la place des fichiers statiques.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot)$).*)',
  ],
};
