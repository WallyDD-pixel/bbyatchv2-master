import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/experiences/[slug]/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const url = new URL(_req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  try {
    const experience = await prisma.experience.findUnique({ where: { slug: params.slug }, select: { id: true } });
    if(!experience) return NextResponse.json({ slots: [] });
    const where: any = { experienceId: experience.id, status: 'available' };
    if(from || to){
      const range: any = {};
      if(from){ const d = new Date(from+'T00:00:00'); if(!isNaN(d.getTime())) range.gte = d; }
      if(to){ const d2 = new Date(to+'T23:59:59'); if(!isNaN(d2.getTime())) range.lte = d2; }
      if(Object.keys(range).length) where.date = range;
    }
    const slots = await (prisma as any).experienceAvailabilitySlot.findMany({
      where,
      select: { id:true, date:true, part:true, status:true },
      orderBy: [{ date: 'asc' }, { part: 'asc' }]
    });
    // console.log('EXP AVAIL', params.slug, from, to, slots.length);
    return NextResponse.json({ slots });
  } catch(e){
    console.error(e);
    return NextResponse.json({ slots: [] });
  }
}
