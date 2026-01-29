import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function ensureAdmin() {
  const session = (await getServerSession()) as any;
  if (!session?.user) return null;
  if ((session.user as any)?.role === 'admin') return session.user;
  // fallback DB
  if (session.user?.email) {
    try {
      const u = await (prisma as any).user.findUnique({ where: { email: session.user.email }, select: { role: true } });
      if (u?.role === 'admin') return session.user;
    } catch {}
  }
  return null;
}

// GET /api/admin/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) return NextResponse.json({ error: 'missing_range' }, { status: 400 });
  
  // Normaliser les dates en UTC pour correspondre au format de stockage
  const fromMatch = from.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const toMatch = to.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!fromMatch || !toMatch) return NextResponse.json({ error: 'bad_range' }, { status: 400 });
  
  const [, fromYear, fromMonth, fromDay] = fromMatch.map(Number);
  const [, toYear, toMonth, toDay] = toMatch.map(Number);
  
  const start = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay, 0, 0, 0, 0));
  const end = new Date(Date.UTC(toYear, toMonth - 1, toDay, 23, 59, 59, 999));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return NextResponse.json({ error: 'bad_range' }, { status: 400 });
  try {
    const [boats, slots, reservations] = await Promise.all([
      (prisma as any).boat.findMany({ 
        select: { 
          id: true, 
          name: true, 
          slug: true, 
          imageUrl: true,
          skipperPrice: true,
          skipperRequired: true
        },
        orderBy: { name: 'asc' }
      }),
      (prisma as any).availabilitySlot.findMany({
        where: { date: { gte: start, lte: end } },
        select: { id: true, boatId: true, date: true, part: true, status: true, note: true }
      }),
      (prisma as any).reservation.findMany({
        where: { startDate: { lte: end }, endDate: { gte: start }, status: { not: 'canceled' } },
        include: {
          boat: { 
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrl: true,
              skipperPrice: true,
              skipperRequired: true,
              options: { 
                select: { id: true, label: true, price: true } 
              }
            }
          },
          user: { 
            select: { 
              id: true, 
              name: true, 
              firstName: true, 
              lastName: true, 
              email: true, 
              phone: true 
            } 
          }
        }
      })
    ]);
    return NextResponse.json({ boats, slots, reservations });
  } catch (e) {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

// PATCH note update { id, note }
export async function PATCH(req: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: any = {};
  try { body = await req.json(); } catch {}
  const { id, note } = body || {};
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  try {
    const updated = await (prisma as any).availabilitySlot.update({ where: { id: Number(id) }, data: { note: note || null } });
    return NextResponse.json({ ok: true, slot: updated });
  } catch { return NextResponse.json({ error: 'failed' }, { status: 500 }); }
}

// POST create/toggle { boatId, date: 'YYYY-MM-DD', part: 'AM'|'PM'|'FULL', note? }
export async function POST(req: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: any = {};
  try { body = await req.json(); } catch {}
  const { boatId, date, part, note } = body || {};
  if (!boatId || !date || !part) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  if (!['AM','PM','FULL'].includes(part)) return NextResponse.json({ error: 'bad_part' }, { status: 400 });
  
  // Normaliser la date en UTC pour correspondre à la recherche
  // Parser la date depuis la chaîne YYYY-MM-DD
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return NextResponse.json({ error: 'bad_date' }, { status: 400 });
  const [, yearStr, monthStr, dayStr] = dateMatch;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const dayNum = parseInt(dayStr, 10);
  
  // Créer la date en UTC à minuit pour correspondre au format de recherche
  const day = new Date(Date.UTC(year, month - 1, dayNum, 0, 0, 0, 0));
  if (isNaN(day.getTime())) return NextResponse.json({ error: 'bad_date' }, { status: 400 });
  
  console.log(`[availability] Creating slot: boatId=${boatId}, date=${date} -> UTC: ${day.toISOString()}`);

  try {
    // toggle logic: if exists -> delete; else create
    const existing = await (prisma as any).availabilitySlot.findUnique({ where: { boatId_date_part: { boatId: Number(boatId), date: day, part } } });
    if (existing) {
      await (prisma as any).availabilitySlot.delete({ where: { id: existing.id } });
      return NextResponse.json({ toggled: 'removed', id: existing.id });
    }
    // If creating FULL remove AM/PM for that day for this boat
    if (part === 'FULL') {
      await (prisma as any).availabilitySlot.deleteMany({ where: { boatId: Number(boatId), date: day, part: { in: ['AM','PM'] } } });
    } else {
      // If creating AM or PM and FULL exists, delete FULL
      await (prisma as any).availabilitySlot.deleteMany({ where: { boatId: Number(boatId), date: day, part: 'FULL' } });
    }
    const created = await (prisma as any).availabilitySlot.create({ data: { boatId: Number(boatId), date: day, part, status: 'available', note: note || null } });
    return NextResponse.json({ toggled: 'added', slot: created });
  } catch (e) {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
