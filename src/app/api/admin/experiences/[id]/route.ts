import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadMultipleToSupabase } from '@/lib/storage';
import { createRedirectUrl } from '@/lib/redirect';

async function ensureAdmin(){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user || (session.user as any)?.role !== 'admin') return null;
  return session.user;
}

async function handleUpdate(req:Request, id:number, ctype:string){
  let slug:string|undefined, titleFr:string|undefined, titleEn:string|undefined, descFr:string|undefined, descEn:string|undefined, additionalTextFr:string|undefined, additionalTextEn:string|undefined, timeFr:string|undefined, timeEn:string|undefined, imageUrl:string|undefined;
  let fixedDepartureTime:string|undefined, fixedReturnTime:string|undefined, hasFixedTimes:boolean|undefined;
  if(ctype.includes('multipart/form-data')){
    const data = await req.formData();
    slug = String(data.get('slug')||'').trim();
    titleFr = String(data.get('titleFr')||'').trim();
    titleEn = String(data.get('titleEn')||'').trim();
    descFr = String(data.get('descFr')||'').trim();
    descEn = String(data.get('descEn')||'').trim();
    additionalTextFr = String(data.get('additionalTextFr')||'').trim()||undefined;
    additionalTextEn = String(data.get('additionalTextEn')||'').trim()||undefined;
    timeFr = String(data.get('timeFr')||'').trim()||undefined;
    timeEn = String(data.get('timeEn')||'').trim()||undefined;
    imageUrl = String(data.get('imageUrl')||'').trim()||undefined;
    fixedDepartureTime = String(data.get('fixedDepartureTime')||'').trim()||undefined;
    fixedReturnTime = String(data.get('fixedReturnTime')||'').trim()||undefined;
    hasFixedTimes = data.get('hasFixedTimes') === 'on' || data.get('hasFixedTimes') === 'true';
    const imageFile = data.get('imageFile') as File | null;
    if(imageFile && imageFile instanceof File && imageFile.size > 0){
      const result = await uploadMultipleToSupabase([imageFile], 'experiences');
      if(result.length > 0){
        imageUrl = result[0];
      }
    }
  } else {
    const body = await req.json().catch(()=>null); if(!body) return { error:true, resp: NextResponse.json({ error:'bad_request' },{ status:400 }) };
    ({ slug, titleFr, titleEn, descFr, descEn, additionalTextFr, additionalTextEn, timeFr, timeEn, imageUrl, fixedDepartureTime, fixedReturnTime, hasFixedTimes } = body);
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
    additionalTextFr: additionalTextFr??null,
    additionalTextEn: additionalTextEn??null,
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

export async function GET(_:Request, { params }: { params:{ id:string } }){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  const row = await (prisma as any).experience.findUnique({ where:{ id } });
  if(!row) return NextResponse.json({ error:'not_found' },{ status:404 });
  return NextResponse.json({ experience: row });
}

export async function PUT(req:Request, { params }: { params:{ id:string } }){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  try {
    const ctype = req.headers.get('content-type')||'';
    const r = await handleUpdate(req,id,ctype);
    if(r.error) return r.resp;
    return NextResponse.json({ ok:true, experience: r.updated });
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}

export async function DELETE(_:Request, { params }: { params:{ id:string } }){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  try {
    await (prisma as any).experience.delete({ where:{ id } });
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/experiences');
    revalidatePath('/');
    return NextResponse.json({ ok:true });
  } catch(e:any){
    console.error('Error deleting experience:', e);
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}

export async function POST(req:Request, { params }: { params:{ id:string } }){
  // Method override pour formulaires HTML (PUT / DELETE)
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  try {
    const ctype = req.headers.get('content-type')||'';
    
    // Gestion des formulaires (multipart ou urlencoded)
    if(ctype.includes('multipart/form-data') || ctype.includes('application/x-www-form-urlencoded')){
      const data = await req.formData();
      const method = String(data.get('_method')||'').toUpperCase();
      
      // Gestion DELETE
      if(method==='DELETE'){
        try {
          await (prisma as any).experience.delete({ where:{ id } });
          const { revalidatePath } = await import('next/cache');
          revalidatePath('/admin/experiences');
          revalidatePath('/');
          const redirectUrl = createRedirectUrl('/admin/experiences?deleted=1', req);
          return NextResponse.redirect(redirectUrl, 303);
        } catch(e:any){
          console.error('Error deleting experience:', e);
          return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
        }
      }
      
      // Gestion des mises à jour (multipart seulement pour les uploads)
      if(ctype.includes('multipart/form-data')){
      // Repasser req (pas réutilisable) -> recréer formData lecture: on a déjà data
      // Simpler: reconstruire update en utilisant data déjà lue
      // On recrée un faux Request si nécessaire mais ici on peut dupliquer logique
      let slug = String(data.get('slug')||'').trim();
      let titleFr = String(data.get('titleFr')||'').trim();
      let titleEn = String(data.get('titleEn')||'').trim();
      let descFr = String(data.get('descFr')||'').trim();
      let descEn = String(data.get('descEn')||'').trim();
      let additionalTextFr = String(data.get('additionalTextFr')||'').trim()||undefined;
      let additionalTextEn = String(data.get('additionalTextEn')||'').trim()||undefined;
      let timeFr = String(data.get('timeFr')||'').trim()||undefined;
      let timeEn = String(data.get('timeEn')||'').trim()||undefined;
      let fixedDepartureTime = String(data.get('fixedDepartureTime')||'').trim()||undefined;
      let fixedReturnTime = String(data.get('fixedReturnTime')||'').trim()||undefined;
      let hasFixedTimes = data.get('hasFixedTimes') === 'on' || data.get('hasFixedTimes') === 'true';
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
      // Utiliser la même approche que la route des bateaux qui fonctionne
      const imageFiles: File[] = [];
      data.forEach((value, key) => {
        if(key === 'imageFiles' && value instanceof File){
          imageFiles.push(value);
        }
      });
      
      console.log('Image files received:', imageFiles.length);
      
      // Upload vers Supabase Storage
      const uploadedUrls: string[] = [];
      
      if(imageFiles.length > 0){
        // Filtrer les fichiers valides (images uniquement)
        const validImageFiles = imageFiles.filter(file => {
          const name = file.name || '';
          const ext = (name.split('.').pop()||'').toLowerCase();
          const mime = file.type || '';
          const allowedExt = ['jpg','jpeg','png','webp','gif'];
          return mime.startsWith('image/') || allowedExt.includes(ext);
        });
        
        if(validImageFiles.length > 0){
          const urls = await uploadMultipleToSupabase(validImageFiles, 'experiences');
          uploadedUrls.push(...urls);
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
      
      // Ajouter les champs optionnels seulement s'ils sont définis (pour éviter les erreurs si les colonnes n'existent pas encore)
      if (additionalTextFr !== undefined) updateData.additionalTextFr = additionalTextFr || null;
      if (additionalTextEn !== undefined) updateData.additionalTextEn = additionalTextEn || null;
      if (fixedDepartureTime !== undefined) updateData.fixedDepartureTime = fixedDepartureTime || null;
      if (fixedReturnTime !== undefined) updateData.fixedReturnTime = fixedReturnTime || null;
      if (hasFixedTimes !== undefined) updateData.hasFixedTimes = hasFixedTimes ?? false;
      
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
        // Filtrer les champs qui pourraient ne pas exister dans la base de données
        const safeUpdateData: any = {};
        const allowedFields = ['slug', 'titleFr', 'titleEn', 'descFr', 'descEn', 'timeFr', 'timeEn', 'imageUrl', 'photoUrls', 'additionalTextFr', 'additionalTextEn', 'fixedDepartureTime', 'fixedReturnTime', 'hasFixedTimes'];
        for (const key in updateData) {
          if (allowedFields.includes(key) && updateData[key] !== undefined) {
            safeUpdateData[key] = updateData[key];
          }
        }
        
        updated = await (prisma as any).experience.update({ where:{ id }, data: safeUpdateData });
        console.log('Experience updated successfully');
      } catch (updateError: any) {
        console.error('Error updating experience:', updateError);
        console.error('Update error code:', updateError?.code);
        console.error('Update error message:', updateError?.message);
        console.error('Update error stack:', updateError?.stack);
        
        // Si l'erreur est due à des champs manquants, essayer sans ces champs
        if (updateError?.message?.includes('Unknown argument') || updateError?.message?.includes('Available options')) {
          console.warn('Retrying without optional fields that may not exist in DB');
          const fallbackData: any = {
            slug: slug||existing.slug,
            titleFr,
            titleEn,
            descFr: descFr??'',
            descEn: descEn??'',
            timeFr: timeFr??null,
            timeEn: timeEn??null,
            imageUrl: finalImageUrl
          };
          if(photoUrlsParam !== null || allPhotoUrls.length > 0){
            fallbackData.photoUrls = finalPhotoUrls;
          }
          updated = await (prisma as any).experience.update({ where:{ id }, data: fallbackData });
          console.log('Experience updated successfully (fallback without optional fields)');
        } else {
          throw updateError;
        }
      }
      
      // Retourner les photoUrls pour mise à jour de l'interface
      const responsePhotoUrls = finalPhotoUrls ? (() => {
        try {
          return JSON.parse(finalPhotoUrls);
        } catch {
          return [];
        }
      })() : [];
      
      // Si on a des fichiers dans la requête (même s'ils n'ont pas été validés), retourner JSON
      // Cela permet de gérer les erreurs d'upload proprement
      if(imageFiles.length > 0){
        // Vérifier qu'au moins une image a été uploadée avec succès
        if(uploadedUrls.length === 0 && imageFiles.length > 0){
          return NextResponse.json({ 
            error: 'upload_failed',
            message: 'Aucune image n\'a pu être uploadée. Vérifiez que les fichiers sont des images valides.'
          }, { status: 400 });
        }
        // Si aucun fichier valide n'a été trouvé
        if(imageFiles.length === 0){
          return NextResponse.json({ 
            error: 'no_valid_files',
            message: 'Aucun fichier valide n\'a été détecté. Vérifiez que vous sélectionnez des images.'
          }, { status: 400 });
        }
        return NextResponse.json({ 
          ok: true, 
          experience: updated,
          photoUrls: responsePhotoUrls,
          imageUrl: finalImageUrl
        });
      }
      
      // Sinon, rediriger après sauvegarde normale
      const redirectUrl = createRedirectUrl(`/admin/experiences/${id}?updated=1`, req);
      return NextResponse.redirect(redirectUrl, 303);
    }
    }
    return NextResponse.json({ error:'unsupported' },{ status:400 });
  } catch(e:any){
    console.error('Server error in experience update:', e);
    console.error('Stack:', e?.stack);
    return NextResponse.json({ error:'server_error', details:e?.message || String(e) },{ status:500 });
  }
}
