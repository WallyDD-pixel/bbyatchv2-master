import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadMultipleToSupabase } from '@/lib/storage';
import { createRedirectUrl } from '@/lib/redirect';

export const runtime = 'nodejs';

async function ensureAdmin() {
  const session = await getServerSession(auth as any) as any;
  if (!session?.user || (session.user as any).role !== 'admin') return null;
  return session.user;
}

export async function POST(req: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  
  try {
    const data = await req.formData();
    const titleFr = String(data.get('titleFr') || '').trim() || null;
    const titleEn = String(data.get('titleEn') || '').trim() || null;
    const contentFr = String(data.get('contentFr') || '').trim() || null;
    const contentEn = String(data.get('contentEn') || '').trim() || null;
    const videoUrl = String(data.get('videoUrl') || '').trim() || null;
    const sortRaw = String(data.get('sort') || '0');
    const sort = parseInt(sortRaw, 10) || 0;

    // Upload de l'image vers Supabase Storage (si fichier fourni)
    const file = data.get('imageFile') as File | null;
    let imageUrl: string | null = null;
    
    if (file && file.size > 0 && (file as any).arrayBuffer) {
      try {
        const result = await uploadMultipleToSupabase([file], 'gallery');
        if (result.length > 0) {
          imageUrl = result[0];
          // Vérifier que l'URL est valide (doit pointer vers Supabase, pas /uploads/)
          if (imageUrl && (imageUrl.startsWith('/uploads/') || !imageUrl.includes('supabase.co'))) {
            console.error('Invalid image URL returned:', imageUrl);
            return NextResponse.json({ error: 'upload_failed', details: 'Invalid URL returned from storage' }, { status: 500 });
          }
        }
      } catch (e) {
        console.error('Error uploading to Supabase Storage:', e);
        return NextResponse.json({ error: 'upload_failed', details: String(e) }, { status: 500 });
      }
    }

    // Au moins une image ou une vidéo doit être fournie
    if (!imageUrl && !videoUrl) {
      return NextResponse.json({ error: 'missing_media', details: 'Image or video is required' }, { status: 400 });
    }

    // Si pas d'image mais vidéo, utiliser une image placeholder ou laisser null (selon le schéma, imageUrl est requis)
    // Pour l'instant, on va utiliser une URL placeholder si seulement vidéo
    const finalImageUrl = imageUrl || (videoUrl ? 'https://via.placeholder.com/800x600?text=Video' : null);
    
    if (!finalImageUrl) {
      return NextResponse.json({ error: 'missing_media', details: 'Image or video is required' }, { status: 400 });
    }
    
    if (imageUrl) {
      console.log('Image uploaded successfully to:', imageUrl);
    }

    // Créer l'image/vidéo dans la base de données
    const created = await (prisma as any).galleryImage.create({
      data: {
        imageUrl: finalImageUrl,
        videoUrl,
        titleFr,
        titleEn,
        contentFr,
        contentEn,
        sort,
      }
    });

    const redirectUrl = createRedirectUrl(`/admin/gallery?created=${created.id}`, req);
    return NextResponse.redirect(redirectUrl, 303);
  } catch (e: any) {
    console.error('Error creating gallery image:', e);
    return NextResponse.json({ error: 'server_error', details: e?.message }, { status: 500 });
  }
}

