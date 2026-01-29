import { createClient } from './supabase-server';
import { prisma } from './prisma';

// Fonction pour obtenir la session serveur avec Supabase Auth
// Compatible avec la table User existante pour les rôles
export async function getServerSession() {
  try {
    console.log('[getServerSession] ===== START =====');
    const supabase = await createClient();
    
    // Récupérer l'utilisateur directement (getUser() vérifie aussi la session)
    const { data: { user }, error } = await supabase.auth.getUser();

    console.log('[getServerSession] Error:', error);
    console.log('[getServerSession] User exists:', !!user);
    console.log('[getServerSession] User email:', user?.email);

    if (error || !user) {
      console.log('[getServerSession] ❌ No user, returning null');
      console.log('[getServerSession] ===== END (null) =====');
      return null;
    }

    // Récupérer les infos complètes depuis la table User (pour le rôle)
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, email: true, name: true, image: true, role: true }
    }).catch((e) => {
      console.log('[getServerSession] DB error:', e);
      return null;
    });

    console.log('[getServerSession] DB user found:', !!dbUser);
    console.log('[getServerSession] DB user role:', dbUser?.role);

    if (dbUser) {
      const sessionData = {
        user: {
          id: dbUser.id.toString(),
          email: dbUser.email,
          name: dbUser.name,
          image: dbUser.image,
          role: dbUser.role || 'user'
        }
      } as any;
      
      console.log('[getServerSession] ✅ Returning session with DB user');
      console.log('[getServerSession] ===== END (DB user) =====');
      return sessionData;
    }

    // Fallback: utiliser les infos de Supabase Auth si pas dans la table User
    const fallbackSession = {
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        image: user.user_metadata?.image,
        role: user.user_metadata?.role || 'user'
      }
    } as any;
    
    console.log('[getServerSession] ✅ Returning session with Supabase user');
    console.log('[getServerSession] ===== END (Supabase user) =====');
    return fallbackSession;
  } catch (error) {
    console.error('[getServerSession] ❌ Exception:', error);
    console.log('[getServerSession] ===== END (exception) =====');
    return null;
  }
}
