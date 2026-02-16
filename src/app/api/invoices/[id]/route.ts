import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { generateInvoicePDF } from '@/lib/generate-invoice-pdf';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const session = await getServerSession() as any;
    if (!session?.user?.email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const sessionEmail = session.user.email as string;
    let role: string | undefined = (session.user as any)?.role;
    if (!role) {
      try {
        const u = await prisma.user.findUnique({ where: { email: sessionEmail }, select: { role: true } });
        role = u?.role;
      } catch {}
    }
    const isAdmin = role === 'admin';

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });
    if (!reservation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (reservation.user?.email !== sessionEmail && !isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const buffer = await generateInvoicePDF(id);
    if (!buffer) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const invoiceNumber = `AC-${new Date().getFullYear()}-${id.slice(-6)}`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoiceNumber}.pdf"`,
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
