import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Vérifie que l'utilisateur est authentifié
 * Retourne null si OK, sinon une réponse d'erreur
 */
export async function ensureAuthenticated(): Promise<NextResponse | null> {
  const session = (await getServerSession()) as any;
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * Vérifie que l'utilisateur est admin
 * TOUJOURS vérifie en base de données pour éviter les contournements
 * Retourne null si OK, sinon une réponse d'erreur
 */
export async function ensureAdmin(): Promise<NextResponse | null> {
  const session = (await getServerSession()) as any;
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // TOUJOURS vérifier en base de données (ne jamais faire confiance uniquement au JWT)
  const user = await (prisma as any).user
    .findUnique({
      where: { email: session.user.email },
      select: { role: true },
    })
    .catch(() => null);

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return null;
}

/**
 * Vérifie que l'utilisateur a un rôle spécifique
 * Retourne null si OK, sinon une réponse d'erreur
 */
export async function ensureRole(role: 'admin' | 'agency' | 'user'): Promise<NextResponse | null> {
  const session = (await getServerSession()) as any;
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // TOUJOURS vérifier en base de données
  const user = await (prisma as any).user
    .findUnique({
      where: { email: session.user.email },
      select: { role: true },
    })
    .catch(() => null);

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Vérifier le rôle
  if (role === 'admin' && user.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (role === 'agency' && user.role !== 'agency' && user.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return null;
}

/**
 * Obtient l'utilisateur actuel depuis la session
 * Retourne null si non authentifié
 */
export async function getCurrentUser(): Promise<{ id: string; email: string; role: string } | null> {
  const session = (await getServerSession()) as any;
  if (!session?.user?.email) {
    return null;
  }

  const user = await (prisma as any).user
    .findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, role: true },
    })
    .catch(() => null);

  if (!user) {
    return null;
  }

  return {
    id: user.id.toString(),
    email: user.email,
    role: user.role || 'user',
  };
}
