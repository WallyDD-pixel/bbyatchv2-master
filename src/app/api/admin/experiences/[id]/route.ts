import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadMultipleToSupabase } from '@/lib/storage';
import { createRedirectUrl } from '@/lib/redirect';

// Configuration pour permettre les gros uploads
export const runtime = 'nodejs';
export const maxDuration = 60;

async function ensureAdmin(){
  const session = await getServerSession() as any;
  if(!session?.user || (session.user as any)?.role !== 'admin') return null;
  return session.user;
}

async function handleUpdate(req:Request, id:number, ctype:string){
  let slug:string|undefined, titleFr:string|undefined, titleEn:string|undefined, descFr:string|undefined, descEn:string|undefined, timeFr:string|undefined, timeEn:string|undefined, imageUrl:string|undefined;
  let fixedDepartureTime:string|undefined, fixedReturnTime:string|undefined, hasFixedTimes:boolean|undefined;
  if(ctype.includes('multipart/form-data')){
    const data = await req.formData();
    slug = String(data.get('slug')||'').trim();
    titleFr = String(data.get('titleFr')||'').trim();
    titleEn = String(data.get('titleEn')||'').trim();
    descFr = String(data.get('descFr')||'').trim();
    descEn = String(data.get('descEn')||'').trim();
    timeFr = String(data.get('timeFr')||'').trim()||undefined;
    timeEn = String(data.get('timeEn')||'').trim()||undefined;
    imageUrl = String(data.get('imageUrl')||'').trim()||undefined;
    fixedDepartureTime = String(data.get('fixedDepartureTime')||'').trim()||undefined;
    fixedReturnTime = String(data.get('fixedReturnTime')||'').trim()||undefined;
    hasFixedTimes = data.get('hasFixedTimes') === 'on' || data.get('hasFixedTimes') === 'true';
    const imageFile = data.get('imageFile') as File | null;
    if(imageFile && imageFile instanceof File && imageFile.size > 0){
      try {
        const result = await uploadMultipleToSupabase([imageFile], 'experiences');
        if(result.length > 0){
          imageUrl = result[0];
        }
      } catch(e){
        console.error('Error uploading to Supabase Storage:', e);
      }
    }
  } else {
    const body = await req.json().catch(()=>null); if(!body) return { error:true, resp: NextResponse.json({ error:'bad_request' },{ status:400 }) };
    ({ slug, titleFr, titleEn, descFr, descEn, timeFr, timeEn, imageUrl, fixedDepartureTime, fixedReturnTime, hasFixedTimes } = body);
  }
  if(!titleFr || !titleEn) return { error:true, resp: NextResponse.json({ error:'missing_fields' },{ status:400 }) };
  const existing = await (prisma as any).experience.findUnique({ where:{ id } });
  if(!existing) return { error:true, resp: NextResponse.json({ error:'not_found' },{ status:404 }) };
  if(slug && slug !== existing.slug){
    const taken = await (prisma as any).experience.findUnique({ where:{ slug } });
    if(taken) return { error:true, resp: NextResponse.json({ error:'slug_taken' },{ status:409 }) };
  }
  const updateData: any = {
    slug: slug||existing.slug,
    titleFr,
    titleEn,
    descFr: descFr??'',
    descEn: descEn??'',
    timeFr: timeFr??null,
    timeEn: timeEn??null,
    imageUrl: imageUrl??existing.imageUrl,
    fixedDepartureTime: fixedDepartureTime || null,
    fixedReturnTime: fixedReturnTime || null,
    hasFixedTimes: hasFixedTimes ?? false,
  };
  const updated = await (prisma as any).experience.update({ where:{ id }, data: updateData });
  return { error:false, updated };
}

export async function GET(_:Request, { params }: { params: Promise<{ id:string }> }){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  // Next.js 15: params is a Promise
  const { id: idStr } = await params;
  const id = parseInt(idStr,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  const row = await (prisma as any).experience.findUnique({ where:{ id } });
  if(!row) return NextResponse.json({ error:'not_found' },{ status:404 });
  return NextResponse.json({ experience: row });
}

export async function PUT(req:Request, { params }: { params: Promise<{ id:string }> }){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  // Next.js 15: params is a Promise
  const { id: idStr } = await params;
  const id = parseInt(idStr,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  try {
    const ctype = req.headers.get('content-type')||'';
    const r = await handleUpdate(req,id,ctype);
    if(r.error) return r.resp;
    return NextResponse.json({ ok:true, experience: r.updated });
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}

export async function DELETE(_:Request, { params }: { params: Promise<{ id:string }> }){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  // Next.js 15: params is a Promise
  const { id: idStr } = await params;
  const id = parseInt(idStr,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  try {
    await (prisma as any).experience.delete({ where:{ id } });
    return NextResponse.json({ ok:true });
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}

export async function POST(req:Request, { params }: { params: Promise<{ id:string }> }){
  // Method override pour formulaires HTML (PUT / DELETE)
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  // Next.js 15: params is a Promise
  const { id: idStr } = await params;
  const id = parseInt(idStr,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  try {
    const ctype = req.headers.get('content-type')||'';
    if(ctype.includes('multipart/form-data')){
      const data = await req.formData();
      const method = String(data.get('_method')||'').toUpperCase();
      if(method==='DELETE'){
        await (prisma as any).experience.delete({ where:{ id } });
        const url = new URL('/admin/experiences?deleted=1', req.url);
        return NextResponse.redirect(url,303);
      }
      // Repasser req (pas réutilisable) -> recréer formData lecture: on a déjà data
      // Simpler: reconstruire update en utilisant data déjà lue
      // On recrée un faux Request si nécessaire mais ici on peut dupliquer logique
      let slug = String(data.get('slug')||'').trim();
      let titleFr = String(data.get('titleFr')||'').trim();
      let titleEn = String(data.get('titleEn')||'').trim();
      let descFr = String(data.get('descFr')||'').trim();
      let descEn = String(data.get('descEn')||'').trim();
      let timeFr = String(data.get('timeFr')||'').trim()||undefined;
      let timeEn = String(data.get('timeEn')||'').trim()||undefined;
      // Gestion des images multiples
      const imageUrlParam = data.get('imageUrl');
      let imageUrl: string | null | undefined;
      if(imageUrlParam === '' || imageUrlParam === null){
        imageUrl = null;
      } else if(imageUrlParam){
        imageUrl = String(imageUrlParam).trim() || undefined;
      }
      
      // Récupérer photoUrls existantes
      const photoUrlsParam = data.get('photoUrls');
      let photoUrls: string[] = [];
      if(photoUrlsParam){
        try {
          const parsed = JSON.parse(String(photoUrlsParam));
          if(Array.isArray(parsed)) photoUrls = parsed;
        } catch {}
      }
      
      // Gestion upload de nouvelles images
      // Ne pas utiliser "value instanceof File" : en Node le global File peut être absent (ReferenceError: File is not defined)
      const imageFiles: (File | Blob & { name?: string; size: number })[] = [];
      try {
        data.forEach((value, key) => {
          if (key !== 'imageFiles' || value == null) return;
          const v = value as unknown;
          const isFileLike = typeof v === 'object' && v !== null && 'size' in v && 'arrayBuffer' in v && typeof (v as any).arrayBuffer === 'function';
          if (isFileLike) {
            const fileLike = v as Blob & { name?: string; size: number };
            if (fileLike.size > 0) {
              imageFiles.push(fileLike as File);
              console.log(`Found image file: ${(fileLike as any).name ?? 'unknown'}, size: ${fileLike.size} bytes`);
            }
          }
        });
      } catch (forEachError: any) {
        console.error('Error reading FormData:', forEachError);
        return NextResponse.json({ 
          error: 'server_error', 
          details: 'Erreur lors de la lecture des fichiers',
          message: 'Impossible de lire les fichiers uploadés : ' + (forEachError?.message || 'Erreur inconnue')
        }, { status: 500 });
      }
      
      console.log('Image files received:', imageFiles.length);
      
      const uploadedUrls: string[] = [];
      
      if(imageFiles.length > 0){
        try {
          // Filtrer les fichiers valides (images seulement)
          const allowedImages = ['image/jpeg','image/png','image/webp','image/gif'];
          const validFiles = imageFiles.filter(f => {
            if (!f || f.size === 0) return false;
            const mime = (f as any).type;
            if (!mime || !mime.startsWith('image/')) return false;
            return allowedImages.includes(mime);
          });
          
          // Vérifier la taille totale et individuelle des fichiers
          const totalSize = validFiles.reduce((sum, f) => sum + f.size, 0);
          const maxTotalSize = 45 * 1024 * 1024; // 45MB total
          const maxFileSize = 10 * 1024 * 1024; // 10MB par fichier
          
          // Filtrer les fichiers qui dépassent la taille individuelle
          const filesWithinLimit = validFiles.filter(f => {
            if (f.size > maxFileSize) {
              console.warn(`File ${f.name} is too large: ${(f.size / 1024 / 1024).toFixed(2)}MB`);
              return false;
            }
            return true;
          });
          
          if (filesWithinLimit.length === 0 && validFiles.length > 0) {
            return NextResponse.json({ 
              error: "upload_failed", 
              details: "Les images sont trop volumineuses (max 10MB par image)",
              suggestion: "Réduisez la taille des images avant de les uploader"
            }, { status: 413 });
          }
          
          if (totalSize > maxTotalSize) {
            return NextResponse.json({ 
              error: "upload_failed", 
              details: `Taille totale trop importante: ${(totalSize / 1024 / 1024).toFixed(2)}MB (max: ${(maxTotalSize / 1024 / 1024).toFixed(2)}MB)`,
              suggestion: "Uploadez moins d'images à la fois"
            }, { status: 413 });
          }
          
          if(filesWithinLimit.length > 0){
            console.log(`Uploading ${filesWithinLimit.length} image(s) to Supabase (total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB)`);
            // Validation de sécurité avec magic bytes (comme pour les bateaux)
            const { validateImageFile } = await import('@/lib/security/file-validation');
            const validImageFiles: File[] = [];
            
            for (const file of filesWithinLimit) {
              const mime = (file as any).type;
              if (allowedImages.includes(mime)) {
                const validation = await validateImageFile(file);
                if (validation.valid) {
                  validImageFiles.push(file);
                } else {
                  console.warn(`⚠️ Image file rejected: ${file.name} - ${validation.error}`);
                }
              }
            }
            
            if (validImageFiles.length > 0) {
              // Upload vers Supabase Storage (comme pour les bateaux)
              const urls = await uploadMultipleToSupabase(validImageFiles, 'experiences');
              uploadedUrls.push(...urls);
              console.log('Uploaded', uploadedUrls.length, 'image(s) to Supabase');
            } else {
              console.warn('No valid image files after security validation');
              return NextResponse.json({ 
                error: "upload_failed", 
                details: "Aucune image valide après validation de sécurité",
                message: "Les fichiers images ont été rejetés par la validation de sécurité. Vérifiez que les fichiers sont bien des images valides."
              }, { status: 400 });
            }
          } else {
            console.warn('No valid image files found');
          }
        } catch(e: any){
          console.error('Error uploading to Supabase Storage:', e);
          console.error('Error details:', {
            message: e?.message,
            stack: e?.stack,
            code: e?.code,
            name: e?.name
          });
          // Retourner une erreur appropriée selon le type
          if (e?.message?.includes('413') || e?.message?.includes('too large')) {
            return NextResponse.json({ 
              error: "upload_failed", 
              details: "Les fichiers sont trop volumineux",
              suggestion: "Réduisez la taille des images (max 10MB par image)"
            }, { status: 413 });
          }
          // Pour les erreurs de validation
          if (e?.message?.includes('validation') || e?.message?.includes('rejected')) {
            return NextResponse.json({ 
              error: "upload_failed", 
              details: e?.message || "Erreur de validation des fichiers",
              message: "Les fichiers images ont été rejetés : " + (e?.message || "Erreur de validation")
            }, { status: 400 });
          }
          // Pour les autres erreurs, retourner une erreur claire
          return NextResponse.json({ 
            error: "upload_failed", 
            details: e?.message || "Erreur lors de l'upload vers Supabase",
            message: "Erreur lors de l'upload : " + (e?.message || "Erreur inconnue")
          }, { status: 500 });
        }
      }
      
      if(!titleFr || !titleEn){
        return NextResponse.json({ error:'missing_fields' },{ status:400 });
      }
      const existing = await (prisma as any).experience.findUnique({ where:{ id } });
      if(!existing) return NextResponse.json({ error:'not_found' },{ status:404 });
      
      // Fusionner les photos existantes avec les nouvelles
      // Si photoUrls est fourni dans le formData, on l'utilise (il contient déjà les photos existantes)
      // Sinon, on récupère les photos existantes de la base de données
      let allPhotoUrls: string[] = [];
      if(photoUrlsParam !== null){
        // photoUrls contient déjà la liste complète (existantes + nouvelles seront ajoutées)
        allPhotoUrls = [...photoUrls, ...uploadedUrls];
      } else {
        // Récupérer les photos existantes depuis la base de données
        const existingPhotos = existing.photoUrls ? (() => {
          try {
            const parsed = JSON.parse(existing.photoUrls);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })() : [];
        allPhotoUrls = [...existingPhotos, ...uploadedUrls];
      }
      
      // Si imageUrl n'est pas défini mais qu'on a des photos, utiliser la première
      if(imageUrl === undefined && allPhotoUrls.length > 0){
        imageUrl = allPhotoUrls[0];
      }
      
      if(slug && slug !== existing.slug){
        const taken = await (prisma as any).experience.findUnique({ where:{ slug } });
        if(taken) return NextResponse.json({ error:'slug_taken' },{ status:409 });
      }
      
      // Déterminer les valeurs finales
      let finalImageUrl: string | null = imageUrl !== undefined ? imageUrl : existing.imageUrl;
      let finalPhotoUrls: string | null = null;
      // Toujours mettre à jour photoUrls si on a des photos ou si photoUrls était dans le formData
      if(photoUrlsParam !== null || allPhotoUrls.length > 0){
        finalPhotoUrls = allPhotoUrls.length > 0 ? JSON.stringify(allPhotoUrls) : null;
      }
      
      const updateData: any = {
        slug: slug||existing.slug,
        titleFr,
        titleEn,
        descFr: descFr??'',
        descEn: descEn??'',
        timeFr: timeFr??null,
        timeEn: timeEn??null,
        imageUrl: finalImageUrl
      };
      
      // Ajouter photoUrls si on a des photos ou si c'était dans le formData
      // Utiliser undefined au lieu de null pour ne pas mettre à jour si non fourni
      if(photoUrlsParam !== null || allPhotoUrls.length > 0){
        updateData.photoUrls = finalPhotoUrls;
      }
      
      console.log('Updating experience with data:', { 
        ...updateData, 
        photoUrls: updateData.photoUrls ? (updateData.photoUrls.length > 100 ? updateData.photoUrls.substring(0, 100) + '...' : updateData.photoUrls) : 'null',
        photoUrlsLength: updateData.photoUrls ? updateData.photoUrls.length : 0
      });
      
      let updated: any;
      try {
        updated = await (prisma as any).experience.update({ where:{ id }, data: updateData });
        console.log('Experience updated successfully');
      } catch (updateError: any) {
        console.error('Error updating experience:', updateError);
        console.error('Update error code:', updateError?.code);
        console.error('Update error message:', updateError?.message);
        console.error('Update error stack:', updateError?.stack);
        // Retourner une erreur claire au lieu de throw
        return NextResponse.json({ 
          error: 'server_error', 
          details: updateError?.message || 'Erreur lors de la mise à jour de l\'expérience',
          message: 'Erreur lors de la sauvegarde : ' + (updateError?.message || 'Erreur inconnue')
        }, { status: 500 });
      }
      
      // Retourner les photoUrls pour mise à jour de l'interface
      const responsePhotoUrls = finalPhotoUrls ? (() => {
        try {
          return JSON.parse(finalPhotoUrls);
        } catch {
          return [];
        }
      })() : [];
      
      // Si on a des fichiers dans la requête, retourner JSON pour mettre à jour l'interface
      if(imageFiles.length > 0){
        // Si l'upload a échoué mais qu'on a des fichiers, on retourne quand même un succès
        // avec un avertissement si aucun fichier n'a été uploadé
        if(uploadedUrls.length === 0){
          console.warn('No files were uploaded successfully, but continuing with update');
        }
        return NextResponse.json({ 
          ok: true, 
          experience: updated,
          photoUrls: responsePhotoUrls,
          imageUrl: finalImageUrl,
          ...(uploadedUrls.length === 0 && imageFiles.length > 0 ? { warning: 'Aucune image n\'a pu être uploadée' } : {})
        });
      }
      
      // Vérifier si c'est une requête AJAX (fetch) ou un formulaire HTML classique
      const acceptHeader = req.headers.get('accept') || '';
      const isAjaxRequest = acceptHeader.includes('application/json') || 
                            req.headers.get('x-requested-with') === 'XMLHttpRequest';
      
      // Si c'est une requête AJAX, retourner JSON pour éviter les problèmes de redirection
      if (isAjaxRequest || !ctype.includes('multipart/form-data')) {
        return NextResponse.json({ 
          ok: true, 
          experience: updated,
          photoUrls: responsePhotoUrls,
          imageUrl: finalImageUrl
        });
      }
      
      // Sinon, rediriger après sauvegarde normale (formulaire HTML classique)
      const redirectUrl = createRedirectUrl(`/admin/experiences/${id}?updated=1`, req);
      return NextResponse.redirect(redirectUrl, 303);
    }
    return NextResponse.json({ error:'unsupported' },{ status:400 });
  } catch(e:any){
    console.error('Server error in experience update:', e);
    console.error('Stack:', e?.stack);
    return NextResponse.json({ error:'server_error', details:e?.message || String(e) },{ status:500 });
  }
}
