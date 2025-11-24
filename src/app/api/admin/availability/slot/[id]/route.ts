import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function ensureAdmin() {
  const session = (await getServerSession(auth as any)) as any;
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

// PATCH /api/admin/availability/slot/[id] - Update note
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  let body: any = {};
  try { body = await req.json(); } catch {}
  const { note } = body || {};
  
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  
  try {
    const updated = await (prisma as any).availabilitySlot.update({ 
      where: { id: Number(id) }, 
      data: { note: note || null } 
    });
    return NextResponse.json({ ok: true, slot: updated });
  } catch (e: any) {
    console.error('Error updating slot note:', e);
    return NextResponse.json({ error: 'failed', details: e?.message }, { status: 500 });
  }
}

// DELETE /api/admin/availability/slot/[id] - Delete slot
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  
  try {
    await (prisma as any).availabilitySlot.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Error deleting slot:', e);
    return NextResponse.json({ error: 'failed', details: e?.message }, { status: 500 });
  }
}

