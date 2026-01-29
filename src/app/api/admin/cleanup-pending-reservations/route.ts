import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

// Route pour nettoyer les réservations non payées de plus de 24h
// Peut être appelée manuellement par un admin ou via un cron job
export async function POST(req: Request) {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }
    
    const role = (session.user as any)?.role || 'user';
    if (role !== 'admin') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
    }

    // Supprimer les réservations non payées de plus de 24h
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const deleted = await prisma.reservation.deleteMany({
      where: {
        status: 'pending_deposit',
        depositPaidAt: null,
        createdAt: {
          lt: twentyFourHoursAgo,
        },
      },
    });

    console.log(`[cleanup] ${deleted.count} réservations non payées supprimées`);

    return NextResponse.json({ 
      success: true, 
      deleted: deleted.count,
      message: `${deleted.count} réservations non payées supprimées`
    });
  } catch (error: any) {
    console.error('[cleanup] Erreur:', error);
    return NextResponse.json({ error: 'server_error', details: error.message }, { status: 500 });
  }
}
