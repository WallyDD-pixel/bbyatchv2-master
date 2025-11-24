import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function ensureAdmin(){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user || (session.user as any)?.role!=='admin') return null;
  return session.user;
}

export async function GET(_:Request, { params }:{ params:Promise<{ id:string }>}){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const { id } = await params;
  const row = await (prisma as any).agencyRequest.findUnique({ where:{ id } });
  if(!row) return NextResponse.json({ error:'not_found' },{ status:404 });
  return NextResponse.json({ request: row });
}

export async function PATCH(req:Request, { params }:{ params:Promise<{ id:string }>}){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const { id } = await params;
  const body = await req.json().catch(()=>null);
  if(!body) return NextResponse.json({ error:'bad_request' },{ status:400 });
  const { status } = body;
  try {
    const updated = await (prisma as any).agencyRequest.update({ where:{ id }, data:{ status } });
    return NextResponse.json({ ok:true, request: updated });
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}

export async function DELETE(_:Request, { params }:{ params:Promise<{ id:string }>}){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const { id } = await params;
  try { await (prisma as any).agencyRequest.delete({ where:{ id } }); return NextResponse.json({ ok:true }); }
  catch(e:any){ return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 }); }
}

export async function POST(req:Request, { params }:{ params:Promise<{ id:string }>}){
  // method override via form
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const { id } = await params;
  try {
    const data = await req.formData();
    const method = String(data.get('_method')||'').toUpperCase();
    if(method==='DELETE'){
      await (prisma as any).agencyRequest.delete({ where:{ id } });
      const url = new URL('/admin/agency-requests?deleted=1', req.url);
      return NextResponse.redirect(url,303);
    }
    if(method==='PATCH'){
      const status = String(data.get('status')||'').trim();
      
      // Récupérer la demande d'agence avant mise à jour
      const agencyRequest = await (prisma as any).agencyRequest.findUnique({ 
        where:{ id },
        select: {
          userId: true,
          boatId: true,
          startDate: true,
          endDate: true,
          part: true,
          passengers: true,
          totalPrice: true,
          locale: true,
          currency: true,
          reservationId: true
        }
      });
      
      if (!agencyRequest) {
        return NextResponse.json({ error:'not_found' },{ status:404 });
      }
      
      // Si conversion et pas encore de réservation créée
      if (status === 'converted' && !agencyRequest.reservationId) {
        // Vérifier qu'il n'y a pas de chevauchement avec d'autres réservations
        const overlap = await (prisma as any).reservation.findFirst({
          where: {
            boatId: agencyRequest.boatId || undefined,
            status: { not: 'cancelled' },
            startDate: { lte: agencyRequest.endDate },
            endDate: { gte: agencyRequest.startDate },
            OR: [
              { part: 'FULL' },
              { part: agencyRequest.part },
              ...(agencyRequest.part === 'FULL' ? [{ part: 'AM' }, { part: 'PM' }] : []),
              { part: null }
            ]
          },
          select: { id: true }
        });
        
        if (overlap) {
          // Il y a un chevauchement, on ne crée pas la réservation
          const url = new URL(`/admin/agency-requests/${id}?error=overlap`, req.url);
          return NextResponse.redirect(url, 303);
        }
        
        // Créer la réservation
        const reservation = await (prisma as any).reservation.create({
          data: {
            userId: agencyRequest.userId,
            boatId: agencyRequest.boatId,
            startDate: agencyRequest.startDate,
            endDate: agencyRequest.endDate,
            part: agencyRequest.part,
            passengers: agencyRequest.passengers,
            totalPrice: agencyRequest.totalPrice,
            status: 'pending_deposit',
            locale: agencyRequest.locale,
            currency: agencyRequest.currency || 'eur',
          }
        });
        
        // Mettre à jour la demande d'agence avec le statut et l'ID de réservation
        await (prisma as any).agencyRequest.update({ 
          where: { id }, 
          data: { 
            status: 'converted',
            reservationId: reservation.id 
          } 
        });
      } else {
        // Simple mise à jour du statut
        await (prisma as any).agencyRequest.update({ where:{ id }, data:{ status } });
      }
      
      const url = new URL(`/admin/agency-requests/${id}?updated=1`, req.url);
      return NextResponse.redirect(url,303);
    }
    return NextResponse.json({ error:'unsupported' },{ status:400 });
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}
