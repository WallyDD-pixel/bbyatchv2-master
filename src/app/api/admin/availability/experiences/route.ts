import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function ensureAdmin() {
  const session = await getServerSession() as any;
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
      slots = await (prisma as any).experienceAvailabilitySlot.findMany({
        where: { date: { gte: start, lte: end } },
        select: { id:true, experienceId:true, boatId:true, date:true, part:true, status:true, note:true }
      });
    } catch {
      // Table absente (migration non appliquée) => on renvoie quand même les expériences
    }
    return NextResponse.json({ experiences, slots });
  } catch { return NextResponse.json({ error: 'failed' }, { status: 500 }); }
}

// PATCH { id, note? }
export async function PATCH(req: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: any = {}; try { body = await req.json(); } catch {}
  const { id, note } = body || {};
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  try {
    const data: any = {};
    if (note !== undefined) data.note = note || null;
    const updated = await (prisma as any).experienceAvailabilitySlot.update({ where: { id: Number(id) }, data });
    return NextResponse.json({ ok:true, slot: updated });
  } catch { return NextResponse.json({ error: 'failed' }, { status: 500 }); }
}

// POST toggle { experienceId, boatId?, date:'YYYY-MM-DD', part, note?, experiencePrice? }
export async function POST(req: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: any = {}; try { body = await req.json(); } catch {}
  const { experienceId, boatId, date, part, note, experiencePrice, addOnly, deleteOnly } = body || {};
  if (!experienceId || !date || !part) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  if (!['AM','PM','FULL','SUNSET'].includes(part)) return NextResponse.json({ error: 'bad_part' }, { status: 400 });
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return NextResponse.json({ error: 'bad_date' }, { status: 400 });
  const [, y, m, d] = dateMatch.map(Number);
  const day = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  if (isNaN(day.getTime())) return NextResponse.json({ error: 'bad_date' }, { status: 400 });
  const expId = Number(experienceId);
  const bId = boatId ? Number(boatId) : null;
  const price = experiencePrice != null && experiencePrice !== '' ? Number(experiencePrice) : null;
  
  try {
    let existing = null;
    try {
      if (bId !== null) {
        existing = await (prisma as any).experienceAvailabilitySlot.findFirst({
          where: { experienceId: expId, boatId: bId, date: day, part },
          select: { id: true },
        });
      } else {
        existing = await (prisma as any).experienceAvailabilitySlot.findFirst({
          where: { experienceId: expId, boatId: null, date: day, part },
          select: { id: true },
        });
      }
    } catch (e: any) {
      console.error('Error finding existing slot:', e);
    }
    
    if (existing) { 
      if (addOnly) return NextResponse.json({ toggled:'unchanged', id: existing.id }); 
      // Ne pas utiliser Prisma pour DELETE: certaines colonnes peuvent être absentes côté DB.
      await (prisma as any).$executeRawUnsafe(
        `DELETE FROM "ExperienceAvailabilitySlot" WHERE "id" = ${existing.id}`
      );
      return NextResponse.json({ toggled:'removed', id: existing.id });
    }
    
    if (!addOnly) {
      // Ne pas utiliser Prisma pour DELETE: certaines colonnes peuvent être absentes côté DB.
      const partsToDelete =
        part === 'FULL' ? ['AM', 'PM', 'SUNSET'] :
        part === 'SUNSET' ? ['FULL', 'AM', 'PM'] :
        ['FULL', 'SUNSET'];

      const boatCond = bId !== null ? `"boatId" = ${bId}` : `"boatId" IS NULL`;
      const partIn = partsToDelete.map(p => `'${p}'`).join(',');
      const dayIso = day.toISOString();

      await (prisma as any).$executeRawUnsafe(
        `DELETE FROM "ExperienceAvailabilitySlot"
         WHERE "experienceId" = ${expId}
           AND "date" = '${dayIso}'
           AND ${boatCond}
           AND "part" IN (${partIn})`
      );

      // Si c'est une suppression (UI "Supprimer"), ne pas réinsérer un slot.
      if (deleteOnly) return NextResponse.json({ toggled:'removed', id: null });
    }
    
    // Certains environnements n'ont pas encore la colonne `showInUpcoming`.
    // On teste d'abord son existence, puis on construit l'INSERT en conséquence.
    const safeNote = note || null;
    const hasShowInUpcoming = await (prisma as any).$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND LOWER(table_name) = LOWER('ExperienceAvailabilitySlot')
          AND LOWER(column_name) = LOWER('showInUpcoming')
      ) AS "exists"
    `;

    let inserted: Array<{ id: number }> = [];
    if (hasShowInUpcoming?.[0]?.exists) {
      inserted = await (prisma as any).$queryRaw<Array<{ id: number }>>`
        INSERT INTO "ExperienceAvailabilitySlot"
          (
            "experienceId",
            "boatId",
            "date",
            "part",
            "status",
            "note",
            "fixedDepartureTime",
            "fixedReturnTime",
            "showInUpcoming",
            "createdAt",
            "updatedAt"
          )
        VALUES
          (
            ${expId},
            ${bId},
            ${day},
            ${part},
            'available',
            ${safeNote},
            null,
            null,
            true,
            NOW(),
            NOW()
          )
        RETURNING "id"
      `;
    } else {
      inserted = await (prisma as any).$queryRaw<Array<{ id: number }>>`
        INSERT INTO "ExperienceAvailabilitySlot"
          (
            "experienceId",
            "boatId",
            "date",
            "part",
            "status",
            "note",
            "fixedDepartureTime",
            "fixedReturnTime",
            "createdAt",
            "updatedAt"
          )
        VALUES
          (
            ${expId},
            ${bId},
            ${day},
            ${part},
            'available',
            ${safeNote},
            null,
            null,
            NOW(),
            NOW()
          )
        RETURNING "id"
      `;
    }

    const created = { id: inserted?.[0]?.id };
    
    // Si un boatId est fourni et un prix est défini, créer ou mettre à jour le BoatExperience
    if (bId !== null && price !== null) {
      try {
        await (prisma as any).boatExperience.upsert({
          where: { boatId_experienceId: { boatId: bId, experienceId: expId } },
          update: { price: price },
          create: { boatId: bId, experienceId: expId, price: price }
        });
      } catch (e: any) {
        console.error('Error upserting BoatExperience:', e);
        // Ne pas faire échouer la création du slot si l'upsert échoue
      }
    }
    
    return NextResponse.json({ toggled:'added', slot: created });
  } catch (e: any) { 
    console.error('Error creating experience slot:', e);
    return NextResponse.json({ error: 'failed', details: e?.message }, { status: 500 }); 
  }
}
