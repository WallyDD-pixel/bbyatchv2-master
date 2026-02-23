import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const BRAND = {
  name: 'BB YACHTS',
  address: 'Port Camille Rayon – Avenue des frères Roustan – 06220 VALLAURIS, France',
  email: 'charter@bb-yachts.com',
  phone: '06 09 17 62 82',
  currency: 'EUR'
} as const;

const CURRENCY_SUFFIX = ' EUR';

function formatMoney(v: number){
  const raw = new Intl.NumberFormat('fr-FR',{ style:'currency', currency: BRAND.currency }).format(v||0);
  return raw.replace(/[\u202F\u00A0]/g,' ');
}

function formatMoneyNumber(v: number){
  const n = Number(v) || 0;
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n).replace(/\u202F/g,' ');
}

function drawAmountAligned(
  page: PDFPage,
  amount: number,
  amountColRight: number,
  fontSize: number,
  font: PDFFont,
  fontBold: PDFFont,
  y: number,
  color: ReturnType<typeof rgb>,
  bold = false
) {
  const f = bold ? fontBold : font;
  const num = Number(amount) || 0;
  const numberStr = (num < 0 ? '-' : '') + formatMoneyNumber(Math.abs(num));
  const suffixW = f.widthOfTextAtSize(CURRENCY_SUFFIX, fontSize);
  const gap = 4;
  const currencyX = amountColRight - suffixW;
  const numberX = currencyX - gap - f.widthOfTextAtSize(numberStr, fontSize);
  page.drawText(sanitize(numberStr), { x: numberX, y, size: fontSize, font: f, color });
  page.drawText(sanitize(CURRENCY_SUFFIX), { x: currencyX, y, size: fontSize, font: f, color });
}
function sanitize(text: string){
  if (!text) return '';
  const charMap: Record<string, string> = {
    '→': '->', '–': '-', '—': '-', '…': '...', '⚠': '[!]', '€': 'EUR',
    '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"', '\u00A0': ' ', '\u202F': ' ',
    '\u2713': '[OK]', '\u2714': '[OK]', // ✓ U+2713, ✔ U+2714 (pas de littéraux pour éviter doublon)
  };
  let result = String(text);
  for (const [char, replacement] of Object.entries(charMap)) {
    const escaped = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), replacement);
  }
  return result.replace(/[\u200B-\u200D\uFEFF]/g, '');
}

function formatDate(d: Date | string | null | undefined): string {
  if (d == null) return '';
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
  } catch {
    return '';
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Next.js 15: params is a Promise
    const { id } = await params;
    if(!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    const session = await getServerSession() as any;
    if(!session?.user?.email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const sessionEmail = session.user.email as string;
    let role: string | undefined = (session.user as any)?.role;
    if(!role){
      try { const u = await prisma.user.findUnique({ where:{ email: sessionEmail }, select:{ role:true } }); role = u?.role; } catch {}
    }
    const isAdmin = role === 'admin';
    const reservation = await prisma.reservation.findUnique({ 
      where: { id }, 
      include:{ 
        boat: { include: { options: true } }, 
        user: { select: { id: true, email: true, role: true, name: true, firstName: true, lastName: true, phone: true, address: true, city: true, zip: true, country: true } }
      } 
    });
    if(!reservation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if(reservation.user?.email !== sessionEmail && !isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    if (reservation.status !== 'completed') {
      return NextResponse.json(
        { error: 'not_completed', message: 'La facture finale est disponible uniquement pour les réservations terminées.' },
        { status: 409 }
      );
    }

    // Vérifier si c'est une réservation agence
    const isAgencyReservation = reservation.user?.role === 'agency';

    const invoiceNumber = `FA-${new Date().getFullYear()}-${reservation.id.slice(-6)}`;
    const baseTotal = reservation.totalPrice || 0;
    const reservationData = reservation as any;
    const finalFuelAmount = reservationData.finalFuelAmount || 0; // Montant final du carburant
    
    // Parser metadata
    const meta = (()=>{ try { return reservation.metadata? JSON.parse(reservation.metadata): null; } catch { return null; } })();
    
    // Calculer les montants détaillés
    const part = reservation.part || 'FULL';
    const partLabel = part==='FULL'? 'Journée entière' : part==='AM'? 'Matin' : part==='PM'? 'Après-midi' : part==='SUNSET'? 'Sunset (2h)' : part;
    const nbJours = (()=>{ 
      const s = new Date(reservation.startDate); 
      const e = new Date(reservation.endDate); 
      return Math.round((e.getTime()-s.getTime())/86400000)+1; 
    })();
    
    // Récupérer le prix de base du bateau
    const settings = await prisma.settings.findFirst() as any;
    const defaultSkipperPrice = settings?.defaultSkipperPrice || 350;
    const boatData = reservation.boat as any;
    const effectiveSkipperPrice = boatData?.skipperPrice ?? defaultSkipperPrice;
    
    // Calcul du skipper :
    // Pour les agences : selon meta.needsSkipper (si false, pas de skipper dans la facture)
    // Pour les clients directs : FULL/SUNSET = nbJours, AM/PM = 1 jour
    const agencyWantsSkipper = isAgencyReservation && (meta?.needsSkipper === true || meta?.needsSkipper === '1');
    const skipperDays = isAgencyReservation 
      ? (agencyWantsSkipper ? 1 : 0)  // Agences : 1 jour si besoin skipper, sinon 0
      : ((part==='FULL' || part==='SUNSET') ? Math.max(nbJours, 1) : 1);
    const skipperTotal = (isAgencyReservation && !agencyWantsSkipper) ? 0 : (boatData?.skipperRequired ? (effectiveSkipperPrice * skipperDays) : 0);
    
    // IMPORTANT: Pour les agences, le skipper est inclus dans la facture. Pour les clients directs, le skipper et le carburant sont payés sur place.
    const total = isAgencyReservation 
      ? baseTotal + finalFuelAmount  // Skipper déjà inclus dans baseTotal
      : baseTotal + skipperTotal + finalFuelAmount; // Ajouter skipper pour clients directs
    const deposit = reservation.depositAmount || 0;
    const totalPaid = total;
    
    // Calculer le prix de base pour l'acompte
    // Pour les agences : le skipper est inclus dans baseTotal, donc basePrice = baseTotal
    // Pour les clients directs : le skipper est payé sur place, donc basePrice = baseTotal - skipperTotal
    const basePriceForDeposit = isAgencyReservation ? baseTotal : (baseTotal - skipperTotal);
    const basePrice = basePriceForDeposit; // Pour l'affichage dans la facture
    
    // Récupérer les options sélectionnées
    const selectedOptionIds = meta?.optionIds || [];
    const selectedOptions = (reservation.boat?.options || []).filter((o:any) => selectedOptionIds.includes(o.id));
    const optionsTotal = selectedOptions.reduce((sum:number, o:any) => sum + (o.price || 0), 0);

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primary = rgb(0.05,0.15,0.32);
    const lightGray = rgb(0.94,0.95,0.97);
    const borderGray = rgb(0.80,0.82,0.85);
    const textDark = rgb(0.10,0.10,0.12);
    const textMuted = rgb(0.40,0.42,0.46);

    // Fonction pour dessiner du texte avec retour à la ligne automatique
    const drawWrapped = (text: string, size=10, color=textDark, x=leftMargin, maxWidth=width-leftMargin-x, bold=false, lineGap=4) => {
      const safe = sanitize(text);
      const words = safe.split(' ');
      let currentLine = '';
      let lines: string[] = [];
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = (bold ? fontBold : font).widthOfTextAtSize(testLine, size);
        
        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      
      let currentY = y;
      lines.forEach((line) => {
        page.drawText(line, { x, y: currentY, size, font: bold? fontBold: font, color });
        currentY -= size + lineGap;
      });
      y = currentY;
    };

    // Header + logo (compact pour tenir sur 1 page)
    const leftMargin = 50;
    let headerHeight = 70;
    try {
      const logoPath = path.join(process.cwd(),'public','cropped-LOGO-BB-yacht-ok_black-FEEL-THE-MEdierranean-247x82.png');
      const logoBytes = await fs.readFile(logoPath);
      const png = await pdfDoc.embedPng(logoBytes);
      const logoDims = png.scale(0.68);
      page.drawImage(png, { x: leftMargin, y: height - 28 - logoDims.height, width: logoDims.width, height: logoDims.height });
      headerHeight = logoDims.height + 28;
    } catch {
      page.drawText(BRAND.name, { x: leftMargin, y: height - 36, size: 18, font: fontBold, color: primary });
    }
    page.drawLine({ start:{ x: 40, y: height - headerHeight - 6 }, end:{ x: width - 40, y: height - headerHeight - 6 }, thickness: 0.8, color: primary });

    const infoX = width - 200;
    page.drawText('Facture finale', { x: infoX, y: height - 32, size: 12, font: fontBold, color: primary });
    page.drawText(`N° ${invoiceNumber}`, { x: infoX, y: height - 44, size: 8, font, color: textMuted });
    page.drawText(`Date ${new Date().toLocaleDateString('fr-FR')}`, { x: infoX, y: height - 54, size: 8, font, color: textMuted });
    page.drawText(sanitize(BRAND.address), { x: leftMargin, y: height - headerHeight - 14, size: 7, font, color: textMuted });
    page.drawText(sanitize(`${BRAND.email} | ${BRAND.phone}`), { x: leftMargin, y: height - headerHeight - 22, size: 7, font, color: textMuted });

    const TOP_MARGIN = 52;
    let y = height - headerHeight - TOP_MARGIN;

    const linesBox = (title: string, entries: string[], half = false) => {
      const boxTop = y;
      const boxWidth = half ? (width/2 - leftMargin - 10) : (width - leftMargin*2);
      let tempY = y;
      tempY -= 10 + 3;
      entries.forEach(() => tempY -= 8 + 3);
      const boxBottom = tempY;
      page.drawRectangle({ x: leftMargin - 8, y: boxBottom - 8, width: boxWidth + 16, height: (boxTop - boxBottom) + 16, color: half ? lightGray : rgb(1,1,1), borderColor: borderGray, borderWidth: 0.5 });
      page.drawText(title, { x: leftMargin, y: boxTop - 12, size: 10, font: fontBold, color: primary });
      let cursor = boxTop - 10 - 3;
      entries.forEach(txt => {
        page.drawText(sanitize(txt), { x: leftMargin, y: cursor - 8, size: 8, font, color: textDark });
        cursor -= 8 + 3;
      });
      y = boxBottom - 24;
    };

    // Bloc client (moitié)
    const clientName = reservation.user?.name || `${reservation.user?.firstName||''} ${reservation.user?.lastName||''}`.trim() || reservation.user?.email || '';
    const clientEntries = [clientName];
    if(reservation.user?.email) clientEntries.push(reservation.user.email);
    if(reservation.user?.phone) clientEntries.push(`Tél: ${reservation.user.phone}`);
    if(reservation.user?.address){
      clientEntries.push(reservation.user.address);
      const cityLine = [reservation.user.zip, reservation.user.city].filter(Boolean).join(' ');
      if(cityLine) clientEntries.push(cityLine);
      if(reservation.user.country) clientEntries.push(reservation.user.country);
    }
    linesBox('Client', clientEntries, true);

    // Bloc réservation (plein)
    const start = reservation.startDate.toISOString().slice(0,10);
    const end = reservation.endDate.toISOString().slice(0,10);
    const dateDisplay = start + (end!==start? ' -> ' + end : '');
    const resEntries = [
      ...(reservation.reference ? [`Référence : ${reservation.reference}`] : []),
      `Bateau : ${reservation.boat?.name||''}`,
      ...(reservation.boat?.lengthM ? [`Longueur : ${reservation.boat.lengthM}m`] : []),
      ...(reservation.boat?.capacity ? [`Capacité max : ${reservation.boat.capacity} personnes`] : []),
      ...(reservation.boat?.speedKn ? [`Vitesse : ${reservation.boat.speedKn} nœuds`] : []),
      ...(meta?.experienceTitleFr || meta?.expSlug ? [`Expérience : ${meta.experienceTitleFr || meta.expSlug}`] : []),
      `Dates : ${dateDisplay}`,
      `Type de prestation : ${partLabel}`,
      ...(meta?.departurePort ? [`Port de départ : ${meta.departurePort}`] : []),
      reservation.passengers? `Nombre de passagers : ${reservation.passengers}` : '',
      meta?.childrenCount ? `Enfants à bord : ${meta.childrenCount}` : '',
      ...(meta?.waterToys ? [`Jeux d'eau demandés : ${meta.waterToys === 'yes' ? 'Oui' : 'Non'}`] : []),
      meta?.specialNeeds ? `Demande spécifique : ${meta.specialNeeds}` : ''
    ].filter(Boolean) as string[];
    linesBox('Détails de la réservation', resEntries);

    // Tableau facture
    page.drawText('Détail des prestations', { x: leftMargin, y: y - 10, size: 10, font: fontBold, color: primary });
    y -= 18;
    const tableX1 = leftMargin;
    const amountColRight = width - leftMargin;
    const qtyColWidth = 42;
    const gapQtyToAmount = 28;
    const amountColWidth = 78;
    const tableXQtyRight = amountColRight - amountColWidth - gapQtyToAmount;
    const tableXQty = tableXQtyRight - qtyColWidth;
    const montantHeaderX = amountColRight - fontBold.widthOfTextAtSize(' EUR', 9) - 4 - fontBold.widthOfTextAtSize('Montant', 9);
    page.drawLine({ start: { x: tableX1, y }, end: { x: amountColRight, y }, thickness: 0.7, color: primary });
    y -= 11;
    page.drawText('Description', { x: tableX1, y: y, size: 9, font: fontBold, color: textDark });
    const qteHeaderX = tableXQtyRight - fontBold.widthOfTextAtSize('Qté', 9);
    page.drawText('Qté', { x: qteHeaderX, y: y, size: 9, font: fontBold, color: textDark });
    page.drawText('Montant', { x: montantHeaderX, y: y, size: 9, font: fontBold, color: textDark });
    y -= 10;
    page.drawLine({ start: { x: tableX1, y: y + 3 }, end: { x: amountColRight, y: y + 3 }, thickness: 0.5, color: lightGray });
    const rowH = 12;
    const drawRow = (desc: string, amt: number, sz = 9, bold = false) => {
      const rowY = y - 2;
      const qtyX = tableXQtyRight - (bold ? fontBold : font).widthOfTextAtSize('1', sz);
      page.drawText(sanitize(desc), { x: tableX1, y: rowY, size: sz, font, color: textDark });
      page.drawText('1', { x: qtyX, y: rowY, size: sz, font: bold ? fontBold : font, color: textDark });
      drawAmountAligned(page, amt, amountColRight, sz, font, fontBold, rowY, textDark, bold);
      y -= rowH;
    };
    drawRow(`Location bateau (${partLabel})`, basePrice);
    selectedOptions.forEach((opt: any) => drawRow(`Option : ${opt.label}`, opt.price || 0, 8));
    if (skipperTotal > 0) drawRow(`Skipper (${effectiveSkipperPrice} EUR x ${skipperDays}j)`, skipperTotal);
    page.drawLine({ start: { x: tableX1, y: y + 3 }, end: { x: amountColRight, y: y + 3 }, thickness: 0.5, color: lightGray });
    y -= 8;
    const totalRowY = y - 2;
    page.drawText('Total hors carburant', { x: tableX1, y: totalRowY, size: 9, font: fontBold, color: textDark });
    drawAmountAligned(page, baseTotal, amountColRight, 9, font, fontBold, totalRowY, textDark, true);
    y -= rowH;
    if (finalFuelAmount > 0) {
      drawRow('Carburant consommé', finalFuelAmount);
      page.drawLine({ start: { x: tableX1, y: y + 3 }, end: { x: amountColRight, y: y + 3 }, thickness: 0.5, color: lightGray });
      y -= 8;
    }
    const finalRowY = y - 2;
    page.drawText('Total final', { x: tableX1, y: finalRowY, size: 10, font: fontBold, color: primary });
    drawAmountAligned(page, total, amountColRight, 10, font, fontBold, finalRowY, primary, true);
    y -= rowH + 10;
    drawRow('Acompte déjà payé (20%)', -deposit);
    const remainingBoatOptions = Math.max(basePriceForDeposit - deposit, 0);
    const soldeLabel = isAgencyReservation ? 'Solde payé (bateau + options + skipper)' : 'Solde payé (bateau + options)';
    drawRow(soldeLabel, remainingBoatOptions);
    if (skipperTotal > 0 && !isAgencyReservation) drawRow('Skipper (payé sur place)', skipperTotal);
    if (finalFuelAmount > 0) drawRow('Carburant (payé sur place)', finalFuelAmount);
    y -= 4;
    page.drawLine({ start: { x: tableX1, y: y }, end: { x: amountColRight, y: y }, thickness: 0.5, color: lightGray });
    y -= 14;

    // Récap (montants alignés : " EUR" à la même colonne)
    const recapX = width - 200;
    const recapWidth = 150;
    const recapAmountColRight = recapX + recapWidth - 8;
    let recapLinesCount = 3;
    if (skipperTotal > 0) recapLinesCount++;
    if (finalFuelAmount > 0) recapLinesCount++;
    const recapHeight = recapLinesCount * 11 + 18;
    page.drawRectangle({ x: recapX - 8, y: y - recapHeight, width: recapWidth, height: recapHeight, color: lightGray, borderColor: borderGray, borderWidth: 0.5 });
    let ry = y - 14;
    const recapLineAmount = (label: string, amount: number, bold = false) => {
      page.drawText(sanitize(label), { x: recapX, y: ry, size: 8, font: bold ? fontBold : font, color: textDark });
      drawAmountAligned(page, amount, recapAmountColRight, 8, font, fontBold, ry, textDark, bold);
      ry -= 11;
    };
    recapLineAmount('Total bateau + options', basePriceForDeposit);
    if (skipperTotal > 0) recapLineAmount(isAgencyReservation ? 'Skipper (inclus)' : 'Skipper (sur place)', skipperTotal);
    if (finalFuelAmount > 0) recapLineAmount('Carburant (payé sur place)', finalFuelAmount);
    recapLineAmount('Total contrat', total, true);
    recapLineAmount('Acompte payé (20%)', deposit);
    recapLineAmount('Solde payé', totalPaid - deposit, true);
    y -= recapHeight + 20;

    // Pied de page
    const paymentLine = [
      `Créée le ${formatDate(reservation.createdAt)}`,
      reservation.depositPaidAt ? `Acompte le ${formatDate(reservation.depositPaidAt)}` : '',
      reservation.completedAt ? `Terminée le ${formatDate(reservation.completedAt)}` : '',
      'Facture acquittée'
    ].filter(Boolean).join('  ·  ');
    page.drawText(sanitize(paymentLine), { x: leftMargin, y: y - 10, size: 7, font, color: textMuted });
    y -= 18;
    drawWrapped('[OK] Facture acquittée - Paiement total reçu. Merci pour votre confiance.', 8, rgb(0.0, 0.55, 0.0), leftMargin, width - leftMargin * 2, true, 4);
    drawWrapped('Cette facture fait foi du paiement intégral. Questions : charter@bb-yachts.com sous 30 jours. Document valable sans signature.', 7, textMuted, leftMargin, width - leftMargin * 2, false, 3);

    const pdfBytes = await pdfDoc.save();
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="${invoiceNumber}.pdf"`);
    return new NextResponse(new Uint8Array(pdfBytes), { status: 200, headers });
  } catch (e: any) {
    console.error('Error generating final invoice PDF:', e);
    return NextResponse.json({ error: 'server_error', message: e?.message }, { status: 500 });
  }
}
