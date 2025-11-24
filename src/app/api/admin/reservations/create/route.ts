import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(auth as any) as any;
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    let role: string | undefined = (session.user as any)?.role;
    if (!role) {
      try {
        const u = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true } });
        role = u?.role;
      } catch {}
    }
    if (role !== 'admin') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, boatId, startDate, endDate, part, passengers, totalPrice, depositAmount, optionIds, notes, locale } = body;

    // Validation
    if (!userId || !boatId || !startDate || !totalPrice) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    // Vérifier que l'utilisateur existe et est une agence
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }
    if (user.role !== 'agency') {
      return NextResponse.json({ error: 'user_not_agency' }, { status: 400 });
    }

    // Vérifier que le bateau existe
    const boat = await (prisma as any).boat.findUnique({ where: { id: parseInt(boatId, 10) }, select: { id: true } });
    if (!boat) {
      return NextResponse.json({ error: 'boat_not_found' }, { status: 404 });
    }

    // Dates
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date((endDate || startDate) + 'T00:00:00');
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) {
      return NextResponse.json({ error: 'invalid_dates' }, { status: 400 });
    }

    // Calculer le reste à payer
    const deposit = depositAmount ? parseInt(String(depositAmount), 10) : 0;
    const total = parseInt(String(totalPrice), 10);
    const remaining = Math.max(total - deposit, 0);

    // Déterminer le statut initial
    let status = 'pending_deposit';
    if (deposit > 0) {
      status = deposit >= total ? 'completed' : 'deposit_paid';
    }

    // Créer la réservation
    const reservation = await (prisma as any).reservation.create({
      data: {
        userId,
        boatId: parseInt(boatId, 10),
        startDate: s,
        endDate: e,
        part: part || 'FULL',
        passengers: passengers ? parseInt(String(passengers), 10) : null,
        totalPrice: total,
        depositAmount: deposit,
        remainingAmount: remaining,
        status,
        depositPercent: deposit > 0 ? Math.round((deposit / total) * 100) : 20,
        depositPaidAt: deposit > 0 ? new Date() : null,
        completedAt: status === 'completed' ? new Date() : null,
        notesInternal: notes || null,
        locale: locale || 'fr',
        currency: 'eur',
        lockedPrice: true,
        metadata: JSON.stringify({
          createdByAdmin: true,
          createdAt: new Date().toISOString(),
          optionIds: optionIds || [],
        }),
      },
    });

    return NextResponse.json({ success: true, reservation });
  } catch (error: any) {
    console.error('Error creating reservation:', error);
    return NextResponse.json({ error: 'server_error', message: error.message }, { status: 500 });
  }
}

