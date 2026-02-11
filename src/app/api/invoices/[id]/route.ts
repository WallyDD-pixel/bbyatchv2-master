import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const BRAND = {
  name: 'BB YACHTS',
  address: 'Port Camille Rayon – Avenue des frères Roustan – 06220 VALLAURIS, France',
  email: 'charter@bb-yachts.com',
  phone: '06 09 17 62 82',
  currency: 'EUR',
  vatRate: 0
} as const;

function formatMoney(v: number){
  const raw = new Intl.NumberFormat('fr-FR',{ style:'currency', currency: BRAND.currency }).format(v);
  return raw.replace(/[\u202F\u00A0]/g,' ');
}

// Fonction pour calculer la position X pour aligner le texte à droite
function getRightAlignedX(text: string, fontSize: number, font: any, maxX: number): number {
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  return maxX - textWidth;
}

function sanitize(text: string){
  if (!text) return '';
  
  // Mapping des caractères spéciaux vers WinAnsi
  const charMap: Record<string, string> = {
    '→': '->',
    '–': '-',
    '—': '-',
    '…': '...',
    '⚠': '[!]',
    '€': 'EUR',
    '\u2018': "'",
    '\u2019': "'",
    '\u201C': '"',
    '\u201D': '"',
    '\u00A0': ' ',
    '\u202F': ' ',
  };
  
  // Remplacer d'abord les caractères spéciaux connus
  let result = text;
  for (const [char, replacement] of Object.entries(charMap)) {
    result = result.replace(new RegExp(char, 'g'), replacement);
  }
  
  // Supprimer les caractères de contrôle invisibles
  result = result.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Convertir les caractères accentués vers WinAnsi (les caractères français courants sont supportés)
  // WinAnsi supporte: àáâãäåèéêëìíîïòóôõöùúûüýÿçñ
  // On garde ces caractères tels quels car ils sont supportés par WinAnsi
  
  return result;
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
      include: { 
        boat: { include: { options: true } }, 
        user: { select: { id: true, email: true, role: true, name: true, firstName: true, lastName: true, phone: true, address: true, city: true, zip: true, country: true } }
      } 
    });
    if(!reservation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if(reservation.user?.email !== sessionEmail && !isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    // Vérifier si c'est une réservation agence
    const isAgencyReservation = reservation.user?.role === 'agency';

    const invoiceNumber = `AC-${new Date().getFullYear()}-${reservation.id.slice(-6)}`;
    // IMPORTANT: Pour les agences, le skipper est inclus dans la facture. Pour les clients directs, le skipper et le carburant sont payés sur place.
    // L'acompte de 20% ne s'applique QUE sur le prix du bateau + options (sans skipper ni carburant)
    const deposit = reservation.depositAmount || 0;
    const total = reservation.totalPrice || 0;
    // Le reste à payer = prix bateau + options - acompte (sans skipper ni carburant)
    const remaining = reservation.remainingAmount || 0;
    
    // Parser metadata
    const meta = (()=>{ try { return reservation.metadata? JSON.parse(reservation.metadata): null; } catch { return null; } })();
    
    // Calculer les montants détaillés
    const part = reservation.part || 'FULL';
    const partLabel = part==='FULL'? 'Journée entière' : part==='AM'? 'Matin' : part==='PM'? '½ journée' : part==='SUNSET'? 'Sunset (2h)' : part;
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
    
    // Récupérer les options sélectionnées (si stockées dans metadata)
    const selectedOptionIds = meta?.optionIds || [];
    const selectedOptions = (reservation.boat?.options || []).filter((o:any) => selectedOptionIds.includes(o.id));
    const optionsTotal = selectedOptions.reduce((sum:number, o:any) => sum + (o.price || 0), 0);
    
    // Pour les agences : recalculer le skipper à 350€ (toujours 1 jour)
    const actualSkipperTotalForAgency = isAgencyReservation && boatData?.skipperRequired 
      ? (effectiveSkipperPrice * 1)  // Agences : toujours 350€
      : 0;
    
    // Calculer le prix de base pour l'acompte
    // Pour les agences : le skipper est inclus dans le total, donc basePriceForDeposit = total (skipper inclus à 350€)
    // Pour les clients directs : le skipper est payé sur place, donc basePriceForDeposit = total - skipperTotal
    const basePriceForDeposit = isAgencyReservation 
      ? total  // Pour agences, total inclut déjà le skipper
      : (total - skipperTotal);
    
    // Le reste à payer
    // Pour les agences : total - acompte (skipper inclus)
    // Pour les clients directs : prix bateau + options - acompte (sans skipper ni carburant, payés sur place)
    const basePrice = basePriceForDeposit; // Pour l'affichage dans la facture
    
    // Debug: Vérifier le prix utilisé (pour déboguer les problèmes de prix PM vs SUNSET)
    if (process.env.NODE_ENV === 'development') {
      console.log('[invoice] Reservation details:', {
        part,
        partLabel,
        totalPrice: total,
        basePrice,
        skipperTotal,
        isAgencyReservation,
        boatName: reservation.boat?.name
      });
    }

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Palette douce sur fond blanc
    const primary = rgb(0.05,0.15,0.32); // bleu marine discret
    const lightGray = rgb(0.94,0.95,0.97);
    const borderGray = rgb(0.80,0.82,0.85);
    const textDark = rgb(0.10,0.10,0.12);
    const textMuted = rgb(0.40,0.42,0.46);

    // ====== HEADER COMPACT ======
    let headerHeight = 80;
    let logoPlacedHeight = 0;
    try {
      const logoPath = path.join(process.cwd(),'public','cropped-LOGO-BB-yacht-ok_black-FEEL-THE-MEdierranean-247x82.png');
      const logoBytes = await fs.readFile(logoPath);
      const png = await pdfDoc.embedPng(logoBytes);
      const logoDims = png.scale(0.6); // Réduit de 0.8 à 0.6
      const logoX = 50;
      const logoY = height - 30 - logoDims.height;
      page.drawImage(png, { x: logoX, y: logoY, width: logoDims.width, height: logoDims.height });
      logoPlacedHeight = logoDims.height + 30;
      headerHeight = logoPlacedHeight;
    } catch(e) {
      page.drawText(BRAND.name, { x:50, y: height-40, size: 24, font: fontBold, color: primary });
      logoPlacedHeight = 40;
    }

    // Ligne fine sous header
    page.drawLine({ start:{ x:40, y: height - headerHeight - 5 }, end:{ x: width-40, y: height - headerHeight -5 }, thickness: 0.8, color: primary });

    // Infos facture (à droite du logo) - plus compact
    const infoX = width - 200;
    page.drawText("Facture d'acompte", { x: infoX, y: height - 35, size: 14, font: fontBold, color: primary });
    page.drawText(`N° ${invoiceNumber}`, { x: infoX, y: height - 50, size: 9, font, color: textMuted });
    page.drawText(`Date ${new Date().toLocaleDateString('fr-FR')}`, { x: infoX, y: height - 62, size: 9, font, color: textMuted });

    // Coordonnées société - plus compact
    page.drawText(sanitize(BRAND.address), { x: 50, y: height - headerHeight - 20, size: 8, font, color: textMuted });
    page.drawText(sanitize(`${BRAND.email} | ${BRAND.phone}`), { x: 50, y: height - headerHeight - 32, size: 8, font, color: textMuted });

    // Point de départ du contenu principal - réduit
    const TOP_MARGIN = 60;
    let y = height - headerHeight - TOP_MARGIN;
    const leftMargin = 50;

    const draw = (text: string, size=10, color=textDark, x=leftMargin, bold=false, lineGap=4) => {
      const safe = sanitize(text);
      page.drawText(safe, { x, y, size, font: bold? fontBold: font, color });
      y -= size + lineGap;
    };

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
      
      lines.forEach((line) => {
        page.drawText(line, { x, y, size, font: bold? fontBold: font, color });
        y -= size + lineGap;
      });
    };

    // ===== Bloc Client - Compact =====
    const clientBoxTop = y;
    const clientBoxWidth = width/2 - leftMargin - 20;
    const clientName = reservation.user?.name || `${reservation.user?.firstName||''} ${reservation.user?.lastName||''}`.trim() || reservation.user?.email || '';
    const clientLines: { text:string; size:number; color:any; bold?:boolean; gap:number }[] = [];
    clientLines.push({ text: 'Client', size:11, color: primary, bold:true, gap:3 });
    clientLines.push({ text: clientName, size:9, color: textDark, bold:true, gap:1.5 });
    if(reservation.user?.email) clientLines.push({ text: reservation.user.email, size:8, color: textMuted, gap:1.5 });
    if(reservation.user?.phone) clientLines.push({ text: `Tél: ${reservation.user.phone}`, size:8, color: textMuted, gap:1.5 });
    if(reservation.user?.address){
      clientLines.push({ text: reservation.user.address, size:8, color: textMuted, gap:1.5 });
      const cityLine = [reservation.user.zip, reservation.user.city].filter(Boolean).join(' ');
      if(cityLine) clientLines.push({ text: cityLine, size:8, color: textMuted, gap:1.5 });
    }
    let tempY = y;
    clientLines.forEach(l=>{ tempY -= l.size + l.gap; });
    const clientBoxBottom = tempY;
    page.drawRectangle({
      x: leftMargin-8,
      y: clientBoxBottom - 8,
      width: clientBoxWidth + 16,
      height: (clientBoxTop - clientBoxBottom) + 16,
      color: lightGray,
      borderColor: borderGray,
      borderWidth: 0.5
    });
    let lineY = clientBoxTop;
    clientLines.forEach(l=>{
      page.drawText(sanitize(l.text), { x: leftMargin, y: lineY - l.size - 3, size: l.size, font: l.bold? fontBold: font, color: l.color });
      lineY -= l.size + l.gap;
    });
    y = clientBoxBottom - 20;

    // ===== Bloc Réservation - Compact en 2 colonnes =====
    const resBoxTop = y;
    const resCol1X = leftMargin;
    const resCol2X = width/2 + 20;
    const resLines: { text:string; size:number; color:any; bold?:boolean; gap:number; col?:number }[] = [];
    resLines.push({ text: 'Détails de la réservation', size:11, color: primary, bold:true, gap:3, col: 1 });
    
    const start = reservation.startDate.toISOString().slice(0,10);
    const end = reservation.endDate.toISOString().slice(0,10);
    const dateDisplay = start + (end!==start? ' -> ' + end : '');
    
    // Colonne 1
    resLines.push({ text: `Bateau : ${reservation.boat?.name||''}`, size:9, color:textDark, gap:2, col: 1 });
    if(reservation.boat?.lengthM) resLines.push({ text: `${reservation.boat.lengthM}m • ${reservation.boat.capacity||''} pers`, size:8, color:textMuted, gap:2, col: 1 });
    if(meta?.experienceTitleFr || meta?.expSlug){
      resLines.push({ text: `Expérience : ${meta.experienceTitleFr || meta.expSlug}`, size:9, color:textDark, gap:2, col: 1 });
    }
    resLines.push({ text: `Dates : ${dateDisplay}`, size:9, color:textDark, gap:2, col: 1 });
    resLines.push({ text: `Type : ${partLabel}`, size:9, color:textDark, gap:2, col: 1 });
    if(meta?.departurePort) resLines.push({ text: `Port : ${meta.departurePort}`, size:9, color:textDark, gap:2, col: 1 });
    
    // Colonne 2
    if(reservation.passengers) resLines.push({ text: `Passagers : ${reservation.passengers}`, size:9, color:textDark, gap:2, col: 2 });
    if(meta?.childrenCount) resLines.push({ text: `Enfants : ${meta.childrenCount}`, size:9, color:textDark, gap:2, col: 2 });
    if(meta?.waterToys) resLines.push({ text: `Jeux d'eau : ${meta.waterToys === 'yes' ? 'Oui' : 'Non'}`, size:8, color:textMuted, gap:2, col: 2 });
    
    // Calcul hauteur réservation
    tempY = y;
    const col1Lines = resLines.filter(l => !l.col || l.col === 1);
    const col2Lines = resLines.filter(l => l.col === 2);
    const maxLines = Math.max(col1Lines.length, col2Lines.length);
    tempY -= maxLines * 12; // Estimation compacte
    const resBoxBottom = tempY;
    
    page.drawRectangle({
      x: leftMargin-8,
      y: resBoxBottom - 8,
      width: width - (leftMargin*2) + 16,
      height: (resBoxTop - resBoxBottom) + 16,
      color: rgb(1,1,1),
      borderColor: lightGray,
      borderWidth: 0.5
    });
    
    // Écriture colonne 1
    lineY = resBoxTop;
    col1Lines.forEach(l=>{
      page.drawText(sanitize(l.text), { x: resCol1X, y: lineY - l.size - 3, size: l.size, font: l.bold? fontBold: font, color: l.color });
      lineY -= l.size + l.gap;
    });
    
    // Écriture colonne 2
    lineY = resBoxTop;
    col2Lines.forEach(l=>{
      page.drawText(sanitize(l.text), { x: resCol2X, y: lineY - l.size - 3, size: l.size, font: l.bold? fontBold: font, color: l.color });
      lineY -= l.size + l.gap;
    });

    y = resBoxBottom - 25;

    // ===== Informations de paiement - Compact =====
    const paymentBoxTop = y;
    const paymentLines: { text:string; size:number; color:any; bold?:boolean; gap:number }[] = [];
    paymentLines.push({ text: 'Informations de paiement', size:10, color: primary, bold:true, gap:2 });
    paymentLines.push({ text: `Créée le ${reservation.createdAt.toLocaleDateString('fr-FR')}`, size:8, color:textMuted, gap:1.5 });
    if(reservation.depositPaidAt) {
      paymentLines.push({ text: `Acompte payé le ${reservation.depositPaidAt.toLocaleDateString('fr-FR')}`, size:8, color:textMuted, gap:1.5 });
    }
    if(reservation.stripePaymentIntentId) {
      paymentLines.push({ text: `Carte bancaire • ID: ${reservation.stripePaymentIntentId.slice(-8)}`, size:8, color:textMuted, gap:1.5 });
    }
    const statusText = reservation.status === 'deposit_paid' ? 'Acompte payé' : 
                      reservation.status === 'completed' ? 'Terminée' :
                      reservation.status === 'cancelled' ? 'Annulée' : 'En attente';
    paymentLines.push({ text: `Statut : ${statusText}`, size:8, color: reservation.status === 'deposit_paid' ? rgb(0.0, 0.6, 0.0) : textMuted, bold: true, gap:1.5 });
    
    let tempPaymentY = y;
    paymentLines.forEach(l=>{ tempPaymentY -= l.size + l.gap; });
    const paymentBoxBottom = tempPaymentY;
    
    page.drawRectangle({
      x: leftMargin-8,
      y: paymentBoxBottom - 8,
      width: width - (leftMargin*2) + 16,
      height: (paymentBoxTop - paymentBoxBottom) + 16,
      color: lightGray,
      borderColor: borderGray,
      borderWidth: 0.5
    });
    
    let paymentLineY = paymentBoxTop;
    paymentLines.forEach(l=>{
      page.drawText(sanitize(l.text), { x: leftMargin, y: paymentLineY - l.size - 3, size: l.size, font: l.bold? fontBold: font, color: l.color });
      paymentLineY -= l.size + l.gap;
    });

    y = paymentBoxBottom - 25;

    // ===== Tableau détaillé - Compact =====
    draw('Détail des prestations', 11, primary, leftMargin, true); y -= 4;
    const tableX1 = leftMargin;
    const tableXQty = width - 100;
    const tableXAmt = width - 60; // Position fixe pour aligner les montants à droite
    page.drawLine({ start:{ x:tableX1, y:y }, end:{ x: width-leftMargin, y:y }, thickness:0.8, color: primary });
    y -= 12;
    page.drawText('Description', { x: tableX1, y: y, size:9, font: fontBold, color: textDark });
    page.drawText('Qté', { x: tableXQty, y: y, size:9, font: fontBold, color: textDark });
    page.drawText('Montant', { x: tableXAmt, y: y, size:9, font: fontBold, color: textDark });
    y -= 9;
    page.drawLine({ start:{ x:tableX1, y:y+3 }, end:{ x: width-leftMargin, y:y+3 }, thickness:0.4, color: lightGray });
    
    // Ligne 1: Prix de base
    const basePriceText = formatMoney(basePrice);
    page.drawText(sanitize(`Location bateau (${partLabel})`), { x: tableX1, y: y-1, size:9, font, color: textMuted });
    page.drawText('1', { x: tableXQty, y: y-1, size:9, font, color: textMuted });
    page.drawText(basePriceText, { x: getRightAlignedX(basePriceText, 9, font, width - leftMargin), y: y-1, size:9, font, color: textMuted });
    y -= 13;
    
    // Lignes options
    if(selectedOptions.length > 0){
      selectedOptions.forEach((opt:any) => {
        const optPriceText = formatMoney(opt.price || 0);
        page.drawText(sanitize(`Option : ${opt.label}`), { x: tableX1, y: y-1, size:8, font, color: textMuted });
        page.drawText('1', { x: tableXQty, y: y-1, size:8, font, color: textMuted });
        page.drawText(optPriceText, { x: getRightAlignedX(optPriceText, 8, font, width - leftMargin), y: y-1, size:8, font, color: textMuted });
        y -= 12;
      });
    }
    
    // Ligne skipper : TOUJOURS inclus pour les agences, payé sur place pour clients directs
    if(skipperTotal > 0 || (isAgencyReservation && boatData?.skipperRequired)){
      // Pour les agences : toujours afficher le skipper comme inclus (350€)
      const actualSkipperTotal = isAgencyReservation && boatData?.skipperRequired 
        ? (effectiveSkipperPrice * 1)  // Agences : toujours 350€
        : skipperTotal;
      const skipperLabel = isAgencyReservation 
        ? `Skipper (${effectiveSkipperPrice}€) - Inclus`
        : `Skipper (${effectiveSkipperPrice}€ × ${skipperDays}j) - Payé sur place`;
      const skipperPriceText = formatMoney(actualSkipperTotal);
      page.drawText(sanitize(skipperLabel), { x: tableX1, y: y-1, size:9, font, color: textMuted });
      page.drawText('1', { x: tableXQty, y: y-1, size:9, font, color: textMuted });
      page.drawText(skipperPriceText, { x: getRightAlignedX(skipperPriceText, 9, font, width - leftMargin), y: y-1, size:9, font, color: textMuted });
      y -= 13;
    }
    
    // Ligne séparatrice
    page.drawLine({ start:{ x:tableX1, y:y+2 }, end:{ x: width-leftMargin, y:y+2 }, thickness:0.4, color: lightGray });
    y -= 6;
    
    // Calcul HT/TVA/TTC
    // TVA = 20% sur bateau + options (skipper HT, pas de TVA)
    const tvaRate = 0.20; // 20%
    // Pour les agences : skipper toujours 350€, pour clients directs utiliser skipperTotal calculé
    const skipperTotalForCalc = isAgencyReservation && boatData?.skipperRequired 
      ? (effectiveSkipperPrice * 1)  // Agences : toujours 350€
      : (skipperTotal || 0);
    // Base pour TVA = bateau + options (sans skipper)
    const baseForTVA = basePrice - skipperTotalForCalc;
    const tvaAmount = Math.round(baseForTVA * tvaRate);
    const totalHT = basePrice; // Total HT = bateau + options + skipper (skipper HT)
    const totalTTC = totalHT + tvaAmount; // Total TTC = HT + TVA
    
    // Ligne séparatrice avant totaux
    page.drawLine({ start:{ x:tableX1, y:y+2 }, end:{ x: width-leftMargin, y:y+2 }, thickness:0.4, color: lightGray });
    y -= 6;
    
    // Total HT
    const totalHTText = formatMoney(totalHT);
    page.drawText('Total HT', { x: tableX1, y: y-1, size:9, font: fontBold, color: textDark });
    page.drawText('', { x: tableXQty, y: y-1, size:9, font, color: textDark });
    page.drawText(totalHTText, { x: getRightAlignedX(totalHTText, 9, fontBold, width - leftMargin), y: y-1, size:9, font: fontBold, color: textDark });
    y -= 13;
    
    // TVA (20% sur bateau + options uniquement, pas sur skipper)
    const tvaText = formatMoney(tvaAmount);
    page.drawText(`TVA (20% sur bateau + options)`, { x: tableX1, y: y-1, size:8, font, color: textMuted });
    page.drawText('', { x: tableXQty, y: y-1, size:8, font, color: textMuted });
    page.drawText(tvaText, { x: getRightAlignedX(tvaText, 8, font, width - leftMargin), y: y-1, size:8, font, color: textMuted });
    y -= 12;
    
    // Note sur skipper HT
    if(skipperTotalForCalc > 0 && isAgencyReservation){
      page.drawText('Note : Skipper HT (non soumis à TVA)', { x: tableX1, y: y-1, size:7, font, color: textMuted });
      y -= 10;
    }
    
    // Total TTC
    const totalTTCText = formatMoney(totalTTC);
    page.drawText('Total TTC hors carburant', { x: tableX1, y: y-1, size:9, font: fontBold, color: textDark });
    page.drawText('', { x: tableXQty, y: y-1, size:9, font, color: textDark });
    page.drawText(totalTTCText, { x: getRightAlignedX(totalTTCText, 9, fontBold, width - leftMargin), y: y-1, size:9, font: fontBold, color: textDark });
    y -= 15;
    
    // Note compacte (différente selon agence ou client direct)
    const noteText = isAgencyReservation
      ? 'Note : Acompte sur le total (bateau + options + skipper). Carburant payé sur place.'
      : 'Note : Acompte 20% sur bateau+options uniquement. Skipper et carburant payés sur place.';
    page.drawText(sanitize(noteText), { x: tableX1, y: y-1, size:7, font, color: textMuted });
    y -= 15;

    // ===== Récapitulatif - Compact =====
    const recapX = width - 200;
    const recapWidth = 150;
    // Calculer le skipper pour le récapitulatif (une seule fois)
    const actualSkipperForRecap = isAgencyReservation && boatData?.skipperRequired 
      ? (effectiveSkipperPrice * 1)  // Agences : toujours 350€
      : (skipperTotal || 0);
    let recapLinesCount = 5; // Acompte, Total HT, TVA, Total TTC, Reste à payer
    if(actualSkipperForRecap > 0) recapLinesCount++;
    recapLinesCount++; // Carburant
    const recapHeight = recapLinesCount * 11 + 15;
    
    if (y - recapHeight < 80) {
      page = pdfDoc.addPage();
      y = height - 50;
    }
    page.drawRectangle({ x: recapX-8, y: y-recapHeight, width: recapWidth, height: recapHeight, color: rgb(1,1,1), borderColor: borderGray, borderWidth: 0.5 });
    let recapY = y - 12;
    const writeRecap = (label:string, value:string, bold=false) => {
      page.drawText(sanitize(label), { x: recapX, y: recapY, size: 8, font: bold? fontBold: font, color: textDark });
      page.drawText(sanitize(value), { x: recapX + recapWidth - 70, y: recapY, size: 8, font: bold? fontBold: font, color: textDark });
      recapY -= 11;
    };
    writeRecap(isAgencyReservation ? 'Acompte' : 'Acompte (20%)', formatMoney(deposit), true);
    writeRecap('Total HT', formatMoney(totalHT));
    writeRecap('TVA (20%)', formatMoney(tvaAmount));
    writeRecap('Total TTC', formatMoney(totalTTC), true);
    writeRecap('Reste à payer', formatMoney(remaining), true);
    recapY -= 4;
    if(actualSkipperForRecap > 0) {
      writeRecap(isAgencyReservation ? 'Skipper (inclus, HT)' : 'Skipper (sur place)', formatMoney(actualSkipperForRecap));
    }
    writeRecap('Carburant (sur place)', 'À définir');
    y -= recapHeight + 15;

    // ===== Mentions légales et conditions - Compact =====
    if (y < 120) {
      page = pdfDoc.addPage();
      y = height - 50;
    }
    
    draw('Conditions importantes', 10, primary, leftMargin, true, 4);
    y -= 3;
    
    if(isAgencyReservation) {
      drawWrapped("• Acompte sur le total (bateau + options + skipper). Carburant payé sur place.",7,textMuted,leftMargin,width-leftMargin*2,false,2);
      drawWrapped("• Solde à régler avant ou le jour de l'embarquement.",7,textMuted,leftMargin,width-leftMargin*2,false,2);
      if(boatData?.skipperRequired) {
        drawWrapped("• Skipper obligatoire inclus dans la facture.",7,textMuted,leftMargin,width-leftMargin*2,false,2);
      }
    } else {
      drawWrapped("• Acompte 20% sur bateau+options uniquement. Skipper et carburant payés sur place.",7,textMuted,leftMargin,width-leftMargin*2,false,2);
      drawWrapped("• Solde bateau+options à régler avant ou le jour de l'embarquement.",7,textMuted,leftMargin,width-leftMargin*2,false,2);
      if(boatData?.skipperRequired) {
        drawWrapped("• Skipper obligatoire inclus (payé sur place).",7,textMuted,leftMargin,width-leftMargin*2,false,2);
      }
    }
    drawWrapped("• Rendez-vous et instructions communiqués 24h avant.",7,textMuted,leftMargin,width-leftMargin*2,false,2);
    
    y -= 8;
    drawWrapped('Document généré automatiquement - valable sans signature. Questions : charter@bb-yachts.com',6,textMuted,leftMargin,width-leftMargin*2,false,2);

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), { status:200, headers:{ 'Content-Type':'application/pdf', 'Content-Disposition':`inline; filename="${invoiceNumber}.pdf"` }});
  } catch(e:any){
    console.error(e);
    return NextResponse.json({ error:'server_error' }, { status:500 });
  }
}
