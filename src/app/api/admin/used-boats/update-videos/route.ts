import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const session = await getServerSession(auth as any) as any;
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.formData();
    const id = parseInt(String(data.get('id')), 10);
    if (isNaN(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

    // Récupérer les vidéos existantes depuis la DB
    const existingBoat = await (prisma as any).usedBoat.findUnique({ where: { id }, select: { videoUrls: true } });
    let existingVideos: string[] = [];
    if (existingBoat?.videoUrls) {
      try {
        const parsed = typeof existingBoat.videoUrls === 'string' ? JSON.parse(existingBoat.videoUrls) : existingBoat.videoUrls;
        if (Array.isArray(parsed)) existingVideos = parsed.filter(v => typeof v === 'string');
      } catch {}
    }
    // Si des vidéos existantes sont envoyées dans le formulaire, les utiliser
    const existingVideosRaw = data.get('existingVideos');
    if (existingVideosRaw) {
      try {
        const parsed = JSON.parse(String(existingVideosRaw));
        if (Array.isArray(parsed) && parsed.length > 0) {
          existingVideos = parsed.filter(v => typeof v === 'string');
        }
      } catch {}
    }

    // Upload nouveaux fichiers vidéo
    const videoFiles = data.getAll('videoFiles') as File[];
    const uploadedUrls: string[] = [];
    if (videoFiles && videoFiles.length) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      
      for (const file of videoFiles) {
        if (!file || (file as any).size === 0) continue;
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
        const allowedExt = ['mp4', 'webm', 'ogg', 'mov'];
        if (!allowedExt.includes(ext)) continue;
        
        const fname = `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filepath = path.join(uploadsDir, fname);
        fs.writeFileSync(filepath, buffer);
        uploadedUrls.push(`/uploads/${fname}`);
      }
    }

    // Fusionner vidéos existantes et nouvelles
    const allVideos = Array.from(new Set([...existingVideos, ...uploadedUrls]));

    // Mettre à jour dans la base de données
    await (prisma as any).usedBoat.update({
      where: { id },
      data: {
        videoUrls: allVideos.length ? JSON.stringify(allVideos) : null,
      },
    });

    return NextResponse.json({ videoUrls: allVideos });
  } catch (e: any) {
    console.error('Error updating videos:', e);
    return NextResponse.json({ error: 'server_error', details: e?.message }, { status: 500 });
  }
}

