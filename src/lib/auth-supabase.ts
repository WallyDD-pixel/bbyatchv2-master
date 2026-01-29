import { createClient } from './supabase-server';
import { prisma } from './prisma';

// Fonction pour obtenir la session serveur avec Supabase Auth
// Compatible avec la table User existante pour les rôles
export async function getServerSession() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Récupérer les infos complètes depuis la table User (pour le rôle)
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, email: true, name: true, image: true, role: true }
    }).catch(() => null);

    if (dbUser) {
      return {
        user: {
          id: dbUser.id.toString(),
          email: dbUser.email,
          name: dbUser.name,
          image: dbUser.image,
          role: dbUser.role || 'user'
        },
        expires: user.user_metadata?.expires
      } as any;
    }

    // Fallback: utiliser les infos de Supabase Auth si pas dans la table User
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        image: user.user_metadata?.image,
        role: user.user_metadata?.role || 'user'
      },
      expires: user.user_metadata?.expires
    } as any;
  } catch (error) {
    return null;
  }
}
