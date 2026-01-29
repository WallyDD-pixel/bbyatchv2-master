import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: liste des demandes agence (admin ou agence propriétaire)
export async function GET(req: Request){
  try {
    const session = await getServerSession() as any;
    if(!session?.user?.email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const user = await prisma.user.findUnique({ where:{ email: session.user.email }, select:{ id:true, role:true } });
    if(!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get('limit')||'50');
    const where = user.role==='admin'? {} : { userId: user.id };
    const data = await prisma.agencyRequest.findMany({ where, orderBy:{ createdAt: 'desc' }, take: Math.min(limit,200), include:{ boat:{ select:{ name:true, slug:true } } } });
    return NextResponse.json({ data });
  } catch(e){
    console.error(e); return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

// POST: créer une demande (si utilisateur role=agency)
export async function POST(req: Request){
  try {
    const session = await getServerSession() as any;
    if(!session?.user?.email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const user = await prisma.user.findUnique({ where:{ email: session.user.email }, select:{ id:true, role:true } });
    if(!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    if(user.role !== 'agency') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const body = await req.json();
    const { boatSlug, start, end, part, pax, locale='fr' } = body || {};
    if(!boatSlug || !start || !part) return NextResponse.json({ error: 'missing_params' }, { status: 400 });
    const boat = await prisma.boat.findUnique({ where:{ slug: boatSlug } });
    if(!boat) return NextResponse.json({ error: 'boat_not_found' }, { status: 404 });

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if(!dateRegex.test(start) || (end && !dateRegex.test(end))) return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
    const s = new Date(start+'T00:00:00');
    const e = new Date((part==='FULL' && end? end : start)+'T00:00:00');
    if(e < s) return NextResponse.json({ error: 'invalid_range' }, { status: 400 });
    let days = 1;
    if(part==='FULL') days = Math.round((e.getTime()-s.getTime())/86400000)+1; else if(end && end!==start) return NextResponse.json({ error: 'halfday_range' }, { status: 400 });

    // Prix agence : utiliser prix agence défini ou calculer automatiquement (-20%)
    const calculateAgencyPrice = (publicPrice: number): number => {
      return Math.round(publicPrice * 0.8); // -20% sur la coque nue
    };
    
    const boatWithPrices = await prisma.boat.findUnique({ 
      where: { slug: boatSlug }, 
      select: { 
        pricePerDay:true, priceAm:true, pricePm:true, 
        priceAgencyPerDay:true, priceAgencyAm:true, priceAgencyPm:true 
      } 
    });
    
    let total: number|null = null;
    if(part==='FULL') {
      total = boatWithPrices?.priceAgencyPerDay 
        ? boatWithPrices.priceAgencyPerDay * days 
        : calculateAgencyPrice(boatWithPrices?.pricePerDay || 0) * days;
    } else if(part==='AM') {
      total = boatWithPrices?.priceAgencyAm ?? (boatWithPrices?.priceAm ? calculateAgencyPrice(boatWithPrices.priceAm) : calculateAgencyPrice(Math.round((boatWithPrices?.pricePerDay || 0) / 2)));
    } else if(part==='PM') {
      total = boatWithPrices?.priceAgencyPm ?? (boatWithPrices?.pricePm ? calculateAgencyPrice(boatWithPrices.pricePm) : calculateAgencyPrice(Math.round((boatWithPrices?.pricePerDay || 0) / 2)));
    }
    if(total==null) return NextResponse.json({ error:'price_missing' }, { status:400 });

    const reqCreated = await prisma.agencyRequest.create({
      data:{
        userId: user.id,
        boatId: boat.id,
        startDate: s,
        endDate: e,
        part,
        passengers: pax? Number(pax): undefined,
        totalPrice: total,
        locale,
        currency: 'eur'
      }
    });
    
    // Envoyer un email à charter@bb-yachts.com pour notifier d'une nouvelle demande agence
    try {
      const { sendEmail } = await import('@/lib/email');
      const { newAgencyRequestEmail } = await import('@/lib/email-templates');
      
      const userFull = await prisma.user.findUnique({ 
        where: { id: user.id }, 
        select: { email: true, firstName: true, lastName: true, name: true } 
      });
      
      const emailData = {
        id: reqCreated.id,
        userName: `${userFull?.firstName || ''} ${userFull?.lastName || ''}`.trim() || userFull?.name || userFull?.email || 'Agence',
        userEmail: userFull?.email || '',
        boatName: boat.name,
        startDate: start,
        endDate: end || start,
        part,
        passengers: pax ? Number(pax) : undefined,
        totalPrice: total,
        status: reqCreated.status,
      };
      
      const { subject, html } = newAgencyRequestEmail(emailData, locale as 'fr' | 'en');
      
      await sendEmail({
        to: 'charter@bb-yachts.com',
        subject,
        html,
      });
    } catch (emailErr) {
      console.error('Error sending notification email for agency request:', emailErr);
      // Ne pas bloquer la création de la demande si l'email échoue
    }
    
    return NextResponse.json({ status: 'created', requestId: reqCreated.id });
  } catch(e){
    console.error(e); return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

// PATCH: changer statut (admin)
export async function PATCH(req: Request){
  try {
    const session = await getServerSession() as any;
    if(!session?.user?.email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const user = await prisma.user.findUnique({ where:{ email: session.user.email }, select:{ id:true, role:true } });
    if(!user || user.role!=='admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const body = await req.json();
    const { id, status } = body || {};
    if(!id || !status) return NextResponse.json({ error: 'missing_params' }, { status:400 });
    const allowed = new Set(['pending','approved','rejected','converted']);
    if(!allowed.has(status)) return NextResponse.json({ error: 'invalid_status' }, { status:400 });
    
    // Récupérer l'ancien statut
    const oldRequest = await prisma.agencyRequest.findUnique({ 
      where: { id },
      include: { boat: { select: { name: true } }, user: { select: { name: true, firstName: true, lastName: true, email: true } } }
    });
    const oldStatus = oldRequest?.status || 'pending';
    
    const updated = await prisma.agencyRequest.update({ 
      where:{ id }, 
      data:{ status },
      include: { boat: { select: { name: true } }, user: { select: { name: true, firstName: true, lastName: true, email: true } } }
    });
    
    // Envoyer une notification pour le changement de statut
    if (oldStatus !== status && updated) {
      try {
        const { sendEmail, getNotificationEmail, isNotificationEnabled } = await import('@/lib/email');
        const { agencyRequestStatusChangeEmail } = await import('@/lib/email-templates');
        
        if (await isNotificationEnabled('agencyRequestStatusChange')) {
          const userName = updated.user?.name || `${updated.user?.firstName || ''} ${updated.user?.lastName || ''}`.trim() || updated.user?.email || 'Agence';
          const locale = (updated.locale as 'fr' | 'en') || 'fr';
          
          const emailData = {
            id: updated.id,
            userName,
            userEmail: updated.user?.email || '',
            boatName: updated.boat?.name || 'N/A',
            startDate: updated.startDate.toISOString().split('T')[0],
            endDate: updated.endDate.toISOString().split('T')[0],
            part: updated.part || 'FULL',
            passengers: updated.passengers,
            totalPrice: updated.totalPrice,
            status: updated.status,
          };
          
          const { subject, html } = agencyRequestStatusChangeEmail(emailData, status, locale);
          const notificationEmail = await getNotificationEmail();
          
          await sendEmail({
            to: notificationEmail,
            subject,
            html,
          });
        }
      } catch (emailErr) {
        console.error('Error sending agency request status change notification:', emailErr);
        // Ne pas bloquer la mise à jour si l'email échoue
      }
    }
    
    return NextResponse.json({ status: 'updated', request: updated });
  } catch(e){ console.error(e); return NextResponse.json({ error:'server_error' }, { status:500 }); }
}
