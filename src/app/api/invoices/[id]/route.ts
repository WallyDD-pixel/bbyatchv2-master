import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
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

    const session = await getServerSession(auth as any) as any;
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
        user: true 
      } 
    });
    if(!reservation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if(reservation.user?.email !== sessionEmail && !isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const invoiceNumber = `AC-${new Date().getFullYear()}-${reservation.id.slice(-6)}`;
    const deposit = reservation.depositAmount || 0;
    const total = reservation.totalPrice || 0;
    const remaining = reservation.remainingAmount || Math.max(total - deposit, 0);
    
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
    
    // Calculer le prix de base (sans options ni skipper)
    // On estime en soustrayant le skipper du total (les options sont déjà dans le total)
    const basePrice = total - skipperTotal;
    
    // Récupérer les options sélectionnées (si stockées dans metadata)
    const selectedOptionIds = meta?.optionIds || [];
    const selectedOptions = (reservation.boat?.options || []).filter((o:any) => selectedOptionIds.includes(o.id));
    const optionsTotal = selectedOptions.reduce((sum:number, o:any) => sum + (o.price || 0), 0);

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

    // ====== HEADER BLANC AVEC LOGO ======
    let headerHeight = 110;
    let logoPlacedHeight = 0;
    try {
      const logoPath = path.join(process.cwd(),'public','cropped-LOGO-BB-yacht-ok_black-FEEL-THE-MEdierranean-247x82.png');
      const logoBytes = await fs.readFile(logoPath);
      const png = await pdfDoc.embedPng(logoBytes);
      const logoDims = png.scale(0.8); // augmenté (0.55 -> 0.8)
      const logoX = 50;
      const logoY = height - 40 - logoDims.height; // petit top margin
      page.drawImage(png, { x: logoX, y: logoY, width: logoDims.width, height: logoDims.height });
      logoPlacedHeight = logoDims.height + 50; // espace total utilisé
      headerHeight = logoPlacedHeight;
    } catch(e) {
      // fallback: texte si logo absent
      page.drawText(BRAND.name, { x:50, y: height-60, size: 32, font: fontBold, color: primary });
      logoPlacedHeight = 60;
    }

    // Ligne fine sous header
    page.drawLine({ start:{ x:40, y: height - headerHeight - 10 }, end:{ x: width-40, y: height - headerHeight -10 }, thickness: 1, color: primary });

    // Infos facture (à droite du logo)
    const infoX = width - 220;
    page.drawText("Facture d'acompte", { x: infoX, y: height - 60, size: 16, font: fontBold, color: primary });
    page.drawText(`N° ${invoiceNumber}`, { x: infoX, y: height - 78, size: 10, font, color: textMuted });
    page.drawText(`Date ${new Date().toLocaleDateString('fr-FR')}`, { x: infoX, y: height - 92, size: 10, font, color: textMuted });

    // Coordonnées société sous la ligne
    const brandMeta = `${BRAND.address}\n${BRAND.email} | ${BRAND.phone}`;
    brandMeta.split('\n').forEach((line,i)=>{
      page.drawText(sanitize(line), { x: 50, y: height - headerHeight - 30 - (i*12), size: 9, font, color: textMuted });
    });

    // Point de départ du contenu principal
    const TOP_MARGIN = 100; // distance totale depuis le haut après header et meta
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

    // ===== Bloc Client =====
    const clientBoxTop = y;
    const clientBoxWidth = width/2 - leftMargin;
    const clientName = reservation.user?.name || `${reservation.user?.firstName||''} ${reservation.user?.lastName||''}`.trim() || reservation.user?.email || '';
    // On collecte d'abord les lignes pour pouvoir dessiner le rectangle dessous
    const clientLines: { text:string; size:number; color:any; bold?:boolean; gap:number }[] = [];
    clientLines.push({ text: 'Client', size:12, color: primary, bold:true, gap:4 });
    clientLines.push({ text: clientName, size:10, color: textDark, bold:true, gap:2 });
    if(reservation.user?.email) clientLines.push({ text: reservation.user.email, size:9, color: textMuted, gap:2 });
    if(reservation.user?.address){
      clientLines.push({ text: reservation.user.address, size:9, color: textMuted, gap:2 });
      const cityLine = [reservation.user.zip, reservation.user.city].filter(Boolean).join(' ');
      if(cityLine) clientLines.push({ text: cityLine, size:9, color: textMuted, gap:2 });
      if(reservation.user.country) clientLines.push({ text: reservation.user.country, size:9, color: textMuted, gap:2 });
    }
    // Calcul hauteur
    let tempY = y;
    clientLines.forEach(l=>{ tempY -= l.size + l.gap; });
    const clientBoxBottom = tempY;
    // Rectangle (léger fond gris très clair)
    page.drawRectangle({
      x: leftMargin-10,
      y: clientBoxBottom - 10,
      width: clientBoxWidth + 20,
      height: (clientBoxTop - clientBoxBottom) + 20,
      color: lightGray,
      borderColor: borderGray,
      borderWidth: 0.6
    });
    // Écriture des lignes par dessus
    let lineY = clientBoxTop;
    clientLines.forEach(l=>{
      page.drawText(sanitize(l.text), { x: leftMargin, y: lineY - l.size - 4, size: l.size, font: l.bold? fontBold: font, color: l.color });
      lineY -= l.size + l.gap;
    });
    y = clientBoxBottom - 30;

    // ===== Bloc Réservation =====
    const resBoxTop = y;
    const resLines: { text:string; size:number; color:any; bold?:boolean; gap:number }[] = [];
    resLines.push({ text: 'Détails de la réservation', size:12, color: primary, bold:true, gap:4 });
    const start = reservation.startDate.toISOString().slice(0,10);
    const end = reservation.endDate.toISOString().slice(0,10);
    const dateDisplay = start + (end!==start? ' -> ' + end : '');
    resLines.push({ text: `Bateau : ${reservation.boat?.name||''}`, size:10, color:textDark, gap:3 });
    if(meta?.experienceTitleFr || meta?.expSlug){
      resLines.push({ text: `Expérience : ${meta.experienceTitleFr || meta.expSlug}`, size:10, color:textDark, gap:3 });
    }
    resLines.push({ text: `Dates : ${dateDisplay}`, size:10, color:textDark, gap:3 });
    resLines.push({ text: `Type de prestation : ${partLabel}`, size:10, color:textDark, gap:3 });
    if(reservation.passengers) resLines.push({ text: `Nombre de passagers : ${reservation.passengers}`, size:10, color:textDark, gap:3 });
    if(meta?.childrenCount) resLines.push({ text: `Enfants à bord : ${meta.childrenCount}`, size:10, color:textDark, gap:3 });
    if(meta?.specialNeeds) resLines.push({ text: `Demande spécifique : ${meta.specialNeeds}`, size:9, color:textMuted, gap:2 });
    // Calcul hauteur réservation
    tempY = y;
    resLines.forEach(l=>{ tempY -= l.size + l.gap; });
    const resBoxBottom = tempY;
    page.drawRectangle({
      x: leftMargin-10,
      y: resBoxBottom - 10,
      width: width - (leftMargin*2) + 20,
      height: (resBoxTop - resBoxBottom) + 20,
      color: rgb(1,1,1),
      borderColor: lightGray,
      borderWidth: 1
    });
    // Écriture des lignes réservation
    lineY = resBoxTop;
    resLines.forEach(l=>{
      page.drawText(sanitize(l.text), { x: leftMargin, y: lineY - l.size - 4, size: l.size, font: l.bold? fontBold: font, color: l.color });
      lineY -= l.size + l.gap;
    });

    y = resBoxBottom - 40;

    // ===== Tableau détaillé =====
    draw('Détail des prestations', 12, primary, leftMargin, true); y -= 5;
    const tableX1 = leftMargin;
    const tableXQty = width - 120;
    const tableXAmt = width - 70;
    page.drawLine({ start:{ x:tableX1, y:y }, end:{ x: width-leftMargin, y:y }, thickness:1, color: primary });
    y -= 14;
    page.drawText('Description', { x: tableX1, y: y, size:10, font: fontBold, color: textDark });
    page.drawText('Qté', { x: tableXQty, y: y, size:10, font: fontBold, color: textDark });
    page.drawText('Montant', { x: tableXAmt, y: y, size:10, font: fontBold, color: textDark });
    y -= 10;
    page.drawLine({ start:{ x:tableX1, y:y+4 }, end:{ x: width-leftMargin, y:y+4 }, thickness:0.5, color: lightGray });
    
    // Ligne 1: Prix de base
    page.drawText(sanitize(`Location bateau (${partLabel})`), { x: tableX1, y: y-2, size:10, font, color: textMuted });
    page.drawText('1', { x: tableXQty, y: y-2, size:10, font, color: textMuted });
    page.drawText(formatMoney(basePrice), { x: tableXAmt, y: y-2, size:10, font, color: textMuted });
    y -= 16;
    
    // Lignes options
    if(selectedOptions.length > 0){
      selectedOptions.forEach((opt:any) => {
        page.drawText(sanitize(`Option : ${opt.label}`), { x: tableX1, y: y-2, size:9, font, color: textMuted });
        page.drawText('1', { x: tableXQty, y: y-2, size:9, font, color: textMuted });
        page.drawText(formatMoney(opt.price || 0), { x: tableXAmt, y: y-2, size:9, font, color: textMuted });
        y -= 14;
      });
    }
    
    // Ligne skipper
    if(skipperTotal > 0){
      page.drawText(sanitize(`Skipper obligatoire (${effectiveSkipperPrice}€ × ${skipperDays}j)`), { x: tableX1, y: y-2, size:10, font, color: textMuted });
      page.drawText('1', { x: tableXQty, y: y-2, size:10, font, color: textMuted });
      page.drawText(formatMoney(skipperTotal), { x: tableXAmt, y: y-2, size:10, font, color: textMuted });
      y -= 16;
    }
    
    // Ligne séparatrice
    page.drawLine({ start:{ x:tableX1, y:y+2 }, end:{ x: width-leftMargin, y:y+2 }, thickness:0.5, color: lightGray });
    y -= 8;
    
    // Total hors carburant
    page.drawText('Total hors carburant', { x: tableX1, y: y-2, size:10, font: fontBold, color: textDark });
    page.drawText('', { x: tableXQty, y: y-2, size:10, font, color: textDark });
    page.drawText(formatMoney(total), { x: tableXAmt, y: y-2, size:10, font: fontBold, color: textDark });
    y -= 25;

    // ===== Récapitulatif =====
    const recapX = width - 230;
    const recapWidth = 180;
    const recapHeight = 70;
    // Vérifier qu'on a assez d'espace pour le récapitulatif
    if (y - recapHeight < 100) {
      page = pdfDoc.addPage();
      y = height - 50;
    }
    page.drawRectangle({ x: recapX-10, y: y-recapHeight, width: recapWidth, height: recapHeight, color: rgb(1,1,1), borderColor: borderGray, borderWidth: 0.6 });
    let recapY = y - 20;
    const writeRecap = (label:string, value:string, bold=false) => {
      page.drawText(sanitize(label), { x: recapX, y: recapY, size: 9, font: bold? fontBold: font, color: textDark });
      page.drawText(sanitize(value), { x: recapX + recapWidth - 80, y: recapY, size: 9, font: bold? fontBold: font, color: textDark });
      recapY -= 14;
    };
    writeRecap('Acompte payé', formatMoney(deposit), true);
    writeRecap('Total contrat', formatMoney(total));
    writeRecap('Reste à payer', formatMoney(remaining), true);
    y -= 90;

    // ===== Mentions =====
    // Vérifier qu'on a assez d'espace avant de dessiner
    if (y < 100) {
      // Si on manque d'espace, créer une nouvelle page
      page = pdfDoc.addPage();
      y = height - 50;
    }
    drawWrapped("Cette facture d'acompte confirme la réception de votre paiement. Le solde devra être réglé avant ou le jour de l'embarquement.",8,textMuted,leftMargin,width-leftMargin*2,false,3);
    drawWrapped("[!] IMPORTANT : Le prix final sera ajusté en fonction du coût réel du carburant consommé à la fin de la location.",8,textMuted,leftMargin,width-leftMargin*2,false,3);
    drawWrapped('Document généré automatiquement - valable sans signature.',8,textMuted,leftMargin,width-leftMargin*2,false,3);

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), { status:200, headers:{ 'Content-Type':'application/pdf', 'Content-Disposition':`inline; filename="${invoiceNumber}.pdf"` }});
  } catch(e:any){
    console.error(e);
    return NextResponse.json({ error:'server_error' }, { status:500 });
  }
}
