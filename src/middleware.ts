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
          // Laisser Supabase contrôler maxAge / httpOnly / sameSite (recommandation officielle SSR).
          // Un maxAge forcé à 1 an cassait l’expiration / le rafraîchissement après un long détour (ex. Stripe).
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              path: options?.path ?? '/',
              secure: options?.secure ?? process.env.NODE_ENV === 'production',
            });
          });
        },
      },
    }
  );

  // Toujours valider/rafraîchir via getUser() : getSession() peut être vide si l’access token
  // a expiré pendant le paiement externe (Stripe), alors que le refresh token permet de restaurer la session.
  await supabase.auth.getUser();

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
