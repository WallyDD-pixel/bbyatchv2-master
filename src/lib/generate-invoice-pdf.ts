import { prisma } from './prisma';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

const BRAND = {
  name: 'BB YACHTS',
  address: 'Port Camille Rayon – Avenue des frères Roustan – 06220 VALLAURIS, France',
  email: 'charter@bb-yachts.com',
  phone: '06 09 17 62 82',
  currency: 'EUR',
} as const;

function formatMoney(v: number) {
  const raw = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: BRAND.currency }).format(v);
  return raw.replace(/[\u202F\u00A0]/g, ' ');
}

function getRightAlignedX(text: string, fontSize: number, font: { widthOfTextAtSize: (t: string, s: number) => number }, maxX: number): number {
  return maxX - font.widthOfTextAtSize(text, fontSize);
}

function sanitize(text: string) {
  if (!text) return '';
  const charMap: Record<string, string> = {
    '→': '->', '–': '-', '—': '-', '…': '...', '⚠': '[!]', '€': 'EUR',
    '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"', '\u00A0': ' ', '\u202F': ' ',
  };
  let result = text;
  for (const [char, replacement] of Object.entries(charMap)) {
    result = result.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
  }
  return result.replace(/[\u200B-\u200D\uFEFF]/g, '');
}

/**
 * Génère un PDF "Facture d'acompte" (même format que la facture téléchargeable depuis l'admin / dashboard).
 * Utilisé pour les pièces jointes des emails et pour l'API GET /api/invoices/[id].
 */
export async function generateInvoicePDF(reservationId: string): Promise<Buffer | null> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        boat: { include: { options: true } },
        user: { select: { id: true, email: true, role: true, name: true, firstName: true, lastName: true, phone: true, address: true, city: true, zip: true, country: true } },
      },
    });
    if (!reservation) return null;

    const isAgencyReservation = (reservation.user as any)?.role === 'agency';
    const invoiceNumber = `AC-${new Date().getFullYear()}-${reservation.id.slice(-6)}`;
    const deposit = reservation.depositAmount || 0;
    const total = reservation.totalPrice || 0;
    const remaining = reservation.remainingAmount || 0;

    const meta = (() => {
      try {
        return reservation.metadata ? JSON.parse(reservation.metadata) : null;
      } catch {
        return null;
      }
    })();

    const part = reservation.part || 'FULL';
    const partLabel = part === 'FULL' ? 'Journée entière' : part === 'AM' ? 'Matin' : part === 'PM' ? '½ journée' : part === 'SUNSET' ? 'Sunset (2h)' : part;
    const nbJours = (() => {
      const s = new Date(reservation.startDate);
      const e = new Date(reservation.endDate);
      return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    })();

    const settings = (await prisma.settings.findFirst()) as any;
    const defaultSkipperPrice = settings?.defaultSkipperPrice || 350;
    const boatData = reservation.boat as any;
    const effectiveSkipperPrice = boatData?.skipperPrice ?? defaultSkipperPrice;

    const agencyWantsSkipper = isAgencyReservation && (meta?.needsSkipper === true || meta?.needsSkipper === '1');
    const skipperDays = isAgencyReservation
      ? (agencyWantsSkipper ? 1 : 0)
      : (part === 'FULL' || part === 'SUNSET' ? Math.max(nbJours, 1) : 1);
    const skipperTotal = (isAgencyReservation && !agencyWantsSkipper) ? 0 : (boatData?.skipperRequired ? effectiveSkipperPrice * skipperDays : 0);

    const selectedOptionIds = meta?.optionIds || [];
    const selectedOptions = (reservation.boat?.options || []).filter((o: any) => selectedOptionIds.includes(o.id));
    const basePriceForDeposit = isAgencyReservation ? total : total - skipperTotal;
    const basePrice = basePriceForDeposit;

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const leftMargin = 50;
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primary = rgb(0.05, 0.15, 0.32);
    const lightGray = rgb(0.94, 0.95, 0.97);
    const borderGray = rgb(0.8, 0.82, 0.85);
    const textDark = rgb(0.1, 0.1, 0.12);
    const textMuted = rgb(0.4, 0.42, 0.46);

    let headerHeight = 80;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'cropped-LOGO-BB-yacht-ok_black-FEEL-THE-MEdierranean-247x82.png');
      const logoBytes = await fs.readFile(logoPath);
      const png = await pdfDoc.embedPng(logoBytes);
      const logoDims = png.scale(0.6);
      page.drawImage(png, { x: 50, y: height - 30 - logoDims.height, width: logoDims.width, height: logoDims.height });
      headerHeight = logoDims.height + 30;
    } catch {
      page.drawText(sanitize(BRAND.name), { x: 50, y: height - 40, size: 24, font: fontBold, color: primary });
      headerHeight = 40;
    }

    page.drawLine({ start: { x: 40, y: height - headerHeight - 5 }, end: { x: width - 40, y: height - headerHeight - 5 }, thickness: 0.8, color: primary });

    const infoX = width - 200;
    page.drawText("Facture d'acompte", { x: infoX, y: height - 35, size: 14, font: fontBold, color: primary });
    page.drawText(`N° ${invoiceNumber}`, { x: infoX, y: height - 50, size: 9, font, color: textMuted });
    page.drawText(`Date ${new Date().toLocaleDateString('fr-FR')}`, { x: infoX, y: height - 62, size: 9, font, color: textMuted });

    page.drawText(sanitize(BRAND.address), { x: 50, y: height - headerHeight - 20, size: 8, font, color: textMuted });
    page.drawText(sanitize(`${BRAND.email} | ${BRAND.phone}`), { x: 50, y: height - headerHeight - 32, size: 8, font, color: textMuted });

    const TOP_MARGIN = 60;
    let y = height - headerHeight - TOP_MARGIN;

    const draw = (text: string, size = 10, color = textDark, x = leftMargin, bold = false, lineGap = 4) => {
      page.drawText(sanitize(text), { x, y, size, font: bold ? fontBold : font, color });
      y -= size + lineGap;
    };

    const drawWrapped = (text: string, size = 10, color = textDark, x = leftMargin, maxWidth = width - leftMargin - x, bold = false, lineGap = 4) => {
      const safe = sanitize(text);
      const words = safe.split(' ');
      let currentLine = '';
      const lines: string[] = [];
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = (bold ? fontBold : font).widthOfTextAtSize(testLine, size);
        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else currentLine = testLine;
      }
      if (currentLine) lines.push(currentLine);
      lines.forEach((line) => {
        page.drawText(line, { x, y, size, font: bold ? fontBold : font, color });
        y -= size + lineGap;
      });
    };

    const clientName = reservation.user?.name || `${reservation.user?.firstName || ''} ${reservation.user?.lastName || ''}`.trim() || reservation.user?.email || '';
    const clientBoxTop = y;
    const clientBoxWidth = width / 2 - leftMargin - 20;
    const clientLines: { text: string; size: number; color: typeof textDark; bold?: boolean; gap: number }[] = [
      { text: 'Client', size: 11, color: primary, bold: true, gap: 3 },
      { text: clientName, size: 9, color: textDark, bold: true, gap: 1.5 },
    ];
    if (reservation.user?.email) clientLines.push({ text: reservation.user.email, size: 8, color: textMuted, gap: 1.5 });
    if (reservation.user?.phone) clientLines.push({ text: `Tél: ${reservation.user.phone}`, size: 8, color: textMuted, gap: 1.5 });
    if (reservation.user?.address) {
      clientLines.push({ text: reservation.user.address, size: 8, color: textMuted, gap: 1.5 });
      const cityLine = [reservation.user.zip, reservation.user.city].filter(Boolean).join(' ');
      if (cityLine) clientLines.push({ text: cityLine, size: 8, color: textMuted, gap: 1.5 });
    }
    let tempY = y;
    clientLines.forEach((l) => { tempY -= l.size + l.gap; });
    const clientBoxBottom = tempY;
    page.drawRectangle({
      x: leftMargin - 8,
      y: clientBoxBottom - 8,
      width: clientBoxWidth + 16,
      height: clientBoxTop - clientBoxBottom + 16,
      color: lightGray,
      borderColor: borderGray,
      borderWidth: 0.5,
    });
    let lineY = clientBoxTop;
    clientLines.forEach((l) => {
      page.drawText(sanitize(l.text), { x: leftMargin, y: lineY - l.size - 3, size: l.size, font: l.bold ? fontBold : font, color: l.color });
      lineY -= l.size + l.gap;
    });
    y = clientBoxBottom - 20;

    const start = reservation.startDate.toISOString().slice(0, 10);
    const end = reservation.endDate.toISOString().slice(0, 10);
    const dateDisplay = start + (end !== start ? ' -> ' + end : '');
    const resBoxTop = y;
    const resCol1X = leftMargin;
    const resCol2X = width / 2 + 20;
    const resLines: { text: string; size: number; color: typeof textDark; bold?: boolean; gap: number; col?: number }[] = [
      { text: 'Détails de la réservation', size: 11, color: primary, bold: true, gap: 3, col: 1 },
      { text: `Bateau : ${reservation.boat?.name || ''}`, size: 9, color: textDark, gap: 2, col: 1 },
    ];
    if (reservation.boat?.lengthM) resLines.push({ text: `${reservation.boat.lengthM}m - ${reservation.boat.capacity || ''} pers`, size: 8, color: textMuted, gap: 2, col: 1 });
    if (meta?.experienceTitleFr || meta?.expSlug) resLines.push({ text: `Expérience : ${meta.experienceTitleFr || meta.expSlug}`, size: 9, color: textDark, gap: 2, col: 1 });
    resLines.push({ text: `Dates : ${dateDisplay}`, size: 9, color: textDark, gap: 2, col: 1 });
    resLines.push({ text: `Type : ${partLabel}`, size: 9, color: textDark, gap: 2, col: 1 });
    if (meta?.departurePort) resLines.push({ text: `Port : ${meta.departurePort}`, size: 9, color: textDark, gap: 2, col: 1 });
    if (reservation.passengers) resLines.push({ text: `Passagers : ${reservation.passengers}`, size: 9, color: textDark, gap: 2, col: 2 });
    if (meta?.childrenCount) resLines.push({ text: `Enfants : ${meta.childrenCount}`, size: 9, color: textDark, gap: 2, col: 2 });

    tempY = y;
    const col1Lines = resLines.filter((l) => !l.col || l.col === 1);
    const col2Lines = resLines.filter((l) => l.col === 2);
    const maxResLines = Math.max(col1Lines.length, col2Lines.length);
    tempY -= maxResLines * 12;
    const resBoxBottom = tempY;
    page.drawRectangle({
      x: leftMargin - 8,
      y: resBoxBottom - 8,
      width: width - leftMargin * 2 + 16,
      height: resBoxTop - resBoxBottom + 16,
      color: rgb(1, 1, 1),
      borderColor: lightGray,
      borderWidth: 0.5,
    });
    lineY = resBoxTop;
    col1Lines.forEach((l) => {
      page.drawText(sanitize(l.text), { x: resCol1X, y: lineY - l.size - 3, size: l.size, font: l.bold ? fontBold : font, color: l.color });
      lineY -= l.size + l.gap;
    });
    lineY = resBoxTop;
    col2Lines.forEach((l) => {
      page.drawText(sanitize(l.text), { x: resCol2X, y: lineY - l.size - 3, size: l.size, font: l.bold ? fontBold : font, color: l.color });
      lineY -= l.size + l.gap;
    });
    y = resBoxBottom - 25;

    const paymentBoxTop = y;
    const paymentLines: { text: string; size: number; color: typeof textDark; bold?: boolean; gap: number }[] = [
      { text: 'Informations de paiement', size: 10, color: primary, bold: true, gap: 2 },
      { text: `Créée le ${reservation.createdAt.toLocaleDateString('fr-FR')}`, size: 8, color: textMuted, gap: 1.5 },
    ];
    if (reservation.depositPaidAt) paymentLines.push({ text: `Acompte payé le ${reservation.depositPaidAt.toLocaleDateString('fr-FR')}`, size: 8, color: textMuted, gap: 1.5 });
    if (reservation.stripePaymentIntentId) paymentLines.push({ text: `Carte bancaire • ID: ${reservation.stripePaymentIntentId.slice(-8)}`, size: 8, color: textMuted, gap: 1.5 });
    const statusText = reservation.status === 'deposit_paid' ? 'Acompte payé' : reservation.status === 'completed' ? 'Terminée' : reservation.status === 'cancelled' ? 'Annulée' : 'En attente';
    paymentLines.push({ text: `Statut : ${statusText}`, size: 8, color: reservation.status === 'deposit_paid' ? rgb(0, 0.6, 0) : textMuted, bold: true, gap: 1.5 });
    tempY = y;
    paymentLines.forEach((l) => { tempY -= l.size + l.gap; });
    const paymentBoxBottom = tempY;
    page.drawRectangle({
      x: leftMargin - 8,
      y: paymentBoxBottom - 8,
      width: width - leftMargin * 2 + 16,
      height: paymentBoxTop - paymentBoxBottom + 16,
      color: lightGray,
      borderColor: borderGray,
      borderWidth: 0.5,
    });
    lineY = paymentBoxTop;
    paymentLines.forEach((l) => {
      page.drawText(sanitize(l.text), { x: leftMargin, y: lineY - l.size - 3, size: l.size, font: l.bold ? fontBold : font, color: l.color });
      lineY -= l.size + l.gap;
    });
    y = paymentBoxBottom - 25;

    draw('Détail des prestations', 11, primary, leftMargin, true);
    y -= 4;
    const tableX1 = leftMargin;
    const amountColRight = width - leftMargin;
    const amountColLeft = width - 75;
    const tableXQty = width - 135;
    const montantLabelWidth = fontBold.widthOfTextAtSize('Montant', 9);
    const tableXAmtCentered = (amountColLeft + amountColRight) / 2 - montantLabelWidth / 2;
    page.drawLine({ start: { x: tableX1, y }, end: { x: width - leftMargin, y }, thickness: 0.8, color: primary });
    y -= 12;
    page.drawText('Description', { x: tableX1, y, size: 9, font: fontBold, color: textDark });
    page.drawText('Qté', { x: tableXQty, y, size: 9, font: fontBold, color: textDark });
    page.drawText('Montant', { x: tableXAmtCentered, y, size: 9, font: fontBold, color: textDark });
    y -= 9;
    page.drawLine({ start: { x: tableX1, y: y + 3 }, end: { x: width - leftMargin, y: y + 3 }, thickness: 0.4, color: lightGray });

    const basePriceText = formatMoney(basePrice);
    page.drawText(sanitize(`Location bateau (${partLabel})`), { x: tableX1, y: y - 1, size: 9, font, color: textMuted });
    page.drawText('1', { x: tableXQty, y: y - 1, size: 9, font, color: textMuted });
    page.drawText(basePriceText, { x: getRightAlignedX(basePriceText, 9, font, width - leftMargin), y: y - 1, size: 9, font, color: textMuted });
    y -= 13;

    selectedOptions.forEach((opt: any) => {
      const optPriceText = formatMoney(opt.price || 0);
      page.drawText(sanitize(`Option : ${opt.label}`), { x: tableX1, y: y - 1, size: 8, font, color: textMuted });
      page.drawText('1', { x: tableXQty, y: y - 1, size: 8, font, color: textMuted });
      page.drawText(optPriceText, { x: getRightAlignedX(optPriceText, 8, font, width - leftMargin), y: y - 1, size: 8, font, color: textMuted });
      y -= 12;
    });

    const actualSkipperTotal = (isAgencyReservation && boatData?.skipperRequired) ? effectiveSkipperPrice * 1 : skipperTotal;
    if (skipperTotal > 0 || (isAgencyReservation && boatData?.skipperRequired)) {
      const skipperLabel = isAgencyReservation
        ? `Skipper (${effectiveSkipperPrice}EUR) - Inclus`
        : `Skipper (${effectiveSkipperPrice}EUR x ${skipperDays}j) - Payé sur place`;
      const skipperPriceText = formatMoney(actualSkipperTotal);
      page.drawText(sanitize(skipperLabel), { x: tableX1, y: y - 1, size: 9, font, color: textMuted });
      page.drawText('1', { x: tableXQty, y: y - 1, size: 9, font, color: textMuted });
      page.drawText(skipperPriceText, { x: getRightAlignedX(skipperPriceText, 9, font, width - leftMargin), y: y - 1, size: 9, font, color: textMuted });
      y -= 13;
    }

    page.drawLine({ start: { x: tableX1, y: y + 2 }, end: { x: width - leftMargin, y: y + 2 }, thickness: 0.4, color: lightGray });
    y -= 6;

    const tvaRate = 0.2;
    const skipperTotalForCalc = (isAgencyReservation && boatData?.skipperRequired) ? effectiveSkipperPrice * 1 : (skipperTotal || 0);
    const baseForTVA = basePrice - skipperTotalForCalc;
    const tvaAmount = Math.round(baseForTVA * tvaRate);
    const totalHT = basePrice;
    const totalTTC = totalHT + tvaAmount;

    page.drawLine({ start: { x: tableX1, y: y + 2 }, end: { x: width - leftMargin, y: y + 2 }, thickness: 0.4, color: lightGray });
    y -= 6;

    const totalHTText = formatMoney(totalHT);
    page.drawText('Total HT', { x: tableX1, y: y - 1, size: 9, font: fontBold, color: textDark });
    page.drawText(totalHTText, { x: getRightAlignedX(totalHTText, 9, fontBold, width - leftMargin), y: y - 1, size: 9, font: fontBold, color: textDark });
    y -= 13;
    const tvaText = formatMoney(tvaAmount);
    page.drawText('TVA (20% sur bateau + options)', { x: tableX1, y: y - 1, size: 8, font, color: textMuted });
    page.drawText(tvaText, { x: getRightAlignedX(tvaText, 8, font, width - leftMargin), y: y - 1, size: 8, font, color: textMuted });
    y -= 12;
    const totalTTCText = formatMoney(totalTTC);
    page.drawText('Total TTC hors carburant', { x: tableX1, y: y - 1, size: 9, font: fontBold, color: textDark });
    page.drawText(totalTTCText, { x: getRightAlignedX(totalTTCText, 9, fontBold, width - leftMargin), y: y - 1, size: 9, font: fontBold, color: textDark });
    y -= 15;

    const noteText = isAgencyReservation
      ? 'Note : Acompte sur le total (bateau + options + skipper). Carburant payé sur place.'
      : 'Note : Acompte 20% sur bateau+options uniquement. Skipper et carburant payés sur place.';
    page.drawText(sanitize(noteText), { x: tableX1, y: y - 1, size: 7, font, color: textMuted });
    y -= 15;

    const recapX = width - 200;
    const recapWidth = 150;
    let recapLinesCount = 5;
    if (actualSkipperTotal > 0) recapLinesCount++;
    recapLinesCount++;
    const recapHeight = recapLinesCount * 11 + 15;
    if (y - recapHeight < 80) {
      page = pdfDoc.addPage([595, 842]);
      y = height - 50;
    }
    page.drawRectangle({ x: recapX - 8, y: y - recapHeight, width: recapWidth, height: recapHeight, color: rgb(1, 1, 1), borderColor: borderGray, borderWidth: 0.5 });
    let recapY = y - 12;
    const writeRecap = (label: string, value: string, bold = false) => {
      page.drawText(sanitize(label), { x: recapX, y: recapY, size: 8, font: bold ? fontBold : font, color: textDark });
      page.drawText(sanitize(value), { x: recapX + recapWidth - 70, y: recapY, size: 8, font: bold ? fontBold : font, color: textDark });
      recapY -= 11;
    };
    writeRecap(isAgencyReservation ? 'Acompte' : 'Acompte (20%)', formatMoney(deposit), true);
    writeRecap('Total HT', formatMoney(totalHT));
    writeRecap('TVA (20%)', formatMoney(tvaAmount));
    writeRecap('Total TTC', formatMoney(totalTTC), true);
    writeRecap('Reste à payer', formatMoney(remaining), true);
    recapY -= 4;
    if (actualSkipperTotal > 0) writeRecap(isAgencyReservation ? 'Skipper (inclus, HT)' : 'Skipper (sur place)', formatMoney(actualSkipperTotal));
    writeRecap('Carburant (sur place)', 'À définir');
    y -= recapHeight + 15;

    if (y < 120) {
      page = pdfDoc.addPage([595, 842]);
      y = height - 50;
    }
    draw('Conditions importantes', 10, primary, leftMargin, true, 4);
    y -= 3;
    if (isAgencyReservation) {
      drawWrapped("• Acompte sur le total (bateau + options + skipper). Carburant payé sur place.", 7, textMuted, leftMargin, width - leftMargin * 2, false, 2);
      drawWrapped("• Solde à régler avant ou le jour de l'embarquement.", 7, textMuted, leftMargin, width - leftMargin * 2, false, 2);
      if (boatData?.skipperRequired) drawWrapped("• Skipper obligatoire inclus dans la facture.", 7, textMuted, leftMargin, width - leftMargin * 2, false, 2);
    } else {
      drawWrapped("• Acompte 20% sur bateau+options uniquement. Skipper et carburant payés sur place.", 7, textMuted, leftMargin, width - leftMargin * 2, false, 2);
      drawWrapped("• Solde bateau+options à régler avant ou le jour de l'embarquement.", 7, textMuted, leftMargin, width - leftMargin * 2, false, 2);
      if (boatData?.skipperRequired) drawWrapped("• Skipper obligatoire inclus (payé sur place).", 7, textMuted, leftMargin, width - leftMargin * 2, false, 2);
    }
    drawWrapped("• Rendez-vous et instructions communiqués 24h avant.", 7, textMuted, leftMargin, width - leftMargin * 2, false, 2);
    y -= 8;
    drawWrapped('Document généré automatiquement - valable sans signature. Questions : charter@bb-yachts.com', 6, textMuted, leftMargin, width - leftMargin * 2, false, 2);

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return null;
  }
}
