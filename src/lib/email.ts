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

/**
 * Crée un transporteur SMTP configuré depuis les settings
 */
async function createTransporter() {
  const settings = await prisma.settings.findFirst();
  
  if (!settings) {
    throw new Error('Settings not found');
  }

  // Si pas de configuration SMTP, utiliser un transporteur de test (console)
  if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
    console.warn('⚠️ SMTP not configured. Emails will be logged to console only.');
    console.warn('📋 SMTP Configuration status:', {
      smtpHost: settings.smtpHost ? '✅ Set' : '❌ Missing',
      smtpUser: settings.smtpUser ? '✅ Set' : '❌ Missing',
      smtpPassword: settings.smtpPassword ? '✅ Set' : '❌ Missing',
      smtpPort: settings.smtpPort || 'Using default (587)',
    });
    return nodemailer.createTransport({
      jsonTransport: true, // Log emails to console
    });
  }

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort || 587,
    secure: settings.smtpPort === 465, // true pour 465, false pour autres ports
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPassword,
    },
  });
}

/**
 * Envoie un email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const settings = await prisma.settings.findFirst();
    
    if (!settings?.notificationEmailEnabled) {
      console.log('📧 Email notifications are disabled');
      return false;
    }

    const transporter = await createTransporter();
    const fromEmail = settings.smtpFromEmail || 'noreply@bb-yachts.com';
    const fromName = settings.smtpFromName || 'BB YACHTS';

    // Validation des paramètres requis
    if (!options.html) {
      console.error('❌ Error sending email: html content is missing');
      return false;
    }

    const mailOptions: any = {
      from: `"${fromName}" <${fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject || 'Notification',
      text: options.text || (options.html ? options.html.replace(/<[^>]*>/g, '') : ''),
      html: options.html,
    };

    // Ajouter les pièces jointes si présentes
    if (options.attachments && options.attachments.length > 0) {
      mailOptions.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/pdf',
      }));
    }

    const info = await transporter.sendMail(mailOptions);
    
    // Si c'est un transporteur de test, log l'email
    if (transporter.transporter.name === 'JSONTransport') {
      console.log('📧 Email (logged to console):', JSON.stringify(mailOptions, null, 2));
    } else {
      console.log('📧 Email sent:', info.messageId);
    }

    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
}

/**
 * Récupère l'email destinataire des notifications
 */
export async function getNotificationEmail(): Promise<string> {
  const settings = await prisma.settings.findFirst();
  return settings?.notificationEmailTo || 'charter@bb-yachts.com';
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
