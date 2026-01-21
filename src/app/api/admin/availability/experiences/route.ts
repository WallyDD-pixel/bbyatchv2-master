import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function ensureAdmin() {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) return null;
  if ((session.user as any)?.role === 'admin') return session.user;
  if (session.user?.email) {
    try { const u = await (prisma as any).user.findUnique({ where: { email: session.user.email }, select: { role: true } }); if (u?.role === 'admin') return session.user; } catch {}
  }
  return null;
}

// GET /api/admin/availability/experiences?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) return NextResponse.json({ error: 'missing_range' }, { status: 400 });
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T23:59:59');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return NextResponse.json({ error: 'bad_range' }, { status: 400 });
  try {
    const experiences = await (prisma as any).experience.findMany({ select: { id:true, slug:true, titleFr:true, titleEn:true, imageUrl:true } });
    let slots: any[] = [];
    try {
      slots = await (prisma as any).experienceAvailabilitySlot.findMany({ where: { date: { gte: start, lte: end } }, select: { id:true, experienceId:true, boatId:true, date:true, part:true, status:true, note:true } });
    } catch {
      // Table absente (migration non appliquée) => on renvoie quand même les expériences
    }
    return NextResponse.json({ experiences, slots });
  } catch { return NextResponse.json({ error: 'failed' }, { status: 500 }); }
}

// PATCH note { id, note }
export async function PATCH(req: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: any = {}; try { body = await req.json(); } catch {}
  const { id, note } = body || {};
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  try {
    const updated = await (prisma as any).experienceAvailabilitySlot.update({ where: { id: Number(id) }, data: { note: note || null } });
    return NextResponse.json({ ok:true, slot: updated });
  } catch { return NextResponse.json({ error: 'failed' }, { status: 500 }); }
}

// POST toggle { experienceId, boatId?, date:'YYYY-MM-DD', part, note? }
export async function POST(req: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: any = {}; try { body = await req.json(); } catch {}
  const { experienceId, boatId, date, part, note } = body || {};
  if (!experienceId || !date || !part) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  if (!['AM','PM','FULL','SUNSET'].includes(part)) return NextResponse.json({ error: 'bad_part' }, { status: 400 });
  const day = new Date(date + 'T00:00:00');
  if (isNaN(day.getTime())) return NextResponse.json({ error: 'bad_date' }, { status: 400 });
  const expId = Number(experienceId);
  const bId = boatId ? Number(boatId) : null;
  
  try {
    // Vérifier si un créneau existe déjà (avec ou sans boatId selon le cas)
    let existing = null;
    try {
      if (bId !== null) {
        // Chercher avec boatId spécifique
        existing = await (prisma as any).experienceAvailabilitySlot.findFirst({ 
          where: { experienceId: expId, boatId: bId, date: day, part } 
        });
      } else {
        // Si pas de boatId, chercher un créneau sans boatId pour cette expérience
        existing = await (prisma as any).experienceAvailabilitySlot.findFirst({ 
          where: { experienceId: expId, boatId: null, date: day, part } 
        });
      }
    } catch (e: any) {
      console.error('Error finding existing slot:', e);
    }
    
    if (existing) { 
      await (prisma as any).experienceAvailabilitySlot.delete({ where: { id: existing.id } }); 
      return NextResponse.json({ toggled:'removed', id: existing.id }); 
    }
    
    // Supprimer les créneaux incompatibles (même logique que pour les bateaux)
    const deleteWhere: any = { experienceId: expId, date: day };
    if (bId !== null) {
      deleteWhere.boatId = bId;
    } else {
      deleteWhere.boatId = null;
    }
    
    if (part==='FULL') {
      deleteWhere.part = { in:['AM','PM','SUNSET'] };
      await (prisma as any).experienceAvailabilitySlot.deleteMany({ where: deleteWhere });
    } else if (part==='SUNSET') {
      deleteWhere.part = { in:['FULL','AM','PM'] };
      await (prisma as any).experienceAvailabilitySlot.deleteMany({ where: deleteWhere });
    } else {
      deleteWhere.part = { in:['FULL','SUNSET'] };
      await (prisma as any).experienceAvailabilitySlot.deleteMany({ where: deleteWhere });
    }
    
    const created = await (prisma as any).experienceAvailabilitySlot.create({ 
      data: { experienceId: expId, boatId: bId, date: day, part, status:'available', note: note||null } 
    });
    return NextResponse.json({ toggled:'added', slot: created });
  } catch (e: any) { 
    console.error('Error creating experience slot:', e);
    return NextResponse.json({ error: 'failed', details: e?.message }, { status: 500 }); 
  }
}
