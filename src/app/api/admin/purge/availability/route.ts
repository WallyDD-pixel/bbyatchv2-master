import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function ensureAdmin() {
  const session = await getServerSession() as any;
  if (!session?.user) return null;
  if ((session.user as any)?.role === 'admin') return session.user;
  if (session.user?.email) {
    try {
      const u = await (prisma as any).user.findUnique({ where: { email: session.user.email }, select: { role: true } });
      if (u?.role === 'admin') return session.user;
    } catch {}
  }
  return null;
}

/**
 * POST /api/admin/purge/availability
 * Supprime tous les créneaux de disponibilité (bateaux + expériences). Réservé admin.
 */
export async function POST() {
  const admin = await ensureAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const [deletedSlots, deletedExpSlots] = await Promise.all([
      (prisma as any).availabilitySlot.deleteMany({}),
      (prisma as any).experienceAvailabilitySlot.deleteMany({}),
    ]);
    const total = (deletedSlots?.count ?? 0) + (deletedExpSlots?.count ?? 0);
    console.log('[purge] Availability: deleted', deletedSlots?.count ?? 0, 'slots +', deletedExpSlots?.count ?? 0, 'experience slots');
    return NextResponse.json({
      success: true,
      deletedSlots: deletedSlots?.count ?? 0,
      deletedExperienceSlots: deletedExpSlots?.count ?? 0,
      total,
    });
  } catch (e: any) {
    console.error('[purge] Availability error:', e);
    return NextResponse.json({ error: 'server_error', details: e?.message }, { status: 500 });
  }
}
