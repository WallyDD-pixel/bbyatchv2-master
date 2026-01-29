import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function ensureAdmin() {
  const session = (await getServerSession()) as any;
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

// GET /api/admin/boats/[id]/experience-price?experienceId=XXX
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  
  const resolvedParams = params instanceof Promise ? await params : params;
  const boatId = Number(resolvedParams.id);
  const { searchParams } = new URL(req.url);
  const experienceId = searchParams.get('experienceId');
  
  if (!experienceId || isNaN(boatId)) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }
  
  try {
    const boatExperience = await (prisma as any).boatExperience.findUnique({
      where: {
        boatId_experienceId: {
          boatId: boatId,
          experienceId: Number(experienceId)
        }
      },
      select: { price: true }
    });
    
    return NextResponse.json({ price: boatExperience?.price || null });
  } catch (e: any) {
    console.error('Error fetching experience price:', e);
    return NextResponse.json({ error: 'failed', details: e?.message }, { status: 500 });
  }
}
