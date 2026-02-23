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
 * POST /api/admin/purge/reservations
 * Supprime toutes les réservations ET toutes les demandes agence. Réservé admin.
 */
export async function POST() {
  const admin = await ensureAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const [agencyResult, reservationResult] = await Promise.all([
      (prisma as any).agencyRequest.deleteMany({}),
      (prisma as any).reservation.deleteMany({}),
    ]);
    const deletedAgency = agencyResult?.count ?? 0;
    const deletedReservations = reservationResult?.count ?? 0;
    console.log('[purge] Reservations: deleted', deletedReservations, 'reservations +', deletedAgency, 'demandes agence');
    return NextResponse.json({
      success: true,
      deleted: deletedReservations,
      deletedAgencyRequests: deletedAgency,
    });
  } catch (e: any) {
    console.error('[purge] Reservations error:', e);
    return NextResponse.json({ error: 'server_error', details: e?.message }, { status: 500 });
  }
}
