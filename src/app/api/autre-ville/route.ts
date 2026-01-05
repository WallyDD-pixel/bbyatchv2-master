import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    
    // Récupérer les données du formulaire
    const ville = (form.get('ville') || '').toString().trim();
    const passagers = form.get('passagers')?.toString();
    const experience = (form.get('experience') || '').toString().trim();
    const part = (form.get('part') || '').toString();
    const startDate = (form.get('startDate') || '').toString();
    const endDate = (form.get('endDate') || '').toString();
    const message = (form.get('message') || '').toString().trim();
    const email = (form.get('email') || '').toString().trim();
    const tel = (form.get('tel') || '').toString().trim() || null;
    const boatId = form.get('boatId')?.toString();
    
    // Validation des champs requis
    if (!ville || !experience || !message || !email || !part || !startDate) {
      return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
    }
    
    // Construire un message structuré avec toutes les informations
    const structuredMessage = [
      `📍 Ville/Port: ${ville}`,
      `📅 Dates: ${startDate}${endDate && endDate !== startDate ? ` → ${endDate}` : ''}`,
      `⏰ Créneau: ${part === 'FULL' ? 'Journée entière' : part === 'AM' ? 'Matin' : 'Après-midi'}`,
      `👥 Nombre de personnes: ${passagers || 'Non spécifié'}`,
      `🎯 Type d'expérience: ${experience}`,
      boatId ? `🚤 Bateau sélectionné (ID): ${boatId}` : '',
      '',
      `💬 Message:`,
      message,
    ].filter(Boolean).join('\n');
    
    // Stocker dans ContactMessage avec sourcePage="autre-ville"
    await (prisma as any).contactMessage.create({
      data: {
        name: ville, // Utiliser la ville comme nom pour faciliter l'identification
        email,
        phone: tel,
        message: structuredMessage,
        locale: 'fr', // Par défaut, peut être amélioré
        sourcePage: 'autre-ville',
      },
    });
    
    // Redirection vers la page d'accueil avec un message de succès
    const host = req.headers.get('host') || 'localhost:3000';
    const proto = host.startsWith('localhost') ? 'http' : 'https';
    const origin =
      (process.env as any).APP_BASE_URL ||
      (process.env as any).NEXTAUTH_URL ||
      `${proto}://${host}`;
    
    return NextResponse.redirect(`${origin}/?autre-ville-sent=1`, 303);
  } catch (e: any) {
    console.error('Error saving autre-ville request:', e);
    return NextResponse.json({ ok: false, error: 'server_error', details: e?.message }, { status: 500 });
  }
}

