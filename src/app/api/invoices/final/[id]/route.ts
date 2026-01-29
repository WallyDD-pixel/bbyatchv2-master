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
  currency: 'EUR'
} as const;

function formatMoney(v: number){
  const raw = new Intl.NumberFormat('fr-FR',{ style:'currency', currency: BRAND.currency }).format(v||0);
  return raw.replace(/[\u202F\u00A0]/g,' ');
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

export async function GET(_req: Request, context: any) {
  try {
    const { params } = await context;
    const id = params?.id as string;
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
        user:true 
      } 
    });
    if(!reservation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if(reservation.user?.email !== sessionEmail && !isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    if(reservation.status !== 'completed') return NextResponse.json({ error: 'not_completed' }, { status: 409 });

    const invoiceNumber = `FA-${new Date().getFullYear()}-${reservation.id.slice(-6)}`;
    const baseTotal = reservation.totalPrice || 0;
    const reservationData = reservation as any;
    const finalFuelAmount = reservationData.finalFuelAmount || 0; // Montant final du carburant
    
    // IMPORTANT: Le skipper et le carburant sont payés sur place
    // L'acompte de 20% ne s'applique QUE sur le prix du bateau + options (sans skipper ni carburant)
    // Le total final = bateau + options + skipper + carburant
    const total = baseTotal + finalFuelAmount; // Total avec carburant
    const deposit = reservation.depositAmount || 0; // Acompte sur bateau + options uniquement
    // Le solde payé = (bateau + options - acompte) + skipper + carburant (tous payés)
    const totalPaid = total; // puisque completed
    
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
    const skipperDays = (part==='FULL' || part==='SUNSET') ? Math.max(nbJours, 1) : 1;
    const skipperTotal = boatData?.skipperRequired ? (effectiveSkipperPrice * skipperDays) : 0;
    
    // IMPORTANT: Le skipper et le carburant sont payés sur place
    // L'acompte de 20% ne s'applique QUE sur le prix du bateau + options (sans skipper ni carburant)
    // Calculer le prix de base pour l'acompte (prix bateau + options, SANS skipper)
    const basePriceForDeposit = baseTotal - skipperTotal; // Prix bateau + options (sans skipper)
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

    // Header + logo
    let headerHeight = 110;
    try {
      const logoPath = path.join(process.cwd(),'public','cropped-LOGO-BB-yacht-ok_black-FEEL-THE-MEdierranean-247x82.png');
      const logoBytes = await fs.readFile(logoPath);
      const png = await pdfDoc.embedPng(logoBytes);
      const logoDims = png.scale(0.8);
      const logoX = 50;
      const logoY = height - 40 - logoDims.height;
      page.drawImage(png, { x: logoX, y: logoY, width: logoDims.width, height: logoDims.height });
      headerHeight = logoDims.height + 50;
    } catch {
      page.drawText(BRAND.name, { x:50, y: height-60, size: 32, font: fontBold, color: primary });
    }
    page.drawLine({ start:{ x:40, y: height - headerHeight - 10 }, end:{ x: width-40, y: height - headerHeight -10 }, thickness: 1, color: primary });

    const infoX = width - 240;
    page.drawText('Facture finale', { x: infoX, y: height - 60, size: 16, font: fontBold, color: primary });
    page.drawText(`N° ${invoiceNumber}`, { x: infoX, y: height - 78, size: 10, font, color: textMuted });
    page.drawText(`Date ${new Date().toLocaleDateString('fr-FR')}`, { x: infoX, y: height - 92, size: 10, font, color: textMuted });

    const brandMeta = `${BRAND.address}\n${BRAND.email} | ${BRAND.phone}`;
    brandMeta.split('\n').forEach((line,i)=>{
      page.drawText(sanitize(line), { x: 50, y: height - headerHeight - 30 - (i*12), size: 9, font, color: textMuted });
    });

    const TOP_MARGIN = 100;
    let y = height - headerHeight - TOP_MARGIN;
    const leftMargin = 50;

    const linesBox = (title:string, entries:string[], half=false) => {
      const boxTop = y;
      const boxWidth = half? (width/2 - leftMargin) : (width - leftMargin*2);
      let tempY = y;
      // simulate
      tempY -= 12 + 4; // title
      entries.forEach(()=> tempY -= 10 + 3);
      const boxBottom = tempY;
      page.drawRectangle({ x:leftMargin-10, y: boxBottom -10, width: boxWidth + 20, height: (boxTop-boxBottom)+20, color: half? lightGray: rgb(1,1,1), borderColor: borderGray, borderWidth: .6 });
      // draw
      page.drawText(title, { x:leftMargin, y: boxTop - 16, size:12, font: fontBold, color: primary });
      let cursor = boxTop - 12 - 4;
      entries.forEach(txt => {
        page.drawText(sanitize(txt), { x:leftMargin, y: cursor - 10, size:10, font, color: textDark });
        cursor -= 10 + 3;
      });
      y = boxBottom - 30; // update y
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

    // Tableau facture finale détaillé
    page.drawText('Détail des prestations', { x:leftMargin, y: y-12, size:12, font: fontBold, color: primary });
    y -= 24;
    const tableX1 = leftMargin;
    const tableXQty = width - 140;
    const tableXAmt = width - 80;
    page.drawLine({ start:{ x:tableX1, y:y }, end:{ x: width-leftMargin, y:y }, thickness:1, color: primary });
    y -= 14;
    page.drawText('Description', { x: tableX1, y: y, size:10, font: fontBold, color:textDark });
    page.drawText('Qté', { x: tableXQty, y: y, size:10, font: fontBold, color:textDark });
    page.drawText('Montant', { x: tableXAmt, y: y, size:10, font: fontBold, color:textDark });
    y -= 10;
    page.drawLine({ start:{ x:tableX1, y:y+4 }, end:{ x: width-leftMargin, y:y+4 }, thickness:0.5, color: lightGray });
    
    // Ligne 1: Prix de base
    page.drawText(sanitize(`Location bateau (${partLabel})`), { x: tableX1, y: y-2, size:10, font, color:textMuted });
    page.drawText('1', { x: tableXQty, y: y-2, size:10, font, color:textMuted });
    page.drawText(formatMoney(basePrice), { x: tableXAmt, y: y-2, size:10, font, color:textMuted });
    y -= 16;
    
    // Lignes options
    if(selectedOptions.length > 0){
      selectedOptions.forEach((opt:any) => {
        page.drawText(sanitize(`Option : ${opt.label}`), { x: tableX1, y: y-2, size:9, font, color:textMuted });
        page.drawText('1', { x: tableXQty, y: y-2, size:9, font, color:textMuted });
        page.drawText(formatMoney(opt.price || 0), { x: tableXAmt, y: y-2, size:9, font, color:textMuted });
        y -= 14;
      });
    }
    
    // Ligne skipper
    if(skipperTotal > 0){
      page.drawText(sanitize(`Skipper obligatoire (${effectiveSkipperPrice}€ × ${skipperDays}j)`), { x: tableX1, y: y-2, size:10, font, color:textMuted });
      page.drawText('1', { x: tableXQty, y: y-2, size:10, font, color:textMuted });
      page.drawText(formatMoney(skipperTotal), { x: tableXAmt, y: y-2, size:10, font, color:textMuted });
      y -= 16;
    }
    
    // Ligne séparatrice
    page.drawLine({ start:{ x:tableX1, y:y+2 }, end:{ x: width-leftMargin, y:y+2 }, thickness:0.5, color: lightGray });
    y -= 8;
    
    // Total hors carburant
    page.drawText('Total hors carburant', { x: tableX1, y: y-2, size:10, font: fontBold, color: textDark });
    page.drawText('', { x: tableXQty, y: y-2, size:10, font, color: textDark });
    page.drawText(formatMoney(baseTotal), { x: tableXAmt, y: y-2, size:10, font: fontBold, color: textDark });
    y -= 16;
    
    // Ligne carburant (si défini)
    if(finalFuelAmount > 0){
      page.drawText('Carburant consommé', { x: tableX1, y: y-2, size:10, font, color:textMuted });
      page.drawText('1', { x: tableXQty, y: y-2, size:10, font, color:textMuted });
      page.drawText(formatMoney(finalFuelAmount), { x: tableXAmt, y: y-2, size:10, font, color:textMuted });
      y -= 16;
      page.drawLine({ start:{ x:tableX1, y:y+2 }, end:{ x: width-leftMargin, y:y+2 }, thickness:0.5, color: lightGray });
      y -= 8;
    }
    
    // Total final
    page.drawText('Total final', { x: tableX1, y: y-2, size:11, font: fontBold, color: primary });
    page.drawText('', { x: tableXQty, y: y-2, size:11, font, color: primary });
    page.drawText(formatMoney(total), { x: tableXAmt, y: y-2, size:11, font: fontBold, color: primary });
    y -= 20;
    
    // Ligne acompte déjà payé
    page.drawText('Acompte déjà payé (20% sur bateau + options)', { x: tableX1, y: y-2, size:10, font, color:textMuted });
    page.drawText('1', { x: tableXQty, y: y-2, size:10, font, color:textMuted });
    page.drawText('-'+formatMoney(deposit), { x: tableXAmt, y: y-2, size:10, font, color:textMuted });
    y -= 16;
    
    // Ligne solde payé (bateau + options - acompte)
    const remainingBoatOptions = Math.max(basePriceForDeposit - deposit, 0);
    page.drawText('Solde payé (bateau + options)', { x: tableX1, y: y-2, size:10, font, color:textMuted });
    page.drawText('1', { x: tableXQty, y: y-2, size:10, font, color:textMuted });
    page.drawText(formatMoney(remainingBoatOptions), { x: tableXAmt, y: y-2, size:10, font, color:textMuted });
    y -= 16;
    
    // Ligne skipper payé sur place
    if(skipperTotal > 0){
      page.drawText('Skipper (payé sur place)', { x: tableX1, y: y-2, size:10, font, color:textMuted });
      page.drawText('1', { x: tableXQty, y: y-2, size:10, font, color:textMuted });
      page.drawText(formatMoney(skipperTotal), { x: tableXAmt, y: y-2, size:10, font, color:textMuted });
      y -= 16;
    }
    
    // Ligne carburant payé sur place
    if(finalFuelAmount > 0){
      page.drawText('Carburant (payé sur place)', { x: tableX1, y: y-2, size:10, font, color:textMuted });
      page.drawText('1', { x: tableXQty, y: y-2, size:10, font, color:textMuted });
      page.drawText(formatMoney(finalFuelAmount), { x: tableXAmt, y: y-2, size:10, font, color:textMuted });
    }
    y -= 12;
    page.drawLine({ start:{ x:tableX1, y:y }, end:{ x: width-leftMargin, y:y }, thickness:0.5, color: lightGray });
    y -= 20;

    // Récap
    const recapX = width - 230;
    const recapWidth = 180;
    // Calculer la hauteur selon le nombre de lignes
    let recapLinesCount = 3; // Total bateau + options, Total contrat, Acompte payé, Solde payé
    if(skipperTotal > 0) recapLinesCount++;
    if(finalFuelAmount > 0) recapLinesCount++;
    const recapHeight = recapLinesCount * 14 + 20;
    page.drawRectangle({ x: recapX-10, y: y-recapHeight, width: recapWidth, height: recapHeight, color: rgb(1,1,1), borderColor: borderGray, borderWidth: .6 });
    let ry = y - 24;
    const recapLine = (label:string, value:string, bold=false) => {
      page.drawText(sanitize(label), { x:recapX, y: ry, size:9, font: bold? fontBold: font, color:textDark });
      page.drawText(sanitize(value), { x: recapX + recapWidth - 85, y: ry, size:9, font: bold? fontBold: font, color:textDark });
      ry -= 14;
    };
    recapLine('Total bateau + options', formatMoney(basePriceForDeposit));
    if(skipperTotal > 0){
      recapLine('Skipper (payé sur place)', formatMoney(skipperTotal));
    }
    if(finalFuelAmount > 0){
      recapLine('Carburant (payé sur place)', formatMoney(finalFuelAmount));
    }
    recapLine('Total contrat', formatMoney(total), true);
    recapLine('Acompte payé (20%)', formatMoney(deposit));
    recapLine('Solde payé', formatMoney(totalPaid - deposit), true);
    y -= recapHeight + 20;

    // ===== Informations de paiement =====
    if (y < 180) {
      page = pdfDoc.addPage();
      y = height - 50;
    }
    
    const paymentEntries = [
      `Réservation créée le : ${reservation.createdAt.toLocaleDateString('fr-FR')}`,
      ...(reservation.depositPaidAt ? [`Acompte payé le : ${reservation.depositPaidAt.toLocaleDateString('fr-FR')}`] : []),
      ...(reservation.completedAt ? [`Prestation terminée le : ${reservation.completedAt.toLocaleDateString('fr-FR')}`] : []),
      ...(reservation.stripePaymentIntentId ? [`Paiement par carte bancaire`] : []),
      `Statut : Facture acquittée`
    ];
    linesBox('Informations de paiement', paymentEntries);

    // ===== Mentions légales =====
    // Vérifier qu'on a assez d'espace avant de dessiner
    if (y < 120) {
      page = pdfDoc.addPage();
      y = height - 50;
    }
    
    page.drawText('Conditions et mentions légales', { x:leftMargin, y: y-12, size:11, font: fontBold, color: primary });
    y -= 24;
    
    drawWrapped('✓ Facture acquittée - Paiement total reçu. Merci pour votre confiance.', 9, rgb(0.0, 0.6, 0.0), leftMargin, width-leftMargin*2, true, 4);
    
    if(finalFuelAmount > 0){
      drawWrapped("• Le montant du carburant a été ajusté selon la consommation réelle de la prestation.", 8, textMuted, leftMargin, width-leftMargin*2, false, 3);
    } else {
      drawWrapped("• Le prix final a été ajusté en fonction du coût réel du carburant consommé pendant la prestation.", 8, textMuted, leftMargin, width-leftMargin*2, false, 3);
    }
    
    if(boatData?.skipperRequired) {
      drawWrapped("• Prestation effectuée avec skipper professionnel conformément aux exigences de sécurité maritime.", 8, textMuted, leftMargin, width-leftMargin*2, false, 3);
    }
    
    drawWrapped("• Cette facture fait foi du paiement intégral de la prestation de location de bateau.", 8, textMuted, leftMargin, width-leftMargin*2, false, 3);
    drawWrapped("• Pour toute question ou réclamation, contactez-nous à charter@bb-yachts.com dans les 30 jours.", 8, textMuted, leftMargin, width-leftMargin*2, false, 3);
    
    y -= 10;
    drawWrapped("Document généré automatiquement - valable sans signature.", 7, textMuted, leftMargin, width-leftMargin*2, false, 2);

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), { status:200, headers:{ 'Content-Type':'application/pdf', 'Content-Disposition':`inline; filename="${invoiceNumber}.pdf"` }});
  } catch(e:any){
    console.error(e);
    return NextResponse.json({ error:'server_error' }, { status:500 });
  }
}
