import nodemailer from 'nodemailer';
import { prisma } from './prisma';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

const DEFAULT_NOTIFICATION_EMAIL = 'charter@bb-yachts.com';

/**
 * Crée un transporteur SMTP configuré depuis les settings.
 * Si pas de settings ou SMTP non configuré, retourne un transport "console" (jsonTransport).
 */
async function createTransporter(): Promise<{ transporter: nodemailer.Transporter; isJsonTransport: boolean }> {
  const settings = await prisma.settings.findFirst();

  if (!settings) {
    console.warn('⚠️ Settings not found. Emails will be logged to console only.');
    return {
      transporter: nodemailer.createTransport({ jsonTransport: true }),
      isJsonTransport: true,
    };
  }

  if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
    console.warn('⚠️ SMTP not configured. Emails will be logged to console only.');
    console.warn('📋 SMTP Configuration status:', {
      smtpHost: settings.smtpHost ? '✅ Set' : '❌ Missing',
      smtpUser: settings.smtpUser ? '✅ Set' : '❌ Missing',
      smtpPassword: settings.smtpPassword ? '✅ Set' : '❌ Missing',
      smtpPort: settings.smtpPort || 'Using default (587)',
    });
    return {
      transporter: nodemailer.createTransport({ jsonTransport: true }),
      isJsonTransport: true,
    };
  }

  return {
    transporter: nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword,
      },
    }),
    isJsonTransport: false,
  };
}

/**
 * Envoie un email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const settings = await prisma.settings.findFirst();

    if (!settings?.notificationEmailEnabled) {
      console.log('📧 Email notifications are disabled (notificationEmailEnabled=false)');
      return false;
    }

    const { transporter, isJsonTransport } = await createTransporter();
    const fromEmail = settings.smtpFromEmail || 'noreply@bb-yachts.com';
    const fromName = settings.smtpFromName || 'BB YACHTS';

    const toAddress = Array.isArray(options.to) ? options.to.join(', ') : (options.to || '').trim();
    if (!toAddress) {
      console.error('❌ Error sending email: recipient (to) is missing or empty');
      return false;
    }

    if (!options.html) {
      console.error('❌ Error sending email: html content is missing');
      return false;
    }

    const mailOptions: any = {
      from: `"${fromName}" <${fromEmail}>`,
      to: toAddress,
      subject: options.subject || 'Notification',
      text: options.text || (options.html ? options.html.replace(/<[^>]*>/g, '') : ''),
      html: options.html,
    };

    if (options.attachments && options.attachments.length > 0) {
      mailOptions.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/pdf',
      }));
    }

    const info = await transporter.sendMail(mailOptions);

    if (isJsonTransport) {
      console.log('📧 Email (logged to console, SMTP not configured):', JSON.stringify({ to: mailOptions.to, subject: mailOptions.subject }, null, 2));
    } else {
      console.log('📧 Email sent:', info?.messageId ?? 'ok');
    }

    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
}

/**
 * Récupère l'email destinataire des notifications (jamais vide)
 */
export async function getNotificationEmail(): Promise<string> {
  const settings = await prisma.settings.findFirst();
  const to = (settings?.notificationEmailTo || '').trim();
  return to || DEFAULT_NOTIFICATION_EMAIL;
}

/**
 * Vérifie si un type de notification est activé
 */
export async function isNotificationEnabled(type: 'reservation' | 'reservationStatusChange' | 'agencyRequest' | 'agencyRequestStatusChange' | 'contactMessage' | 'paymentReceived' | 'accountCreated'): Promise<boolean> {
  const settings = await prisma.settings.findFirst();
  if (!settings?.notificationEmailEnabled) return false;

  switch (type) {
    case 'reservation':
      return settings.notificationEmailReservation ?? true;
    case 'reservationStatusChange':
      return settings.notificationEmailReservationStatusChange ?? true;
    case 'agencyRequest':
      return settings.notificationEmailAgencyRequest ?? true;
    case 'agencyRequestStatusChange':
      return settings.notificationEmailAgencyRequestStatusChange ?? true;
    case 'contactMessage':
      return settings.notificationEmailContactMessage ?? true;
    case 'paymentReceived':
      return settings.notificationEmailPaymentReceived ?? true;
    case 'accountCreated':
      return (settings as any).notificationEmailAccountCreated ?? true;
    default:
      return false;
  }
}
