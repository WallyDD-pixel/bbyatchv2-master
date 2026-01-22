import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function ensureAdmin() {
  const session = (await getServerSession(auth as any)) as any;
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

export async function POST(req: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const data = await req.formData();

    const updateData: any = {};

    // Configuration SMTP
    const smtpHost = (data.get('smtpHost') || '').toString().trim() || null;
    const smtpPort = (data.get('smtpPort') || '').toString().trim();
    const smtpUser = (data.get('smtpUser') || '').toString().trim() || null;
    const smtpPassword = (data.get('smtpPassword') || '').toString().trim() || null;
    const smtpFromEmail = (data.get('smtpFromEmail') || '').toString().trim() || null;
    const smtpFromName = (data.get('smtpFromName') || '').toString().trim() || null;

    if (smtpHost) updateData.smtpHost = smtpHost;
    if (smtpPort) updateData.smtpPort = parseInt(smtpPort, 10) || 587;
    if (smtpUser) updateData.smtpUser = smtpUser;
    if (smtpPassword) updateData.smtpPassword = smtpPassword;
    if (smtpFromEmail) updateData.smtpFromEmail = smtpFromEmail;
    if (smtpFromName) updateData.smtpFromName = smtpFromName;

    // Email destinataire
    const notificationEmailTo = (data.get('notificationEmailTo') || '').toString().trim() || null;
    if (notificationEmailTo) updateData.notificationEmailTo = notificationEmailTo;

    // Types de notifications
    updateData.notificationEmailEnabled = data.get('notificationEmailEnabled') === 'on';
    updateData.notificationEmailReservation = data.get('notificationEmailReservation') === 'on';
    updateData.notificationEmailReservationStatusChange = data.get('notificationEmailReservationStatusChange') === 'on';
    updateData.notificationEmailAgencyRequest = data.get('notificationEmailAgencyRequest') === 'on';
    updateData.notificationEmailAgencyRequestStatusChange = data.get('notificationEmailAgencyRequestStatusChange') === 'on';
    updateData.notificationEmailContactMessage = data.get('notificationEmailContactMessage') === 'on';
    updateData.notificationEmailPaymentReceived = data.get('notificationEmailPaymentReceived') === 'on';

    await prisma.settings.update({
      where: { id: 1 },
      data: updateData,
    });

    return NextResponse.redirect(new URL('/admin/notifications?success=1', req.url));
  } catch (e: any) {
    console.error('Error updating notification settings:', e);
    return NextResponse.json({ error: 'server_error', details: e?.message }, { status: 500 });
  }
}
