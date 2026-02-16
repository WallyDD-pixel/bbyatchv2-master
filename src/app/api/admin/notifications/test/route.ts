import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail, getNotificationEmail } from '@/lib/email';

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
    const body = await req.json().catch(() => ({}));
    const emailType = body.type || 'basic'; // basic, reservation, payment, agency, contact
    
    const notificationEmail = await getNotificationEmail();
    const settings = await prisma.settings.findFirst({ select: { logoUrl: true } });
    const logoUrl = (settings as any)?.logoUrl || null;
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    // Importer les templates
    const { 
      newReservationEmail, 
      paymentReceivedEmail, 
      newAgencyRequestEmail, 
      newContactMessageEmail,
      reservationStatusChangeEmail,
      newUserAccountEmail,
      welcomeEmail 
    } = await import('@/lib/email-templates');
    
    let testHtml: string;
    let testSubject: string;
    
    // Générer le template selon le type
    if (emailType === 'reservation') {
      const testData = {
        id: 'TEST-RES-001',
        reference: 'RES-202601-TEST',
        boatName: 'KALYPSO II',
        userName: 'Jean Dupont',
        userEmail: notificationEmail,
        userPhone: '+33 6 12 34 56 78',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        part: 'FULL',
        passengers: 4,
        totalPrice: 2000,
        depositAmount: 400,
        remainingAmount: 1600,
        status: 'deposit_paid',
        experienceTitle: undefined,
        waterToys: true,
        childrenCount: 2,
        specialNeeds: 'Besoin d\'une rampe d\'accès',
        wantsExcursion: true,
        departurePort: 'Port de Cannes',
        optionNames: ['Snorkeling', 'Paddle'],
        boatCapacity: 12,
        boatLength: 40,
        boatSpeed: 25,
        skipperRequired: true,
        skipperPrice: 350,
        currency: 'eur',
        locale: 'fr',
      };
      const result = await newReservationEmail(testData, 'fr', logoUrl);
      testHtml = result.html;
      testSubject = result.subject;
    } else if (emailType === 'payment') {
      const testData = {
        id: 'TEST-RES-001',
        reference: 'RES-202601-TEST',
        boatName: 'KALYPSO II',
        userName: 'Jean Dupont',
        userEmail: notificationEmail,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        part: 'FULL',
        passengers: 4,
        totalPrice: 2000,
        depositAmount: 400,
        status: 'deposit_paid',
        currency: 'eur',
        locale: 'fr',
      };
      const result = paymentReceivedEmail(testData, 400, 'fr');
      testHtml = result.html;
      testSubject = result.subject;
    } else if (emailType === 'agency') {
      const testData = {
        id: 'TEST-AGENCY-001',
        userName: 'Agence Voyages',
        userEmail: notificationEmail,
        boatName: 'KALYPSO II',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        part: 'FULL',
        passengers: 8,
        totalPrice: 2500,
        status: 'pending',
      };
      const result = newAgencyRequestEmail(testData, 'fr');
      testHtml = result.html;
      testSubject = result.subject;
    } else if (emailType === 'contact') {
      const testData = {
        name: 'Marie Martin',
        email: notificationEmail,
        phone: '+33 6 12 34 56 78',
        message: 'Bonjour, je souhaiterais obtenir des informations sur vos bateaux disponibles pour le mois de juillet. Merci de me contacter.',
        sourcePage: 'contact',
      };
      const result = newContactMessageEmail(testData, 'fr');
      testHtml = result.html;
      testSubject = result.subject;
    } else if (emailType === 'status-change') {
      const testData = {
        id: 'TEST-RES-001',
        reference: 'RES-202601-TEST',
        boatName: 'KALYPSO II',
        userName: 'Jean Dupont',
        userEmail: notificationEmail,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        part: 'FULL',
        passengers: 4,
        totalPrice: 2000,
        depositAmount: 400,
        status: 'completed',
        currency: 'eur',
        locale: 'fr',
      };
      const result = reservationStatusChangeEmail(testData, 'deposit_paid', 'fr');
      testHtml = result.html;
      testSubject = result.subject;
    } else if (emailType === 'account-created') {
      const testData = {
        email: notificationEmail,
        name: 'Jean Dupont',
        firstName: 'Jean',
        lastName: 'Dupont',
        phone: '+33 6 12 34 56 78',
        createdAt: new Date(),
      };
      const result = newUserAccountEmail(testData, 'fr', logoUrl);
      testHtml = result.html;
      testSubject = result.subject;
    } else if (emailType === 'welcome') {
      // Prévisualisation : envoyée à l'admin pour vérifier le design. En production, cet email est envoyé à l'utilisateur qui s'inscrit.
      const testData = {
        email: 'utilisateur@exemple.com',
        name: 'Jean Dupont',
        firstName: 'Jean',
        lastName: 'Dupont',
        phone: '+33 6 12 34 56 78',
        createdAt: new Date(),
      };
      const result = welcomeEmail(testData, 'fr', logoUrl);
      testHtml = result.html;
      testSubject = `[Prévisualisation admin] ${result.subject}`;
    } else {
      // Email de test basique
      testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; 
              line-height: 1.6; 
              color: #1a1a1a; 
              background-color: #ffffff;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .email-wrapper { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: #ffffff;
              box-shadow: 0 0 20px rgba(0,0,0,0.05);
            }
        .header { 
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); 
          color: white; 
          padding: 30px 25px; 
          text-align: center;
        }
        .logo-container {
          margin-bottom: 15px;
        }
        .logo-img {
          max-width: 150px;
          height: auto;
          display: block;
          margin: 0 auto;
        }
        .logo-text {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 26px;
          font-weight: 700;
          color: white;
          letter-spacing: 1.5px;
          margin: 0;
        }
        .header h1 { 
          font-size: 22px; 
          font-weight: 600;
          margin: 15px 0 6px 0;
          letter-spacing: -0.3px;
        }
        .header p {
          font-size: 13px;
          opacity: 0.95;
          margin: 0;
          font-weight: 400;
        }
        .content { 
          padding: 30px; 
          background: #ffffff;
        }
        .section {
          margin: 20px 0;
          padding: 16px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .section:last-child {
          border-bottom: none;
        }
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-row {
          display: table;
          width: 100%;
          margin: 0 0 12px 0;
        }
        .info-label {
          display: table-cell;
          width: 140px;
          font-weight: 600;
          color: #64748b;
          font-size: 12px;
          padding: 6px 0;
          vertical-align: top;
        }
        .info-value {
          display: table-cell;
          font-size: 14px;
          color: #111827;
          font-weight: 400;
          padding: 6px 0;
          vertical-align: top;
        }
        .success { 
          background: #d1fae5; 
          border: 1px solid #059669;
          border-radius: 6px;
          padding: 12px; 
          margin: 16px 0; 
        }
        .success strong {
          color: #065f46;
          display: block;
          margin-bottom: 4px;
          font-size: 13px;
        }
        .success p {
          color: #047857;
          font-size: 12px;
          margin: 0;
          line-height: 1.5;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #3b82f6;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          text-align: center;
          margin: 6px 6px 6px 0;
          transition: background 0.2s;
        }
            .button:hover {
              background: #2563eb;
            }
            .button-secondary {
              background: #ffffff;
              color: #3b82f6 !important;
              border: 2px solid #3b82f6;
            }
            .button-secondary:hover {
              background: #f0f9ff;
            }
            .button-success {
              background: #10b981;
            }
            .button-success:hover {
              background: #059669;
            }
            .button-group {
              margin: 30px 0;
              text-align: center;
            }
        .footer { 
          text-align: center; 
          padding: 25px 25px; 
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          color: #6b7280;
          font-size: 12px;
          margin: 4px 0;
          line-height: 1.5;
        }
            .footer a {
              color: #3b82f6;
              text-decoration: none;
            }
            .footer a:hover {
              text-decoration: underline;
            }
            .divider {
              height: 1px;
              background: #e5e7eb;
              margin: 30px 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <div class="logo-container">
                ${logoUrl ? `<img src="${logoUrl}" alt="BB YACHTS" class="logo-img" />` : `<div class="logo-text">BB YACHTS</div>`}
              </div>
              <h1>✅ Email de test</h1>
              <p>Test de configuration SMTP</p>
            </div>
          <div class="content">
            <div class="success">
              <strong>Configuration SMTP réussie !</strong>
              <p>Si vous recevez cet email, votre configuration SMTP est correcte et les notifications fonctionneront correctement.</p>
            </div>
            <div class="section">
              <div class="section-title">Informations de test</div>
              <div class="info-row">
                <div class="info-label">Date</div>
                <div class="info-value">${new Date().toLocaleString('fr-FR')}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Destinataire</div>
                <div class="info-value">${notificationEmail}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Type</div>
                <div class="info-value">Email de test SMTP</div>
              </div>
            </div>
            
            <div class="button-group" style="margin: 25px 0; text-align: center;">
              <a href="${baseUrl}/admin/notifications" class="button">
                Configurer les notifications
              </a>
              <a href="${baseUrl}/admin" class="button button-secondary">
                Retour à l'admin
              </a>
            </div>
          </div>
          <div class="footer">
            <p><strong>BB YACHTS</strong></p>
            <p>Port Camille Rayon – Avenue des frères Roustan</p>
            <p>06220 VALLAURIS, France</p>
            <p style="margin-top: 15px;">
              <a href="mailto:charter@bb-yachts.com">charter@bb-yachts.com</a> | 
              <a href="tel:+33609176282">06 09 17 62 82</a>
            </p>
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
              <a href="${baseUrl}" class="button button-secondary" style="margin: 4px;">
                Visiter le site
              </a>
              <a href="${baseUrl}/signup" class="button button-success" style="margin: 4px;">
                Créer un compte
              </a>
            </div>
            <p style="margin-top: 20px; font-size: 11px; color: #9ca3af;">
              Cet email de test a été envoyé automatiquement depuis votre application.
            </p>
          </div>
          </div>
        </body>
        </html>
      `;
      testSubject = 'Test de notification - BB YACHTS';
    }

    // Tous les tests sont envoyés à l'admin pour prévisualisation. Pour "welcome", en production l'email de bienvenue va à l'utilisateur qui s'inscrit.
    const success = await sendEmail({
      to: notificationEmail,
      subject: testSubject,
      html: testHtml,
    });

    const welcomeNote = emailType === 'welcome'
      ? ' Prévisualisation envoyée ici ; lors d\'une inscription réelle, l\'email de bienvenue est envoyé à l\'utilisateur qui s\'inscrit.'
      : '';
    if (success) {
      return NextResponse.json({ success: true, message: `Email de test envoyé avec succès.${welcomeNote}` });
    } else {
      return NextResponse.json({ error: 'email_send_failed' }, { status: 500 });
    }
  } catch (e: any) {
    console.error('Error sending test email:', e);
    return NextResponse.json({ error: 'server_error', details: e?.message }, { status: 500 });
  }
}
