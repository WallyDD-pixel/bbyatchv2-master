import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function ensureAdmin() {
  const session = await getServerSession() as any;
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

    // Toujours mettre à jour les champs SMTP (même si vides, pour permettre la suppression)
    updateData.smtpHost = smtpHost;
    updateData.smtpPort = smtpPort ? (parseInt(smtpPort, 10) || 587) : 587;
    updateData.smtpUser = smtpUser;
    updateData.smtpPassword = smtpPassword;
    updateData.smtpFromEmail = smtpFromEmail;
    updateData.smtpFromName = smtpFromName;

    console.log('[notifications] Saving SMTP config:', {
      smtpHost: smtpHost ? '✅ Set' : '❌ Empty',
      smtpPort: updateData.smtpPort,
      smtpUser: smtpUser ? '✅ Set' : '❌ Empty',
      smtpPassword: smtpPassword ? '✅ Set (hidden)' : '❌ Empty',
      smtpFromEmail: smtpFromEmail || 'Using default',
      smtpFromName: smtpFromName || 'Using default',
    });

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

    // Essayer de mettre à jour, sinon créer
    try {
      await prisma.settings.update({
        where: { id: 1 },
        data: updateData,
      });
    } catch (updateError: any) {
      // Si l'enregistrement n'existe pas, le créer
      if (updateError?.code === 'P2025' || updateError?.message?.includes('Record to update not found')) {
        await prisma.settings.create({
          data: { id: 1, ...updateData },
        });
      } else {
        throw updateError;
      }
    }

    return NextResponse.redirect(new URL('/admin/notifications?success=1', req.url));
  } catch (e: any) {
    console.error('Error updating notification settings:', e);
    return NextResponse.json({ 
      error: 'server_error', 
      details: e?.message || 'Une erreur est survenue lors de la sauvegarde' 
    }, { status: 500 });
  }
}
