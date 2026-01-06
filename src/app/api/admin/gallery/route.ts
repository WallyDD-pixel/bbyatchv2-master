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

    // Upload de l'image vers Supabase Storage
    const file = data.get('imageFile') as File | null;
    if (!file || !file.size || !(file as any).arrayBuffer) {
      return NextResponse.json({ error: 'missing_image' }, { status: 400 });
    }

    let imageUrl: string | null = null;
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

    if (!imageUrl) {
      return NextResponse.json({ error: 'upload_failed', details: 'No URL returned from upload' }, { status: 500 });
    }
    
    console.log('Image uploaded successfully to:', imageUrl);

    // Créer l'image dans la base de données
    const created = await (prisma as any).galleryImage.create({
      data: {
        imageUrl,
        titleFr,
        titleEn,
      }
    });

    const redirectUrl = createRedirectUrl(`/admin/gallery?created=${created.id}`, req);
    return NextResponse.redirect(redirectUrl, 303);
  } catch (e: any) {
    console.error('Error creating gallery image:', e);
    return NextResponse.json({ error: 'server_error', details: e?.message }, { status: 500 });
  }
}

