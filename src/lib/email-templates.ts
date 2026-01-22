/**
 * Templates d'emails pour les notifications
 */

interface ReservationData {
  id: string;
  reference?: string | null;
  boatName: string;
  userName: string;
  userEmail: string;
  startDate: string;
  endDate: string;
  part: string;
  passengers?: number | null;
  totalPrice?: number | null;
  depositAmount?: number | null;
  status: string;
  experienceTitle?: string;
}

interface AgencyRequestData {
  id: string;
  userName: string;
  userEmail: string;
  boatName: string;
  startDate: string;
  endDate: string;
  part: string;
  passengers?: number | null;
  totalPrice?: number | null;
  status: string;
}

interface ContactMessageData {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  sourcePage?: string | null;
}

/**
 * Template pour nouvelle réservation
 */
export function newReservationEmail(data: ReservationData, locale: 'fr' | 'en' = 'fr'): { subject: string; html: string } {
  const partLabel = locale === 'fr' 
    ? (data.part === 'FULL' ? 'Journée complète' : data.part === 'AM' ? 'Matin' : data.part === 'PM' ? 'Après-midi' : data.part === 'SUNSET' ? 'Sunset' : data.part)
    : (data.part === 'FULL' ? 'Full day' : data.part === 'AM' ? 'Morning' : data.part === 'PM' ? 'Afternoon' : data.part === 'SUNSET' ? 'Sunset' : data.part);

  const statusLabel = locale === 'fr'
    ? (data.status === 'pending_deposit' ? 'Acompte en attente' : data.status === 'deposit_paid' ? 'Acompte payé' : data.status === 'completed' ? 'Terminée' : data.status)
    : (data.status === 'pending_deposit' ? 'Deposit pending' : data.status === 'deposit_paid' ? 'Deposit paid' : data.status === 'completed' ? 'Completed' : data.status);

  const subject = locale === 'fr'
    ? `Nouvelle réservation - ${data.boatName} - ${data.startDate}`
    : `New reservation - ${data.boatName} - ${data.startDate}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #2563eb; }
        .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 16px; color: #111827; margin-top: 4px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${locale === 'fr' ? 'Nouvelle réservation' : 'New reservation'}</h1>
        </div>
        <div class="content">
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Référence' : 'Reference'}</div>
            <div class="value">${data.reference || data.id}</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Bateau' : 'Boat'}</div>
            <div class="value">${data.boatName}</div>
          </div>
          ${data.experienceTitle ? `
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Expérience' : 'Experience'}</div>
            <div class="value">${data.experienceTitle}</div>
          </div>
          ` : ''}
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Client' : 'Client'}</div>
            <div class="value">${data.userName} (${data.userEmail})</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Période' : 'Period'}</div>
            <div class="value">${data.startDate} → ${data.endDate}</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Créneau' : 'Slot'}</div>
            <div class="value">${partLabel}</div>
          </div>
          ${data.passengers ? `
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Passagers' : 'Passengers'}</div>
            <div class="value">${data.passengers}</div>
          </div>
          ` : ''}
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Statut' : 'Status'}</div>
            <div class="value">${statusLabel}</div>
          </div>
          ${data.totalPrice ? `
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Prix total' : 'Total price'}</div>
            <div class="value">${data.totalPrice.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} €</div>
          </div>
          ` : ''}
          ${data.depositAmount ? `
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Acompte' : 'Deposit'}</div>
            <div class="value">${data.depositAmount.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} €</div>
          </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>${locale === 'fr' ? 'Cette notification a été envoyée automatiquement.' : 'This notification was sent automatically.'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Template pour changement de statut de réservation
 */
export function reservationStatusChangeEmail(data: ReservationData, oldStatus: string, locale: 'fr' | 'en' = 'fr'): { subject: string; html: string } {
  const statusLabel = locale === 'fr'
    ? (data.status === 'pending_deposit' ? 'Acompte en attente' : data.status === 'deposit_paid' ? 'Acompte payé' : data.status === 'completed' ? 'Terminée' : data.status === 'cancelled' ? 'Annulée' : data.status)
    : (data.status === 'pending_deposit' ? 'Deposit pending' : data.status === 'deposit_paid' ? 'Deposit paid' : data.status === 'completed' ? 'Completed' : data.status === 'cancelled' ? 'Cancelled' : data.status);

  const subject = locale === 'fr'
    ? `Réservation ${statusLabel} - ${data.boatName}`
    : `Reservation ${statusLabel} - ${data.boatName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #059669; }
        .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 16px; color: #111827; margin-top: 4px; }
        .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: bold; background: #d1fae5; color: #065f46; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${locale === 'fr' ? 'Changement de statut de réservation' : 'Reservation status change'}</h1>
        </div>
        <div class="content">
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Référence' : 'Reference'}</div>
            <div class="value">${data.reference || data.id}</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Bateau' : 'Boat'}</div>
            <div class="value">${data.boatName}</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Client' : 'Client'}</div>
            <div class="value">${data.userName} (${data.userEmail})</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Nouveau statut' : 'New status'}</div>
            <div class="value"><span class="status-badge">${statusLabel}</span></div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Template pour nouvelle demande d'agence
 */
export function newAgencyRequestEmail(data: AgencyRequestData, locale: 'fr' | 'en' = 'fr'): { subject: string; html: string } {
  const partLabel = locale === 'fr' 
    ? (data.part === 'FULL' ? 'Journée complète' : data.part === 'AM' ? 'Matin' : data.part === 'PM' ? 'Après-midi' : data.part)
    : (data.part === 'FULL' ? 'Full day' : data.part === 'AM' ? 'Morning' : data.part === 'PM' ? 'Afternoon' : data.part);

  const subject = locale === 'fr'
    ? `Nouvelle demande agence - ${data.boatName} - ${data.startDate}`
    : `New agency request - ${data.boatName} - ${data.startDate}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #7c3aed; }
        .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 16px; color: #111827; margin-top: 4px; }
        .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${locale === 'fr' ? 'Nouvelle demande agence' : 'New agency request'}</h1>
        </div>
        <div class="content">
          <div class="alert">
            <strong>${locale === 'fr' ? '⚠️ Action requise' : '⚠️ Action required'}</strong><br>
            ${locale === 'fr' ? 'Une nouvelle demande d\'agence nécessite votre attention.' : 'A new agency request requires your attention.'}
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'ID Demande' : 'Request ID'}</div>
            <div class="value">${data.id}</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Agence' : 'Agency'}</div>
            <div class="value">${data.userName} (${data.userEmail})</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Bateau' : 'Boat'}</div>
            <div class="value">${data.boatName}</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Période' : 'Period'}</div>
            <div class="value">${data.startDate} → ${data.endDate}</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Créneau' : 'Slot'}</div>
            <div class="value">${partLabel}</div>
          </div>
          ${data.passengers ? `
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Passagers' : 'Passengers'}</div>
            <div class="value">${data.passengers}</div>
          </div>
          ` : ''}
          ${data.totalPrice ? `
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Prix total' : 'Total price'}</div>
            <div class="value">${data.totalPrice.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} €</div>
          </div>
          ` : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Template pour changement de statut de demande d'agence
 */
export function agencyRequestStatusChangeEmail(data: AgencyRequestData, newStatus: string, locale: 'fr' | 'en' = 'fr'): { subject: string; html: string } {
  const statusLabel = locale === 'fr'
    ? (newStatus === 'approved' ? 'Approuvée' : newStatus === 'rejected' ? 'Rejetée' : newStatus === 'converted' ? 'Convertie en réservation' : newStatus)
    : (newStatus === 'approved' ? 'Approved' : newStatus === 'rejected' ? 'Rejected' : newStatus === 'converted' ? 'Converted to reservation' : newStatus);

  const subject = locale === 'fr'
    ? `Demande agence ${statusLabel} - ${data.boatName}`
    : `Agency request ${statusLabel} - ${data.boatName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #7c3aed; }
        .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 16px; color: #111827; margin-top: 4px; }
        .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: bold; background: #ede9fe; color: #6d28d9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${locale === 'fr' ? 'Changement de statut - Demande agence' : 'Status change - Agency request'}</h1>
        </div>
        <div class="content">
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'ID Demande' : 'Request ID'}</div>
            <div class="value">${data.id}</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Agence' : 'Agency'}</div>
            <div class="value">${data.userName} (${data.userEmail})</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Bateau' : 'Boat'}</div>
            <div class="value">${data.boatName}</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Nouveau statut' : 'New status'}</div>
            <div class="value"><span class="status-badge">${statusLabel}</span></div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Template pour nouveau message de contact
 */
export function newContactMessageEmail(data: ContactMessageData, locale: 'fr' | 'en' = 'fr'): { subject: string; html: string } {
  const subject = locale === 'fr'
    ? `Nouveau message de contact - ${data.name}`
    : `New contact message - ${data.name}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #0891b2; }
        .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 16px; color: #111827; margin-top: 4px; }
        .message-box { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; border: 1px solid #e5e7eb; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${locale === 'fr' ? 'Nouveau message de contact' : 'New contact message'}</h1>
        </div>
        <div class="content">
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Nom' : 'Name'}</div>
            <div class="value">${data.name}</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Email' : 'Email'}</div>
            <div class="value">${data.email}</div>
          </div>
          ${data.phone ? `
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Téléphone' : 'Phone'}</div>
            <div class="value">${data.phone}</div>
          </div>
          ` : ''}
          ${data.sourcePage ? `
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Page source' : 'Source page'}</div>
            <div class="value">${data.sourcePage}</div>
          </div>
          ` : ''}
          <div class="message-box">
            ${data.message.replace(/\n/g, '<br>')}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Template pour paiement reçu
 */
export function paymentReceivedEmail(data: ReservationData, amount: number, locale: 'fr' | 'en' = 'fr'): { subject: string; html: string } {
  const subject = locale === 'fr'
    ? `Paiement reçu - ${data.reference || data.id} - ${amount.toLocaleString('fr-FR')} €`
    : `Payment received - ${data.reference || data.id} - ${amount.toLocaleString('en-US')} €`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #059669; }
        .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 16px; color: #111827; margin-top: 4px; }
        .amount { font-size: 24px; font-weight: bold; color: #059669; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${locale === 'fr' ? 'Paiement reçu' : 'Payment received'}</h1>
        </div>
        <div class="content">
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Référence réservation' : 'Reservation reference'}</div>
            <div class="value">${data.reference || data.id}</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Bateau' : 'Boat'}</div>
            <div class="value">${data.boatName}</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Client' : 'Client'}</div>
            <div class="value">${data.userName} (${data.userEmail})</div>
          </div>
          <div class="info-box">
            <div class="label">${locale === 'fr' ? 'Montant reçu' : 'Amount received'}</div>
            <div class="value"><span class="amount">${amount.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} €</span></div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
