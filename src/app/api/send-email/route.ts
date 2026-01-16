import { NextResponse } from 'next/server';

// Route API pour l'envoi d'emails
// Cette route peut être connectée à un service d'email (Resend, SendGrid, Nodemailer, etc.)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, text, html } = body;
    
    if (!to || !subject || (!text && !html)) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }
    
    // TODO: Connecter à un service d'email (Resend, SendGrid, Nodemailer avec SMTP, etc.)
    // Pour l'instant, on log simplement les emails (à remplacer par un vrai service)
    console.log('=== EMAIL NOTIFICATION ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body:', text || html);
    console.log('========================');
    
    // Exemple avec Resend (nécessite npm install resend et clé API dans .env):
    // import { Resend } from 'resend';
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'noreply@bb-yachts.com',
    //   to: to,
    //   subject: subject,
    //   html: html || text,
    // });
    
    // Pour l'instant, retourner un succès (l'email sera envoyé via le service configuré)
    return NextResponse.json({ success: true, message: 'Email sent (logged to console - configure email service to actually send)' });
  } catch (error) {
    console.error('Error in send-email route:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
