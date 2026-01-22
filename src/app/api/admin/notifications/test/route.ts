import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail, getNotificationEmail } from '@/lib/email';

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
    const notificationEmail = await getNotificationEmail();
    
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .success { background: #d1fae5; border-left: 4px solid #059669; padding: 15px; margin: 15px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✅ Email de test</h1>
          </div>
          <div class="content">
            <div class="success">
              <strong>Configuration SMTP réussie !</strong><br>
              Si vous recevez cet email, votre configuration SMTP est correcte et les notifications fonctionneront.
            </div>
            <p>Cet email a été envoyé depuis votre application BB YACHTS pour tester la configuration des notifications.</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const success = await sendEmail({
      to: notificationEmail,
      subject: 'Test de notification - BB YACHTS',
      html: testHtml,
    });

    if (success) {
      return NextResponse.json({ success: true, message: 'Email de test envoyé avec succès' });
    } else {
      return NextResponse.json({ error: 'email_send_failed' }, { status: 500 });
    }
  } catch (e: any) {
    console.error('Error sending test email:', e);
    return NextResponse.json({ error: 'server_error', details: e?.message }, { status: 500 });
  }
}
