import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

interface Props {
  searchParams?: Promise<{ res?: string; lang?: string }> | { res?: string; lang?: string };
}

export default async function CheckoutCancelPage({ searchParams }: Props) {
  const sp = searchParams ? (await Promise.resolve(searchParams)) : {};
  const resId = sp?.res;

  if (!resId) {
    // Pas de réservation ID, rediriger vers la page d'accueil
    redirect('/');
  }

  // Vérifier que l'utilisateur est connecté
  const session = await getServerSession() as any;
  if (!session?.user?.email) {
    redirect('/signin');
  }

  // Récupérer la réservation
  const reservation = await prisma.reservation.findUnique({
    where: { id: resId },
    include: { user: { select: { email: true } } },
  });

  if (!reservation) {
    notFound();
  }

  // Vérifier que la réservation appartient à l'utilisateur connecté
  if (reservation.user?.email !== session.user.email) {
    redirect('/');
  }

  // Vérifier que la réservation n'a pas été payée
  if (reservation.depositPaidAt) {
    // Si déjà payée, rediriger vers la page de succès
    redirect(`/checkout/success?res=${resId}`);
  }

  // Supprimer la réservation non payée
  try {
    // Vérifier d'abord que la réservation n'a pas été payée
    const reservationCheck = await prisma.reservation.findUnique({
      where: { id: resId },
      select: { depositPaidAt: true, status: true, stripeSessionId: true, createdAt: true },
    });
    
    console.log(`[cancel] Vérification réservation ${resId}:`, {
      depositPaidAt: reservationCheck?.depositPaidAt,
      status: reservationCheck?.status,
      stripeSessionId: reservationCheck?.stripeSessionId,
      createdAt: reservationCheck?.createdAt,
    });
    
    // Supprimer TOUJOURS si la réservation n'a pas été payée et est en attente
    // Même si elle est récente, car l'utilisateur a explicitement annulé
    if (reservationCheck && !reservationCheck.depositPaidAt && reservationCheck.status === 'pending_deposit') {
      await prisma.reservation.delete({
        where: { id: resId },
      });
      console.log(`[cancel] ✅ Réservation ${resId} supprimée après annulation explicite du paiement`);
    } else {
      console.log(`[cancel] ⚠️ Réservation ${resId} non supprimée:`, {
        reason: reservationCheck?.depositPaidAt ? 'déjà payée' : reservationCheck?.status !== 'pending_deposit' ? 'statut incorrect' : 'autre raison',
        depositPaidAt: reservationCheck?.depositPaidAt,
        status: reservationCheck?.status,
      });
    }
  } catch (error) {
    console.error(`[cancel] ❌ Erreur lors de la suppression de la réservation ${resId}:`, error);
    // Continuer même en cas d'erreur
  }

  // Rediriger vers la page appropriée avec un message
  const locale = sp?.lang === 'en' ? 'en' : 'fr';
  
  // Vérifier si c'est une réservation d'expérience
  let metadata: any = null;
  try {
    metadata = reservation.metadata ? JSON.parse(reservation.metadata) : null;
  } catch {}
  
  const isExperience = metadata?.experienceId || metadata?.expSlug;
  
  if (isExperience) {
    // Rediriger vers la page de réservation d'expérience
    const expSlug = metadata?.expSlug;
    const boatId = reservation.boatId;
    const start = reservation.startDate.toISOString().slice(0, 10);
    const end = reservation.endDate.toISOString().slice(0, 10);
    const part = reservation.part || 'FULL';
    if (expSlug && boatId) {
      redirect(`/booking/experience?exp=${encodeURIComponent(expSlug)}&boat=${boatId}&start=${start}&end=${end}&part=${part}&canceled=1${locale === 'en' ? '&lang=en' : ''}`);
    } else {
      redirect(`/?canceled=1${locale === 'en' ? '&lang=en' : ''}`);
    }
  } else {
    // Rediriger vers la page de checkout normale
    const boatSlug = reservation.boatId ? (await prisma.boat.findUnique({ where: { id: reservation.boatId }, select: { slug: true } }))?.slug : null;
    
    if (boatSlug) {
      const start = reservation.startDate.toISOString().slice(0, 10);
      const end = reservation.endDate.toISOString().slice(0, 10);
      const part = reservation.part || 'FULL';
      redirect(`/checkout?boat=${boatSlug}&start=${start}${end !== start ? `&end=${end}` : ''}&part=${part}&canceled=1${locale === 'en' ? '&lang=en' : ''}`);
    } else {
      redirect(`/?canceled=1${locale === 'en' ? '&lang=en' : ''}`);
    }
  }
}
