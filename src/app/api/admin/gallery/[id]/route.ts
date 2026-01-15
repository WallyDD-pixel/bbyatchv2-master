import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFromSupabase, extractPathFromSupabaseUrl } from '@/lib/storage';
import { createRedirectUrl } from '@/lib/redirect';

export const runtime = 'nodejs';

async function ensureAdmin() {
  const session = await getServerSession(auth as any) as any;
  if (!session?.user || (session.user as any).role !== 'admin') return null;
  return session.user;
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  
  try {
    // Récupérer l'image avant de la supprimer pour obtenir l'URL
    const image = await (prisma as any).galleryImage.findUnique({ where: { id } });
    if (!image) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    
    // Supprimer l'image de Supabase Storage si c'est une URL Supabase
    if (image.imageUrl) {
      const path = extractPathFromSupabaseUrl(image.imageUrl);
      if (path) {
        try {
          await deleteFromSupabase(path);
        } catch (e) {
          console.error('Error deleting from Supabase Storage:', e);
          // Continue même si la suppression du storage échoue
        }
      }
    }
    
    // Supprimer l'image de la base de données
    await (prisma as any).galleryImage.delete({ where: { id } });
    
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Error deleting gallery image:', e);
    return NextResponse.json({ error: 'server_error', details: e?.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // Method override pour formulaires HTML (DELETE)
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  
  try {
    const data = await req.formData();
    const method = String(data.get('_method') || '').toUpperCase();
    
    if (method === 'DELETE') {
      // Récupérer l'image avant de la supprimer
      const image = await (prisma as any).galleryImage.findUnique({ where: { id } });
      if (!image) {
        const redirectUrl = createRedirectUrl('/admin/gallery?error=not_found', req);
        return NextResponse.redirect(redirectUrl, 303);
      }
      
      // Supprimer l'image de Supabase Storage si c'est une URL Supabase
      if (image.imageUrl) {
        const path = extractPathFromSupabaseUrl(image.imageUrl);
        if (path) {
          try {
            await deleteFromSupabase(path);
          } catch (e) {
            console.error('Error deleting from Supabase Storage:', e);
            // Continue même si la suppression du storage échoue
          }
        }
      }
      
      // Supprimer l'image de la base de données
      await (prisma as any).galleryImage.delete({ where: { id } });
      
      const redirectUrl = createRedirectUrl('/admin/gallery?deleted=1', req);
      return NextResponse.redirect(redirectUrl, 303);
    }
    
    return NextResponse.json({ error: 'unsupported_method' }, { status: 400 });
  } catch (e: any) {
    console.error('Error deleting gallery image:', e);
    const redirectUrl = createRedirectUrl('/admin/gallery?error=server_error', req);
    return NextResponse.redirect(redirectUrl, 303);
  }
}





