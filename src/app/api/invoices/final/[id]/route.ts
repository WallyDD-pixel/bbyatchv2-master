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
  currency: 'EUR'
} as const;

function formatMoney(v: number){
  const raw = new Intl.NumberFormat('fr-FR',{ style:'currency', currency: BRAND.currency }).format(v||0);
  return raw.replace(/[\u202F\u00A0]/g,' ');
}
function sanitize(text: string){
  return (text||'')
    .replace(/→/g,'->')
    .replace(/–/g,'-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u00A0\u202F]/g,' ')
    .replace(/[\u200B-\u200D\uFEFF]/g,'');
}

export async function GET(_req: Request, context: any) {
  try {
    const { params } = context;
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
    const reservation = await prisma.reservation.findUnique({ where: { id }, include:{ boat:true, user:true } });
    if(!reservation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if(reservation.user?.email !== sessionEmail && !isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    if(reservation.status !== 'completed') return NextResponse.json({ error: 'not_completed' }, { status: 409 });

    const invoiceNumber = `FA-${new Date().getFullYear()}-${reservation.id.slice(-6)}`;
    const total = reservation.totalPrice || 0;
    const deposit = reservation.depositAmount || 0;
    const balance = Math.max(total - deposit, 0);
    const totalPaid = total; // puisque completed

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primary = rgb(0.05,0.15,0.32);
    const lightGray = rgb(0.94,0.95,0.97);
    const borderGray = rgb(0.80,0.82,0.85);
    const textDark = rgb(0.10,0.10,0.12);
    const textMuted = rgb(0.40,0.42,0.46);

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
    if(reservation.user?.address){
      clientEntries.push(reservation.user.address);
      const cityLine = [reservation.user.zip, reservation.user.city].filter(Boolean).join(' ');
      if(cityLine) clientEntries.push(cityLine);
      if(reservation.user.country) clientEntries.push(reservation.user.country);
    }
    linesBox('Client', clientEntries, true);

    // Bloc réservation (plein)
    const meta = (()=>{ try { return reservation.metadata? JSON.parse(reservation.metadata): null; } catch { return null; } })();
    const start = reservation.startDate.toISOString().slice(0,10);
    const end = reservation.endDate.toISOString().slice(0,10);
    const part = reservation.part || 'FULL';
    const partLabel = part==='FULL'? 'Journée entière' : part==='AM'? 'Matin' : 'Après-midi';
    const dateDisplay = start + (end!==start? ' -> ' + end : '');
    const resEntries = [
      `Bateau : ${reservation.boat?.name||''}`,
      ...(meta?.experienceTitleFr || meta?.expSlug ? [`Expérience : ${meta.experienceTitleFr || meta.expSlug}`] : []),
      `Dates : ${dateDisplay}`,
      `Partie : ${partLabel}`,
      reservation.passengers? `Passagers : ${reservation.passengers}` : ''
    ].filter(Boolean) as string[];
    linesBox('Détails de la réservation', resEntries);

    // Tableau facture finale
    page.drawText('Lignes', { x:leftMargin, y: y-12, size:12, font: fontBold, color: primary });
    y -= 24;
    const tableX1 = leftMargin;
    const tableXQty = width - 140;
    const tableXAmt = width - 80;
    page.drawLine({ start:{ x:tableX1, y:y }, end:{ x: width-leftMargin, y:y }, thickness:1, color: primary });
    y -= 14;
    page.drawText('Description', { x: tableX1, y: y, size:10, font, color:textDark });
    page.drawText('Qté', { x: tableXQty, y: y, size:10, font, color:textDark });
    page.drawText('Montant', { x: tableXAmt, y: y, size:10, font, color:textDark });
    y -= 10;
    page.drawLine({ start:{ x:tableX1, y:y+4 }, end:{ x: width-leftMargin, y:y+4 }, thickness:0.5, color: lightGray });
    // Ligne 1: Location
    page.drawText(sanitize(`Location ${reservation.boat?.name||''}${meta?.experienceTitleFr? ' – '+meta.experienceTitleFr:''}`), { x: tableX1, y: y-2, size:10, font, color:textMuted });
    page.drawText('1', { x: tableXQty, y: y-2, size:10, font, color:textMuted });
    page.drawText(formatMoney(total), { x: tableXAmt, y: y-2, size:10, font, color:textMuted });
    y -= 16;
    // Ligne 2: Acompte déjà payé (affiché négatif pour lisibilité)
    page.drawText('Acompte déjà payé', { x: tableX1, y: y-2, size:10, font, color:textMuted });
    page.drawText('1', { x: tableXQty, y: y-2, size:10, font, color:textMuted });
    page.drawText('-'+formatMoney(deposit), { x: tableXAmt, y: y-2, size:10, font, color:textMuted });
    y -= 16;
    // Ligne 3: Solde payé
    page.drawText('Solde payé', { x: tableX1, y: y-2, size:10, font, color:textMuted });
    page.drawText('1', { x: tableXQty, y: y-2, size:10, font, color:textMuted });
    page.drawText(formatMoney(balance), { x: tableXAmt, y: y-2, size:10, font, color:textMuted });
    y -= 12;
    page.drawLine({ start:{ x:tableX1, y:y }, end:{ x: width-leftMargin, y:y }, thickness:0.5, color: lightGray });
    y -= 20;

    // Récap
    const recapX = width - 230;
    const recapWidth = 180;
    page.drawRectangle({ x: recapX-10, y: y-80, width: recapWidth, height: 80, color: rgb(1,1,1), borderColor: borderGray, borderWidth: .6 });
    let ry = y - 24;
    const recapLine = (label:string, value:string, bold=false) => {
      page.drawText(sanitize(label), { x:recapX, y: ry, size:9, font: bold? fontBold: font, color:textDark });
      page.drawText(sanitize(value), { x: recapX + recapWidth - 85, y: ry, size:9, font: bold? fontBold: font, color:textDark });
      ry -= 14;
    };
    recapLine('Total contrat', formatMoney(total), true);
    recapLine('Total payé', formatMoney(totalPaid));
    recapLine('Solde restant', formatMoney(0), true);
    y -= 100;

    page.drawText('Facture acquittée - Paiement total reçu.', { x:leftMargin, y: y, size:9, font, color: primary });
    y -= 14;
    page.drawText("Document généré automatiquement - valable sans signature.", { x:leftMargin, y: y, size:8, font, color: textMuted });

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), { status:200, headers:{ 'Content-Type':'application/pdf', 'Content-Disposition':`inline; filename="${invoiceNumber}.pdf"` }});
  } catch(e:any){
    console.error(e);
    return NextResponse.json({ error:'server_error' }, { status:500 });
  }
}
