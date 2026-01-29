/**
 * Templates d'emails pour les notifications
 */

interface ReservationData {
  id: string;
  reference?: string | null;
  boatName: string;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  startDate: string;
  endDate: string;
  part: string;
  passengers?: number | null;
  totalPrice?: number | null;
  depositAmount?: number | null;
  remainingAmount?: number | null;
  status: string;
  experienceTitle?: string;
  // Informations complémentaires
  waterToys?: boolean;
  childrenCount?: number | null;
  specialNeeds?: string | null;
  wantsExcursion?: boolean;
  departurePort?: string | null;
  optionNames?: string[]; // Noms des options sélectionnées
  boatCapacity?: number | null;
  boatLength?: number | null;
  boatSpeed?: number | null;
  skipperRequired?: boolean;
  skipperPrice?: number | null;
  currency?: string;
  locale?: string;
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

interface UserAccountData {
  email: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  createdAt: string | Date;
}

/**
 * Template pour nouvelle réservation
 */
export async function newReservationEmail(data: ReservationData, locale: 'fr' | 'en' = 'fr', logoUrl?: string | null): Promise<{ subject: string; html: string }> {
  const partLabel = locale === 'fr' 
    ? (data.part === 'FULL' ? 'Journée complète' : data.part === 'AM' ? 'Matin' : data.part === 'PM' ? 'Après-midi' : data.part === 'SUNSET' ? 'Sunset' : data.part)
    : (data.part === 'FULL' ? 'Full day' : data.part === 'AM' ? 'Morning' : data.part === 'PM' ? 'Afternoon' : data.part === 'SUNSET' ? 'Sunset' : data.part);

  const statusLabel = locale === 'fr'
    ? (data.status === 'pending_deposit' ? 'Acompte en attente' : data.status === 'deposit_paid' ? 'Acompte payé' : data.status === 'completed' ? 'Terminée' : data.status)
    : (data.status === 'pending_deposit' ? 'Deposit pending' : data.status === 'deposit_paid' ? 'Deposit paid' : data.status === 'completed' ? 'Completed' : data.status);

  const subject = locale === 'fr'
    ? `Nouvelle réservation - ${data.boatName} - ${data.startDate}`
    : `New reservation - ${data.boatName} - ${data.startDate}`;

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const langParam = locale === 'en' ? '?lang=en' : '';
  
  const html = `
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
          margin-bottom: 20px;
        }
        .logo-img {
          max-width: 180px;
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
        .info-row {
          display: table;
          width: 100%;
          margin: 0 0 12px 0;
          padding: 0;
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
        .badge {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: 600;
          background: #e0e7ff;
          color: #3730a3;
          margin: 4px 4px 4px 0;
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
        .alert-box {
          background: #fef3c7;
          border-left: 3px solid #f59e0b;
          padding: 16px;
          margin: 20px 0;
          border-radius: 6px;
        }
        .alert-box strong {
          color: #92400e;
          display: block;
          margin-bottom: 6px;
        }
        .alert-box p {
          color: #78350f;
          font-size: 14px;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <div class="logo-container">
            ${logoUrl ? `<img src="${logoUrl}" alt="BB YACHTS" class="logo-img" />` : `<div class="logo-text">BB YACHTS</div>`}
          </div>
          <h1>${locale === 'fr' ? 'Nouvelle réservation' : 'New reservation'}</h1>
          <p>${locale === 'fr' ? 'Confirmation de votre réservation' : 'Your booking confirmation'}</p>
        </div>
        <div class="content">
          <div class="section">
            <div class="section-title">${locale === 'fr' ? 'Informations de réservation' : 'Booking information'}</div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Référence' : 'Reference'}</div>
              <div class="info-value">${data.reference || data.id}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Bateau' : 'Boat'}</div>
              <div class="info-value">${data.boatName}</div>
            </div>
            ${data.experienceTitle ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Expérience' : 'Experience'}</div>
              <div class="info-value">${data.experienceTitle}</div>
            </div>
            ` : ''}
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Client' : 'Client'}</div>
              <div class="info-value">${data.userName} <a href="mailto:${data.userEmail}" style="color: #3b82f6; text-decoration: none;">(${data.userEmail})</a></div>
            </div>
            ${data.userPhone ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Téléphone' : 'Phone'}</div>
              <div class="info-value"><a href="tel:${data.userPhone}" style="color: #3b82f6; text-decoration: none;">${data.userPhone}</a></div>
            </div>
            ` : ''}
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Période' : 'Period'}</div>
              <div class="info-value">${data.startDate} → ${data.endDate}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Créneau' : 'Slot'}</div>
              <div class="info-value">${partLabel}</div>
            </div>
            ${data.passengers ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Passagers' : 'Passengers'}</div>
              <div class="info-value">${data.passengers}</div>
            </div>
            ` : ''}
            ${data.departurePort ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Port de départ' : 'Departure port'}</div>
              <div class="info-value">${data.departurePort}</div>
            </div>
            ` : ''}
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Statut' : 'Status'}</div>
              <div class="info-value"><span class="badge">${statusLabel}</span></div>
            </div>
          </div>
          
          ${data.totalPrice || data.depositAmount || data.remainingAmount ? `
          <div class="section">
            <div class="section-title">${locale === 'fr' ? 'Détails financiers' : 'Financial details'}</div>
            ${data.totalPrice ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Prix total' : 'Total price'}</div>
              <div class="info-value" style="font-weight: 600;">${data.totalPrice.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} ${data.currency?.toUpperCase() || 'EUR'}</div>
            </div>
            ` : ''}
            ${data.depositAmount ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Acompte' : 'Deposit'}</div>
              <div class="info-value">${data.depositAmount.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} ${data.currency?.toUpperCase() || 'EUR'}</div>
            </div>
            ` : ''}
            ${data.remainingAmount ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Reste à payer' : 'Remaining'}</div>
              <div class="info-value">${data.remainingAmount.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} ${data.currency?.toUpperCase() || 'EUR'}</div>
            </div>
            ` : ''}
          </div>
          ` : ''}
          
          ${data.optionNames && data.optionNames.length > 0 ? `
          <div class="section">
            <div class="section-title">${locale === 'fr' ? 'Options' : 'Options'}</div>
            <div class="info-value">
              ${data.optionNames.map(opt => `<span class="badge" style="margin-right: 6px; margin-bottom: 4px; display: inline-block;">${opt}</span>`).join('')}
            </div>
          </div>
          ` : ''}
          
          ${data.boatCapacity || data.boatLength || data.boatSpeed || data.skipperRequired ? `
          <div class="section">
            <div class="section-title">${locale === 'fr' ? 'Caractéristiques' : 'Specifications'}</div>
            ${data.boatCapacity ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Capacité' : 'Capacity'}</div>
              <div class="info-value">${data.boatCapacity} ${locale === 'fr' ? 'personnes' : 'people'}</div>
            </div>
            ` : ''}
            ${data.boatLength ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Longueur' : 'Length'}</div>
              <div class="info-value">${data.boatLength}m</div>
            </div>
            ` : ''}
            ${data.boatSpeed ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Vitesse' : 'Speed'}</div>
              <div class="info-value">${data.boatSpeed} ${locale === 'fr' ? 'nœuds' : 'knots'}</div>
            </div>
            ` : ''}
            ${data.skipperRequired ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Skipper' : 'Skipper'}</div>
              <div class="info-value">
                ${locale === 'fr' ? 'Requis' : 'Required'}
                ${data.skipperPrice ? ` (${data.skipperPrice.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} ${data.currency?.toUpperCase() || 'EUR'}/${locale === 'fr' ? 'jour' : 'day'})` : ''}
              </div>
            </div>
            ` : ''}
          </div>
          ` : ''}
          
          ${(data.waterToys !== undefined || data.childrenCount !== undefined || data.specialNeeds || data.wantsExcursion !== undefined) ? `
          <div class="section">
            <div class="section-title">${locale === 'fr' ? 'Informations complémentaires' : 'Additional information'}</div>
            ${data.waterToys !== undefined ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Jeux d\'eau' : 'Water toys'}</div>
              <div class="info-value">${data.waterToys ? (locale === 'fr' ? 'Oui' : 'Yes') : (locale === 'fr' ? 'Non' : 'No')}</div>
            </div>
            ` : ''}
            ${data.childrenCount !== undefined && data.childrenCount !== null ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Enfants' : 'Children'}</div>
              <div class="info-value">${data.childrenCount}</div>
            </div>
            ` : data.childrenCount === null || data.childrenCount === 0 ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Enfants' : 'Children'}</div>
              <div class="info-value">${locale === 'fr' ? 'Aucun' : 'None'}</div>
            </div>
            ` : ''}
            ${data.specialNeeds ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Besoins spéciaux' : 'Special needs'}</div>
              <div class="info-value">${data.specialNeeds}</div>
            </div>
            ` : ''}
            ${data.wantsExcursion !== undefined ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Excursion' : 'Excursion'}</div>
              <div class="info-value">${data.wantsExcursion ? (locale === 'fr' ? 'Oui' : 'Yes') : (locale === 'fr' ? 'Non' : 'No')}</div>
            </div>
            ` : ''}
          </div>
          ` : ''}
          
          ${data.status === 'deposit_paid' ? `
          <div class="section" style="background: #d1fae5; border: 1px solid #059669; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <div style="font-size: 13px; color: #065f46; font-weight: 600; margin-bottom: 4px;">✅ ${locale === 'fr' ? 'Acompte confirmé' : 'Deposit confirmed'}</div>
            <div style="font-size: 12px; color: #047857; line-height: 1.5;">${locale === 'fr' ? 'Votre acompte a été reçu avec succès. Le solde restant sera à régler sur place.' : 'Your deposit has been received successfully. The remaining balance will be paid on site.'}</div>
          </div>
          ` : ''}
          
          ${data.status === 'pending_deposit' ? `
          <div class="section" style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <div style="font-size: 13px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">⏳ ${locale === 'fr' ? 'En attente de paiement' : 'Pending payment'}</div>
            <div style="font-size: 12px; color: #2563eb; line-height: 1.5;">${locale === 'fr' ? 'Votre réservation est en attente de confirmation du paiement de l\'acompte.' : 'Your reservation is pending confirmation of the deposit payment.'}</div>
          </div>
          ` : ''}
          
          <div class="button-group" style="margin: 25px 0;">
            <a href="${baseUrl}/dashboard/reservations/${data.id}${langParam}" class="button">
              ${locale === 'fr' ? 'Voir ma réservation' : 'View my booking'}
            </a>
            <a href="${baseUrl}/dashboard${langParam}" class="button button-secondary">
              ${locale === 'fr' ? 'Mon compte' : 'My account'}
            </a>
          </div>
        </div>
        <div class="footer">
          <p><strong style="color: #111827; font-size: 16px;">BB YACHTS</strong></p>
          <p>Port Camille Rayon – Avenue des frères Roustan</p>
          <p>06220 VALLAURIS, France</p>
          <p style="margin-top: 20px;">
            <a href="mailto:charter@bb-yachts.com">charter@bb-yachts.com</a> | 
            <a href="tel:+33609176282">06 09 17 62 82</a>
          </p>
          <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <a href="${baseUrl}${langParam}" class="button button-secondary" style="margin: 4px;">
              ${locale === 'fr' ? 'Visiter le site' : 'Visit website'}
            </a>
            <a href="${baseUrl}/signup${langParam}" class="button button-success" style="margin: 4px;">
              ${locale === 'fr' ? 'Créer un compte' : 'Create account'}
            </a>
          </div>
          <p style="margin-top: 25px; font-size: 11px; color: #9ca3af;">
            ${locale === 'fr' ? 'Cette notification a été envoyée automatiquement.' : 'This notification was sent automatically.'}
          </p>
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

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const langParam = locale === 'en' ? '?lang=en' : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Arial, sans-serif; 
          line-height: 1.5; 
          color: #1a1a1a; 
          background-color: #ffffff;
        }
        .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { 
          background: linear-gradient(135deg, #059669 0%, #047857 100%); 
          color: white; 
          padding: 30px 25px; 
          text-align: center;
        }
        .header h1 { font-size: 22px; font-weight: 600; margin: 0; }
        .content { padding: 30px; background: #ffffff; }
        .section { margin: 20px 0; padding: 16px 0; border-bottom: 1px solid #e5e7eb; }
        .section:last-child { border-bottom: none; }
        .section-title { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-row { display: table; width: 100%; margin: 0 0 12px 0; }
        .info-label { display: table-cell; width: 140px; font-weight: 600; color: #64748b; font-size: 12px; padding: 6px 0; vertical-align: top; }
        .info-value { display: table-cell; font-size: 14px; color: #111827; font-weight: 400; padding: 6px 0; vertical-align: top; }
        .status-badge { 
          display: inline-block; 
          padding: 4px 10px; 
          border-radius: 12px; 
          font-weight: 600;
          font-size: 11px;
          background: #d1fae5; 
          color: #065f46; 
        }
        .footer { text-align: center; padding: 25px 25px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
        .footer p { color: #6b7280; font-size: 12px; margin: 4px 0; line-height: 1.5; }
        .footer a { color: #3b82f6; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>${locale === 'fr' ? 'Changement de statut' : 'Status change'}</h1>
        </div>
        <div class="content">
          <div class="section">
            <div class="section-title">${locale === 'fr' ? 'Informations de réservation' : 'Reservation information'}</div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Référence' : 'Reference'}</div>
              <div class="info-value">${data.reference || data.id}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Bateau' : 'Boat'}</div>
              <div class="info-value">${data.boatName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Client' : 'Client'}</div>
              <div class="info-value">${data.userName} <a href="mailto:${data.userEmail}" style="color: #3b82f6; text-decoration: none;">(${data.userEmail})</a></div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Nouveau statut' : 'New status'}</div>
              <div class="info-value"><span class="status-badge">${statusLabel}</span></div>
            </div>
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

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const langParam = locale === 'en' ? '?lang=en' : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Arial, sans-serif; 
          line-height: 1.5; 
          color: #1a1a1a; 
          background-color: #ffffff;
        }
        .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { 
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); 
          color: white; 
          padding: 30px 25px; 
          text-align: center;
        }
        .header h1 { font-size: 22px; font-weight: 600; margin: 0; }
        .content { padding: 30px; background: #ffffff; }
        .section { margin: 20px 0; padding: 16px 0; border-bottom: 1px solid #e5e7eb; }
        .section:last-child { border-bottom: none; }
        .section-title { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-row { display: table; width: 100%; margin: 0 0 12px 0; }
        .info-label { display: table-cell; width: 140px; font-weight: 600; color: #64748b; font-size: 12px; padding: 6px 0; vertical-align: top; }
        .info-value { display: table-cell; font-size: 14px; color: #111827; font-weight: 400; padding: 6px 0; vertical-align: top; }
        .alert { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 16px 0; font-size: 13px; color: #92400e; }
        .alert strong { display: block; margin-bottom: 4px; }
        .footer { text-align: center; padding: 25px 25px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
        .footer p { color: #6b7280; font-size: 12px; margin: 4px 0; line-height: 1.5; }
        .footer a { color: #3b82f6; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>${locale === 'fr' ? 'Nouvelle demande agence' : 'New agency request'}</h1>
        </div>
        <div class="content">
          <div class="alert">
            <strong>⚠️ ${locale === 'fr' ? 'Action requise' : 'Action required'}</strong>
            ${locale === 'fr' ? 'Une nouvelle demande d\'agence nécessite votre attention.' : 'A new agency request requires your attention.'}
          </div>
          <div class="section">
            <div class="section-title">${locale === 'fr' ? 'Informations de la demande' : 'Request information'}</div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'ID Demande' : 'Request ID'}</div>
              <div class="info-value">${data.id}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Agence' : 'Agency'}</div>
              <div class="info-value">${data.userName} <a href="mailto:${data.userEmail}" style="color: #3b82f6; text-decoration: none;">(${data.userEmail})</a></div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Bateau' : 'Boat'}</div>
              <div class="info-value">${data.boatName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Période' : 'Period'}</div>
              <div class="info-value">${data.startDate} → ${data.endDate}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Créneau' : 'Slot'}</div>
              <div class="info-value">${partLabel}</div>
            </div>
            ${data.passengers ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Passagers' : 'Passengers'}</div>
              <div class="info-value">${data.passengers}</div>
            </div>
            ` : ''}
            ${data.totalPrice ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Prix total' : 'Total price'}</div>
              <div class="info-value">${data.totalPrice.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} €</div>
            </div>
            ` : ''}
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Arial, sans-serif; 
          line-height: 1.5; 
          color: #1a1a1a; 
          background-color: #ffffff;
        }
        .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { 
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); 
          color: white; 
          padding: 30px 25px; 
          text-align: center;
        }
        .header h1 { font-size: 22px; font-weight: 600; margin: 0; }
        .content { padding: 30px; background: #ffffff; }
        .section { margin: 20px 0; padding: 16px 0; border-bottom: 1px solid #e5e7eb; }
        .section:last-child { border-bottom: none; }
        .section-title { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-row { display: table; width: 100%; margin: 0 0 12px 0; }
        .info-label { display: table-cell; width: 140px; font-weight: 600; color: #64748b; font-size: 12px; padding: 6px 0; vertical-align: top; }
        .info-value { display: table-cell; font-size: 14px; color: #111827; font-weight: 400; padding: 6px 0; vertical-align: top; }
        .status-badge { 
          display: inline-block; 
          padding: 4px 10px; 
          border-radius: 12px; 
          font-weight: 600;
          font-size: 11px;
          background: #ede9fe; 
          color: #6d28d9; 
        }
        .footer { text-align: center; padding: 25px 25px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
        .footer p { color: #6b7280; font-size: 12px; margin: 4px 0; line-height: 1.5; }
        .footer a { color: #3b82f6; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>${locale === 'fr' ? 'Changement de statut - Demande agence' : 'Status change - Agency request'}</h1>
        </div>
        <div class="content">
          <div class="section">
            <div class="section-title">${locale === 'fr' ? 'Informations de la demande' : 'Request information'}</div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'ID Demande' : 'Request ID'}</div>
              <div class="info-value">${data.id}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Agence' : 'Agency'}</div>
              <div class="info-value">${data.userName} <a href="mailto:${data.userEmail}" style="color: #3b82f6; text-decoration: none;">(${data.userEmail})</a></div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Bateau' : 'Boat'}</div>
              <div class="info-value">${data.boatName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Nouveau statut' : 'New status'}</div>
              <div class="info-value"><span class="status-badge">${statusLabel}</span></div>
            </div>
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Arial, sans-serif; 
          line-height: 1.5; 
          color: #1a1a1a; 
          background-color: #ffffff;
        }
        .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { 
          background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); 
          color: white; 
          padding: 30px 25px; 
          text-align: center;
        }
        .header h1 { font-size: 22px; font-weight: 600; margin: 0; }
        .content { padding: 30px; background: #ffffff; }
        .section { margin: 20px 0; padding: 16px 0; border-bottom: 1px solid #e5e7eb; }
        .section:last-child { border-bottom: none; }
        .section-title { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-row { display: table; width: 100%; margin: 0 0 12px 0; }
        .info-label { display: table-cell; width: 140px; font-weight: 600; color: #64748b; font-size: 12px; padding: 6px 0; vertical-align: top; }
        .info-value { display: table-cell; font-size: 14px; color: #111827; font-weight: 400; padding: 6px 0; vertical-align: top; }
        .message-box { background: #f9fafb; padding: 16px; margin: 16px 0; border-radius: 6px; border-left: 3px solid #0891b2; font-size: 14px; line-height: 1.6; color: #1e293b; }
        .footer { text-align: center; padding: 25px 25px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
        .footer p { color: #6b7280; font-size: 12px; margin: 4px 0; line-height: 1.5; }
        .footer a { color: #3b82f6; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>${locale === 'fr' ? 'Nouveau message de contact' : 'New contact message'}</h1>
        </div>
        <div class="content">
          <div class="section">
            <div class="section-title">${locale === 'fr' ? 'Informations du contact' : 'Contact information'}</div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Nom' : 'Name'}</div>
              <div class="info-value">${data.name}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Email' : 'Email'}</div>
              <div class="info-value"><a href="mailto:${data.email}" style="color: #3b82f6; text-decoration: none;">${data.email}</a></div>
            </div>
            ${data.phone ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Téléphone' : 'Phone'}</div>
              <div class="info-value"><a href="tel:${data.phone}" style="color: #3b82f6; text-decoration: none;">${data.phone}</a></div>
            </div>
            ` : ''}
            ${data.sourcePage ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Page source' : 'Source page'}</div>
              <div class="info-value">${data.sourcePage}</div>
            </div>
            ` : ''}
          </div>
          <div class="section">
            <div class="section-title">${locale === 'fr' ? 'Message' : 'Message'}</div>
            <div class="message-box">${data.message.replace(/\n/g, '<br>')}</div>
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

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const langParam = locale === 'en' ? '?lang=en' : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Arial, sans-serif; 
          line-height: 1.5; 
          color: #1a1a1a; 
          background-color: #ffffff;
        }
        .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { 
          background: linear-gradient(135deg, #059669 0%, #047857 100%); 
          color: white; 
          padding: 30px 25px; 
          text-align: center;
        }
        .header h1 { font-size: 22px; font-weight: 600; margin: 0; }
        .content { padding: 30px; background: #ffffff; }
        .section { margin: 20px 0; padding: 16px 0; border-bottom: 1px solid #e5e7eb; }
        .section:last-child { border-bottom: none; }
        .section-title { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-row { display: table; width: 100%; margin: 0 0 12px 0; }
        .info-label { display: table-cell; width: 140px; font-weight: 600; color: #64748b; font-size: 12px; padding: 6px 0; vertical-align: top; }
        .info-value { display: table-cell; font-size: 14px; color: #111827; font-weight: 400; padding: 6px 0; vertical-align: top; }
        .amount { font-size: 20px; font-weight: 700; color: #059669; }
        .footer { text-align: center; padding: 25px 25px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
        .footer p { color: #6b7280; font-size: 12px; margin: 4px 0; line-height: 1.5; }
        .footer a { color: #3b82f6; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>${locale === 'fr' ? 'Paiement reçu' : 'Payment received'}</h1>
        </div>
        <div class="content">
          <div class="section">
            <div class="section-title">${locale === 'fr' ? 'Informations de paiement' : 'Payment information'}</div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Référence' : 'Reference'}</div>
              <div class="info-value">${data.reference || data.id}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Bateau' : 'Boat'}</div>
              <div class="info-value">${data.boatName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Client' : 'Client'}</div>
              <div class="info-value">${data.userName} <a href="mailto:${data.userEmail}" style="color: #3b82f6; text-decoration: none;">(${data.userEmail})</a></div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Montant reçu' : 'Amount received'}</div>
              <div class="info-value"><span class="amount">${amount.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} €</span></div>
            </div>
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
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Template pour nouvelle création de compte utilisateur
 */
export function newUserAccountEmail(data: UserAccountData, locale: 'fr' | 'en' = 'fr', logoUrl?: string | null): { subject: string; html: string } {
  const subject = locale === 'fr'
    ? `Nouveau compte créé - ${data.email}`
    : `New account created - ${data.email}`;

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const langParam = locale === 'en' ? '?lang=en' : '';
  const userName = data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email;
  const createdAt = data.createdAt instanceof Date 
    ? data.createdAt.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')
    : new Date(data.createdAt).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Arial, sans-serif; 
          line-height: 1.5; 
          color: #1a1a1a; 
          background-color: #ffffff;
        }
        .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { 
          background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
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
        .header h1 { font-size: 22px; font-weight: 600; margin: 15px 0 6px 0; }
        .header p { font-size: 13px; opacity: 0.95; margin: 0; font-weight: 400; }
        .content { padding: 30px; background: #ffffff; }
        .section { margin: 20px 0; padding: 16px 0; border-bottom: 1px solid #e5e7eb; }
        .section:last-child { border-bottom: none; }
        .section-title { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-row { display: table; width: 100%; margin: 0 0 12px 0; }
        .info-label { display: table-cell; width: 140px; font-weight: 600; color: #64748b; font-size: 12px; padding: 6px 0; vertical-align: top; }
        .info-value { display: table-cell; font-size: 14px; color: #111827; font-weight: 400; padding: 6px 0; vertical-align: top; }
        .alert { background: #d1fae5; border: 1px solid #059669; border-radius: 6px; padding: 12px; margin: 16px 0; font-size: 13px; color: #065f46; }
        .alert strong { display: block; margin-bottom: 4px; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; text-align: center; margin: 6px 6px 6px 0; transition: background 0.2s; }
        .button:hover { background: #2563eb; }
        .button-secondary { background: #ffffff; color: #3b82f6 !important; border: 2px solid #3b82f6; }
        .button-secondary:hover { background: #f0f9ff; }
        .button-group { margin: 25px 0; text-align: center; }
        .footer { text-align: center; padding: 25px 25px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
        .footer p { color: #6b7280; font-size: 12px; margin: 4px 0; line-height: 1.5; }
        .footer a { color: #3b82f6; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <div class="logo-container">
            ${logoUrl ? `<img src="${logoUrl}" alt="BB YACHTS" class="logo-img" />` : `<div class="logo-text">BB YACHTS</div>`}
          </div>
          <h1>${locale === 'fr' ? 'Nouveau compte créé' : 'New account created'}</h1>
          <p>${locale === 'fr' ? 'Un nouvel utilisateur s\'est inscrit' : 'A new user has registered'}</p>
        </div>
        <div class="content">
          <div class="alert">
            <strong>${locale === 'fr' ? '✅ Nouvel utilisateur' : '✅ New user'}</strong>
            ${locale === 'fr' ? 'Un nouvel utilisateur vient de créer un compte sur votre plateforme.' : 'A new user has just created an account on your platform.'}
          </div>
          <div class="section">
            <div class="section-title">${locale === 'fr' ? 'Informations du compte' : 'Account information'}</div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Nom' : 'Name'}</div>
              <div class="info-value">${userName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Email' : 'Email'}</div>
              <div class="info-value"><a href="mailto:${data.email}" style="color: #3b82f6; text-decoration: none;">${data.email}</a></div>
            </div>
            ${data.phone ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Téléphone' : 'Phone'}</div>
              <div class="info-value"><a href="tel:${data.phone}" style="color: #3b82f6; text-decoration: none;">${data.phone}</a></div>
            </div>
            ` : ''}
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Date de création' : 'Created at'}</div>
              <div class="info-value">${createdAt}</div>
            </div>
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
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Template pour email de bienvenue (nouvel utilisateur)
 */
export function welcomeEmail(data: UserAccountData, locale: 'fr' | 'en' = 'fr', logoUrl?: string | null): { subject: string; html: string } {
  const subject = locale === 'fr'
    ? `Bienvenue sur BB YACHTS !`
    : `Welcome to BB YACHTS!`;

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const langParam = locale === 'en' ? '?lang=en' : '';
  const userName = data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; 
          line-height: 1.5; 
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
        .section { margin: 20px 0; padding: 16px 0; border-bottom: 1px solid #e5e7eb; }
        .section:last-child { border-bottom: none; }
        .section-title { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-row { display: table; width: 100%; margin: 0 0 12px 0; }
        .info-label { display: table-cell; width: 140px; font-weight: 600; color: #64748b; font-size: 12px; padding: 6px 0; vertical-align: top; }
        .info-value { display: table-cell; font-size: 14px; color: #111827; font-weight: 400; padding: 6px 0; vertical-align: top; }
        .alert-success { 
          background: #d1fae5; 
          border: 1px solid #059669;
          border-radius: 6px; 
          padding: 12px; 
          margin: 16px 0; 
          font-size: 13px; 
          color: #065f46; 
        }
        .alert-success strong {
          display: block;
          margin-bottom: 4px;
          font-size: 14px;
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
        .button-group {
          margin: 25px 0;
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
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <div class="logo-container">
            ${logoUrl ? `<img src="${logoUrl}" alt="BB YACHTS" class="logo-img" />` : `<div class="logo-text">BB YACHTS</div>`}
          </div>
          <h1>${locale === 'fr' ? 'Bienvenue !' : 'Welcome!'}</h1>
          <p>${locale === 'fr' ? 'Votre compte a été créé avec succès' : 'Your account has been successfully created'}</p>
        </div>
        <div class="content">
          <div class="alert-success">
            <strong>${locale === 'fr' ? '✅ Compte créé avec succès' : '✅ Account created successfully'}</strong>
            ${locale === 'fr' ? `Bonjour ${userName}, votre compte a été créé avec succès. Vous pouvez maintenant réserver vos bateaux et profiter de nos services.` : `Hello ${userName}, your account has been successfully created. You can now book boats and enjoy our services.`}
          </div>
          
          <div class="section">
            <div class="section-title">${locale === 'fr' ? 'Informations de votre compte' : 'Your account information'}</div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Nom' : 'Name'}</div>
              <div class="info-value">${userName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Email' : 'Email'}</div>
              <div class="info-value">${data.email}</div>
            </div>
            ${data.phone ? `
            <div class="info-row">
              <div class="info-label">${locale === 'fr' ? 'Téléphone' : 'Phone'}</div>
              <div class="info-value">${data.phone}</div>
            </div>
            ` : ''}
          </div>
          
          <div class="section">
            <div class="section-title">${locale === 'fr' ? 'Prochaines étapes' : 'Next steps'}</div>
            <p style="font-size: 14px; color: #1e293b; line-height: 1.6; margin-bottom: 12px;">
              ${locale === 'fr' ? 'Vous pouvez maintenant :' : 'You can now:'}
            </p>
            <ul style="font-size: 14px; color: #1e293b; line-height: 1.8; margin-left: 20px; margin-bottom: 0;">
              <li>${locale === 'fr' ? 'Parcourir notre flotte de bateaux' : 'Browse our fleet of boats'}</li>
              <li>${locale === 'fr' ? 'Réserver votre location de bateau' : 'Book your boat rental'}</li>
              <li>${locale === 'fr' ? 'Consulter vos réservations' : 'View your reservations'}</li>
              <li>${locale === 'fr' ? 'Gérer votre profil' : 'Manage your profile'}</li>
            </ul>
          </div>
          
          <div class="button-group">
            <a href="${baseUrl}/search${langParam}" class="button">
              ${locale === 'fr' ? 'Voir les bateaux' : 'View boats'}
            </a>
            <a href="${baseUrl}/dashboard${langParam}" class="button button-secondary">
              ${locale === 'fr' ? 'Mon compte' : 'My account'}
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
          <p style="margin-top: 20px; font-size: 11px; color: #9ca3af;">
            ${locale === 'fr' ? 'Cet email a été envoyé automatiquement lors de la création de votre compte.' : 'This email was sent automatically when your account was created.'}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
