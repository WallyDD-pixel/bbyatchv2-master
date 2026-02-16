import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadMultipleToSupabase } from '@/lib/storage';
import { createRedirectUrl } from '@/lib/redirect';

function isFileLike(value: unknown): value is File {
  return typeof value === 'object' && value !== null && typeof (value as any).arrayBuffer === 'function' && typeof (value as any).name === 'string';
}

export async function POST(req: Request){
  const session = await getServerSession() as any;
  if(!session?.user || (session.user as any).role !== 'admin') return NextResponse.json({ error:'unauthorized' },{ status:401 });
  try {
    const data = await req.formData();
    const id = parseInt(String(data.get('id')),10);
    if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });

    // Récupération existant
    const existing = await (prisma as any).usedBoat.findUnique({ where:{ id }, select:{ slug:true, mainImage:true, photoUrls:true } });
    if(!existing) return NextResponse.json({ error:'not_found' },{ status:404 });

    const existingPhotos: string[] = existing.photoUrls ? (()=>{ try { return JSON.parse(existing.photoUrls); } catch { return []; } })() : [];
    let mainImage: string | null = existing.mainImage || null;

    // keepPhotos = ordre restant des anciennes photos (hors main) envoyé par le formulaire
    const keepPhotosRaw = String(data.get('keepPhotos')||'');
    console.log('📸 keepPhotosRaw reçu:', keepPhotosRaw);
    let kept: string[] | null = null;
    if(keepPhotosRaw && keepPhotosRaw.trim() !== ''){
      try { 
        const parsed = JSON.parse(keepPhotosRaw); 
        if(Array.isArray(parsed)) {
          kept = parsed.filter(p=> typeof p==='string');
          console.log('📸 kept parsé:', kept.length, 'photos');
        }
      } catch (e) {
        console.error('❌ Erreur parsing keepPhotos:', e);
      }
    } else {
      console.log('⚠️ keepPhotosRaw est vide ou null');
    }
    
    // Si kept est null, cela signifie que keepPhotos n'a pas été envoyé
    // Si kept est un tableau (même vide []), on utilise uniquement les photos listées
    let basePhotos: string[] = [];
    if(kept !== null) {
      // Utiliser uniquement les photos qui sont dans kept ET dans existingPhotos
      basePhotos = kept.filter(p=> existingPhotos.includes(p));
      console.log('📸 basePhotos après filtrage:', basePhotos.length, 'photos');
      console.log('📸 Photos gardées:', basePhotos);
      console.log('📸 Photos existantes non gardées:', existingPhotos.filter(p => !kept.includes(p)));
      
      // IMPORTANT : Si keepPhotos est [] (vide) mais qu'il y a des photos existantes,
      // cela signifie que l'utilisateur n'a pas de photos secondaires à garder (seulement l'image principale)
      // Mais on doit quand même préserver les photos existantes qui viennent d'être uploadées
      // On les ajoutera dans mergedPhotos si elles ne sont pas déjà dans basePhotos
    } else {
      // Si keepPhotos n'a pas été envoyé du tout, garder toutes les photos existantes
      basePhotos = [...existingPhotos];
      console.log('⚠️ keepPhotos non envoyé, conservation de toutes les photos existantes:', basePhotos.length);
    }

    // mainImageChoice éventuel
    const mainChoice = String(data.get('mainImageChoice')||'').trim();
    console.log('📸 mainImageChoice reçu:', mainChoice || '(vide)');
    
    // Si mainImageChoice est explicitement envoyé (même vide), on l'utilise
    if(data.has('mainImageChoice')) {
      if(mainChoice && (mainChoice === existing.mainImage || existingPhotos.includes(mainChoice))){
        if(mainChoice !== mainImage){
          // replacer ancienne main dans photos si différente
          if(mainImage && !basePhotos.includes(mainImage)) basePhotos.unshift(mainImage);
          // retirer la nouvelle main de la liste photos si elle y était
          basePhotos = basePhotos.filter(p=> p !== mainChoice);
          mainImage = mainChoice;
          console.log('📸 mainImage mise à jour vers:', mainChoice);
        }
      } else if(!mainChoice) {
        // mainImageChoice est vide explicitement
        // Si keepPhotos est aussi vide ([]), cela signifie que toutes les images ont été supprimées
        if(kept !== null && kept.length === 0 && basePhotos.length === 0) {
          // Toutes les images ont été supprimées, mettre mainImage à null
          console.log('📸 Toutes les images supprimées, mainImage mise à null');
          mainImage = null;
        } else {
          // Il reste des photos, mais pas d'image principale choisie
          // Vérifier si l'image principale actuelle est toujours dans les photos conservées
          if(mainImage && !basePhotos.includes(mainImage) && mainImage !== mainChoice) {
            // L'image principale n'est plus dans les photos conservées, la mettre à null
            console.log('📸 Image principale supprimée, mise à null');
            mainImage = null;
          } else {
            // Conserver l'image principale existante si elle est toujours valide
            console.log('📸 mainImageChoice est vide, conservation de l\'image principale existante:', mainImage || '(aucune)');
          }
        }
      }
    } else {
      // Si mainImageChoice n'est pas envoyé du tout, conserver l'image principale existante
      // Mais vérifier qu'elle est toujours dans les photos conservées
      if(mainImage && !basePhotos.includes(mainImage)) {
        console.log('📸 Image principale non trouvée dans les photos conservées, mise à null');
        mainImage = null;
      } else {
        console.log('📸 mainImageChoice non envoyé, conservation de l\'image principale existante:', mainImage || '(aucune)');
      }
    }

    // Upload nouvelles images vers Supabase Storage avec validation
    const imageFiles = data.getAll('images') as File[];
    const newUrls: string[] = [];
    if(imageFiles && imageFiles.length){
      try {
        const { validateImageFile } = await import('@/lib/security/file-validation');
        const validFiles: File[] = [];
        
        for (const file of imageFiles) {
          if (!isFileLike(file) || file.size === 0) continue;
          const validation = await validateImageFile(file);
          if (validation.valid) {
            validFiles.push(file);
          } else {
            console.warn(`⚠️ Used boat image rejected: ${file.name} - ${validation.error}`);
          }
        }
        
        if (validFiles.length > 0) {
          const urls = await uploadMultipleToSupabase(validFiles, 'used-boats');
          newUrls.push(...urls);
        }
      } catch (e: any) {
        console.error('Error uploading images to Supabase Storage:', e?.message || e);
        // Continue même si l'upload échoue
      }
    }

    // Si pas de main -> première nouvelle devient main, ou première photo conservée
    if(!mainImage) {
      if(newUrls.length > 0) {
        mainImage = newUrls.shift() || null;
        console.log('📸 Nouvelle image principale depuis newUrls:', mainImage);
      } else if(basePhotos.length > 0) {
        // Si pas de nouvelles images, utiliser la première photo conservée
        mainImage = basePhotos[0];
        basePhotos = basePhotos.slice(1); // Retirer de la liste des photos secondaires
        console.log('📸 Nouvelle image principale depuis basePhotos:', mainImage);
      }
    }

    // Fusion finale (ordre: basePhotos existantes réordonnées + nouvelles)
    // Important : s'assurer que toutes les nouvelles images sont ajoutées
    const allPhotos = [...basePhotos];
    
    // Ajouter toutes les nouvelles URLs qui ne sont pas déjà dans basePhotos
    newUrls.forEach(url => {
      if (url && !allPhotos.includes(url)) {
        allPhotos.push(url);
      }
    });
    
    // Si keepPhotos est [] (client a supprimé toutes les photos secondaires), ne jamais ré-ajouter les anciennes.
    // allPhotos contient déjà basePhotos (éventuellement vide) + newUrls.
    if (kept !== null && kept.length === 0 && existingPhotos.length > 0 && newUrls.length === 0) {
      console.log('📸 keepPhotos est [], aucune nouvelle image : liste secondaire vide (suppressions respectées)');
    }
    
    const mergedPhotos = Array.from(new Set(allPhotos));
    console.log('📸 mergedPhotos final:', mergedPhotos.length, 'photos');
    console.log('📸 basePhotos:', basePhotos.length, 'newUrls:', newUrls.length, 'existingPhotos:', existingPhotos.length);
    console.log('📸 mainImage final:', mainImage || '(null)');

    // Gestion des vidéos
    let videoUrls: string[] = [];
    const videoUrlsInput = String(data.get('videoUrls') || '').trim();
    if (videoUrlsInput) {
      try {
        const parsed = JSON.parse(videoUrlsInput);
        if (Array.isArray(parsed)) videoUrls = parsed.filter(v => typeof v === 'string');
      } catch {}
    }
    // Si pas de vidéos dans l'input, récupérer les existantes
    if (videoUrls.length === 0) {
      const existingBoat = await (prisma as any).usedBoat.findUnique({ where: { id }, select: { videoUrls: true } });
      if (existingBoat?.videoUrls) {
        try {
          const parsed = typeof existingBoat.videoUrls === 'string' ? JSON.parse(existingBoat.videoUrls) : existingBoat.videoUrls;
          if (Array.isArray(parsed)) videoUrls = parsed.filter(v => typeof v === 'string');
        } catch {}
      }
    }
    
    // Upload fichiers vidéo vers Supabase Storage (si présents dans le formulaire) avec validation
    const videoFiles = data.getAll('videoFiles') as File[];
    if (videoFiles && videoFiles.length) {
      try {
        const { validateVideoFile } = await import('@/lib/security/file-validation');
        const validVideos: File[] = [];
        
        for (const file of videoFiles) {
          if (!isFileLike(file) || file.size === 0) continue;
          const validation = await validateVideoFile(file);
          if (validation.valid) {
            validVideos.push(file);
          } else {
            console.warn(`⚠️ Used boat video rejected: ${file.name} - ${validation.error}`);
          }
        }
        
        if (validVideos.length > 0) {
          const urls = await uploadMultipleToSupabase(validVideos, 'used-boats/videos');
          videoUrls.push(...urls);
        }
      } catch (e: any) {
        console.error('Error uploading videos to Supabase Storage:', e?.message || e);
        // Continue même si l'upload échoue
      }
    }

    // Gestion du slug : permettre la modification si fourni, sinon conserver l'existant
    let newSlug = existing.slug;
    const slugInput = String(data.get('slug') || '').trim();
    if (slugInput && slugInput !== existing.slug) {
      // Normaliser le slug
      const slugify = (str:string)=> (str||'').toLowerCase()
        .normalize('NFD').replace(/\p{Diacritic}/gu,'')
        .replace(/[^a-z0-9]+/g,'-')
        .replace(/^-+|-+$/g,'') || 'item';
      const normalizedSlug = slugify(slugInput);
      
      // Vérifier que le nouveau slug n'existe pas déjà (sauf pour ce bateau)
      const existingWithSlug = await (prisma as any).usedBoat.findUnique({ 
        where: { slug: normalizedSlug },
        select: { id: true }
      });
      if (existingWithSlug && existingWithSlug.id !== id) {
        // Slug déjà utilisé par un autre bateau
        return NextResponse.json({ 
          error: 'slug_taken', 
          details: `Le slug "${normalizedSlug}" est déjà utilisé par un autre bateau` 
        }, { status: 409 });
      }
      newSlug = normalizedSlug;
    }
    
    const update:any = {
      slug: newSlug,
      titleFr: String(data.get('titleFr')).trim(),
      titleEn: (data.get('titleEn')? String(data.get('titleEn')): String(data.get('titleFr')||'')).trim(),
      year: parseInt(String(data.get('year')),10),
      lengthM: parseFloat(String(data.get('lengthM'))),
      priceEur: (() => {
        const priceRaw = String(data.get('priceEur') || '').trim();
        if (!priceRaw || priceRaw === '') return null;
        const parsed = parseInt(priceRaw, 10);
        return isNaN(parsed) ? null : parsed;
      })(),
      engines: data.get('engines')? String(data.get('engines')).trim(): null,
      engineHours: data.get('engineHours')? parseInt(String(data.get('engineHours')),10): null,
      fuelType: data.get('fuelType')? String(data.get('fuelType')).trim(): null,
      mainImage: mainImage || null, // S'assurer que null est explicitement défini si vide
      summaryFr: data.get('summaryFr')? String(data.get('summaryFr')).trim(): null,
      summaryEn: (data.get('summaryEn')? String(data.get('summaryEn')): String(data.get('summaryFr')||'')).trim() || null,
      descriptionFr: data.get('descriptionFr')? String(data.get('descriptionFr')).trim(): null,
      descriptionEn: (data.get('descriptionEn')? String(data.get('descriptionEn')): String(data.get('descriptionFr')||'')).trim() || null,
      status: data.get('status')? String(data.get('status')): 'listed',
      sort: data.get('sort')? parseInt(String(data.get('sort')),10): 0,
      photoUrls: mergedPhotos.length > 0 ? JSON.stringify(mergedPhotos) : null,
      videoUrls: videoUrls.length > 0 ? JSON.stringify(videoUrls) : null,
    };
    
    console.log('📸 Données de mise à jour - mainImage:', update.mainImage || '(null)', 'photoUrls:', update.photoUrls ? JSON.parse(update.photoUrls).length + ' photos' : '(null)');

    try {
      await (prisma as any).usedBoat.update({ where:{ id }, data: update });
      const redirectUrl = createRedirectUrl(`/admin/used-boats/${id}?updated=1`, req);
      return NextResponse.redirect(redirectUrl, 303);
    } catch (dbError: any) {
      console.error('Database update error:', dbError);
      // Si c'est une erreur de validation Prisma, retourner un message plus clair
      if (dbError.code === 'P2002') {
        return NextResponse.json({ error:'validation_error', details:'Un champ unique existe déjà' },{ status:400 });
      }
      if (dbError.code === 'P2025') {
        return NextResponse.json({ error:'not_found', details:'Bateau introuvable' },{ status:404 });
      }
      throw dbError; // Relancer pour être capturé par le catch externe
    }
  } catch(e:any){
    console.error('Error in used-boats/update:', e);
    return NextResponse.json({ error:'server_error', details:e?.message || String(e) },{ status:500 });
  }
}
