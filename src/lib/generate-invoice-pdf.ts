import { prisma } from './prisma';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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
  const charMap: Record<string, string> = {
    '→': '->', '–': '-', '—': '-', '…': '...', '⚠': '[!]', '€': 'EUR',
    '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"',
    '\u00A0': ' ', '\u202F': ' ',
  };
  let result = text;
  for (const [char, replacement] of Object.entries(charMap)) {
    result = result.replace(new RegExp(char, 'g'), replacement);
  }
  result = result.replace(/[\u200B-\u200D\uFEFF]/g, '');
  return result;
}

/**
 * Génère un PDF de facture en mémoire (Buffer) pour une réservation
 */
export async function generateInvoicePDF(reservationId: string): Promise<Buffer | null> {
  try {
    const reservation = await prisma.reservation.findUnique({ 
      where: { id: reservationId }, 
      include: { 
        boat: { include: { options: true } }, 
        user: true 
      } 
    });
    
    if(!reservation) return null;

    const invoiceNumber = `AC-${new Date().getFullYear()}-${reservation.id.slice(-6)}`;
    const deposit = reservation.depositAmount || 0;
    const total = reservation.totalPrice || 0;
    const remaining = reservation.remainingAmount || 0;
    
    const meta = (()=>{ try { return reservation.metadata? JSON.parse(reservation.metadata): null; } catch { return null; } })();
    
    const part = reservation.part || 'FULL';
    const partLabel = part==='FULL'? 'Journée entière' : part==='AM'? 'Matin' : part==='PM'? 'Après-midi' : part==='SUNSET'? 'Sunset (2h)' : part;
    const nbJours = (()=>{ 
      const s = new Date(reservation.startDate); 
      const e = new Date(reservation.endDate); 
      return Math.round((e.getTime()-s.getTime())/86400000)+1; 
    })();
    
    const settings = await prisma.settings.findFirst() as any;
    const defaultSkipperPrice = settings?.defaultSkipperPrice || 350;
    const boatData = reservation.boat as any;
    const effectiveSkipperPrice = boatData?.skipperPrice ?? defaultSkipperPrice;
    
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const leftMargin = 50;
    const rightMargin = width - 50;
    const topMargin = 750;
    
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    
    const primary = rgb(0.12, 0.25, 0.69);
    const textDark = rgb(0.1, 0.1, 0.1);
    const textMuted = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.95, 0.95, 0.95);
    const borderGray = rgb(0.8, 0.8, 0.8);
    
    let y = topMargin;
    
    // Header
    page.drawText(sanitize(BRAND.name), { x: leftMargin, y, size: 24, font: fontBold, color: primary });
    y -= 30;
    page.drawText(sanitize(BRAND.address), { x: leftMargin, y, size: 10, font, color: textMuted });
    y -= 12;
    page.drawText(sanitize(`Email: ${BRAND.email}`), { x: leftMargin, y, size: 9, font, color: textMuted });
    y -= 12;
    page.drawText(sanitize(`Tél: ${BRAND.phone}`), { x: leftMargin, y, size: 9, font, color: textMuted });
    y -= 25;
    
    // Invoice number
    page.drawText(sanitize(`Facture N° ${invoiceNumber}`), { x: leftMargin, y, size: 14, font: fontBold, color: primary });
    y -= 20;
    
    // Client box
    const clientName = reservation.user?.name || `${reservation.user?.firstName||''} ${reservation.user?.lastName||''}`.trim() || reservation.user?.email || '';
    const clientBoxTop = y;
    const clientBoxWidth = width/2 - leftMargin - 20;
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
    
    // Reservation details
    const start = reservation.startDate.toISOString().slice(0,10);
    const end = reservation.endDate.toISOString().slice(0,10);
    page.drawText(sanitize('Détails de la réservation'), { x: leftMargin, y, size: 11, font: fontBold, color: primary });
    y -= 15;
    page.drawText(sanitize(`Bateau: ${reservation.boat?.name || '—'}`), { x: leftMargin, y, size: 9, font, color: textDark });
    y -= 12;
    page.drawText(sanitize(`Dates: ${start} → ${end} (${nbJours} jour${nbJours>1?'s':''})`), { x: leftMargin, y, size: 9, font, color: textDark });
    y -= 12;
    page.drawText(sanitize(`Créneau: ${partLabel}`), { x: leftMargin, y, size: 9, font, color: textDark });
    y -= 12;
    if(reservation.passengers) {
      page.drawText(sanitize(`Passagers: ${reservation.passengers}`), { x: leftMargin, y, size: 9, font, color: textDark });
      y -= 12;
    }
    y -= 10;
    
    // Amounts
    page.drawText(sanitize('Montants'), { x: leftMargin, y, size: 11, font: fontBold, color: primary });
    y -= 15;
    page.drawText(sanitize(`Acompte (20%): ${formatMoney(deposit)}`), { x: leftMargin, y, size: 10, font: fontBold, color: textDark });
    y -= 12;
    if(remaining > 0) {
      page.drawText(sanitize(`Reste à payer: ${formatMoney(remaining)}`), { x: leftMargin, y, size: 9, font, color: textMuted });
      y -= 12;
    }
    page.drawText(sanitize(`Total: ${formatMoney(total)}`), { x: leftMargin, y, size: 10, font: fontBold, color: primary });
    y -= 20;
    
    // Footer
    page.drawText(sanitize('Merci pour votre confiance !'), { x: leftMargin, y, size: 10, font: fontBold, color: primary });
    y -= 15;
    page.drawText(sanitize('Le skipper et le carburant sont payés sur place.'), { x: leftMargin, y, size: 8, font, color: textMuted });
    
    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return null;
  }
}
