import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadMultipleToSupabase } from "@/lib/storage";
import { createRedirectUrl } from "@/lib/redirect";

// Configuration pour permettre les gros uploads
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getServerSession() as any;
  if (!session?.user || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const ctype = req.headers.get('content-type') || '';
    let slug:string|undefined, titleFr:string|undefined, titleEn:string|undefined, descFr:string|undefined, descEn:string|undefined, timeFr:string|undefined, timeEn:string|undefined, imageUrl:string|undefined;
    let fixedDepartureTime:string|undefined, fixedReturnTime:string|undefined, hasFixedTimes:boolean|undefined;
    let photoUrls: string | null = null;
    
    if(ctype.includes('multipart/form-data') || ctype.includes('application/x-www-form-urlencoded')){
      const data = await req.formData();
      
      // Normaliser le slug : enlever les caractères problématiques mais garder les espaces si nécessaire
      const rawSlug = String(data.get('slug')||'').trim();
      // Si le slug contient des caractères spéciaux, essayer de le normaliser
      // Mais garder les espaces car certains packs peuvent avoir des noms avec espaces
      slug = rawSlug;
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
      
      // Gestion des images multiples
      const imageFiles: File[] = [];
      data.forEach((value, key) => {
        if(key === 'imageFiles' && value instanceof File){
          imageFiles.push(value);
        }
      });
      
      // Upload vers Supabase si des fichiers sont fournis
      const uploadedUrls: string[] = [];
      if(imageFiles.length > 0){
        try {
          const allowedImages = ['image/jpeg','image/png','image/webp','image/gif'];
          const validFiles = imageFiles.filter(f => {
            if (!f || f.size === 0) return false;
            const mime = (f as any).type;
            if (!mime || !mime.startsWith('image/')) return false;
            return allowedImages.includes(mime);
          });
          
          // Vérifier la taille totale et individuelle des fichiers avant upload
          const totalSize = validFiles.reduce((sum, f) => sum + f.size, 0);
          const maxTotalSize = 45 * 1024 * 1024; // 45MB total (légèrement en dessous de 50MB)
          const maxFileSize = 10 * 1024 * 1024; // 10MB par fichier
          
          // Filtrer les fichiers qui dépassent la taille individuelle
          const filesWithinLimit = validFiles.filter(f => {
            if (f.size > maxFileSize) {
              console.warn(`File ${f.name} is too large: ${(f.size / 1024 / 1024).toFixed(2)}MB (max: ${(maxFileSize / 1024 / 1024).toFixed(2)}MB)`);
              return false;
            }
            return true;
          });
          
          if (filesWithinLimit.length === 0) {
            return NextResponse.json({ 
              error: "upload_failed", 
              details: "Aucune image valide. Les images ne doivent pas dépasser 10MB chacune.",
              suggestion: "Réduisez la taille des images avant de les uploader"
            }, { status: 413 });
          }
          
          if (totalSize > maxTotalSize) {
            return NextResponse.json({ 
              error: "upload_failed", 
              details: `Taille totale trop importante: ${(totalSize / 1024 / 1024).toFixed(2)}MB (max: ${(maxTotalSize / 1024 / 1024).toFixed(2)}MB)`,
              suggestion: "Uploadez moins d'images à la fois ou réduisez leur taille"
            }, { status: 413 });
          }
          
          if(filesWithinLimit.length > 0){
            console.log(`Uploading ${filesWithinLimit.length} image(s) to Supabase (total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB)`);
            const urls = await uploadMultipleToSupabase(filesWithinLimit, 'experiences');
            uploadedUrls.push(...urls);
            console.log(`Successfully uploaded ${urls.length} image(s)`);
            
            if (urls.length === 0) {
              return NextResponse.json({ 
                error: "upload_failed", 
                details: "Aucune image n'a pu être uploadée avec succès",
                suggestion: "Vérifiez que les images sont valides et essayez à nouveau"
              }, { status: 413 });
            }
          }
        } catch(e: any){
          console.error('Error uploading to Supabase Storage:', e);
          // Retourner une erreur appropriée selon le type
          if (e?.message?.includes('413') || e?.message?.includes('too large')) {
            return NextResponse.json({ 
              error: "upload_failed", 
              details: "Les fichiers sont trop volumineux",
              suggestion: "Réduisez la taille des images (max 10MB par image)"
            }, { status: 413 });
          }
          return NextResponse.json({ 
            error: "upload_failed", 
            details: e?.message || "Erreur lors de l'upload des images",
            suggestion: "Essayez d'uploader les images une par une ou réduisez leur taille"
          }, { status: 500 });
        }
      }
      
      // Récupérer photoUrls depuis le formData
      const photoUrlsParam = data.get('photoUrls');
      if(photoUrlsParam){
        try {
          const parsed = JSON.parse(String(photoUrlsParam));
          if(Array.isArray(parsed)){
            const allUrls = [...parsed, ...uploadedUrls];
            photoUrls = allUrls.length > 0 ? JSON.stringify(allUrls) : null;
            // Si imageUrl n'est pas défini mais qu'on a des photos, utiliser la première
            if(!imageUrl && allUrls.length > 0){
              imageUrl = allUrls[0];
            }
          }
        } catch {}
      } else if(uploadedUrls.length > 0){
        photoUrls = JSON.stringify(uploadedUrls);
        if(!imageUrl){
          imageUrl = uploadedUrls[0];
        }
      }
      
      // Fallback: imageFile unique (legacy)
      if(!imageUrl){
        const imageFile = data.get('imageFile') as File | null;
        if(imageFile && (imageFile as any).arrayBuffer && imageFile.size > 0){
          const result = await uploadMultipleToSupabase([imageFile], 'experiences');
          if(result.length > 0){
            imageUrl = result[0];
            if(!photoUrls){
              photoUrls = JSON.stringify(result);
            }
          }
        }
      }
    } else {
      const body = await req.json().catch(() => null);
      if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
      ({ slug, titleFr, titleEn, descFr, descEn, timeFr, timeEn, imageUrl, fixedDepartureTime, fixedReturnTime, hasFixedTimes, photoUrls } = body || {});
    }

    if (!slug || !titleFr || !titleEn) {
      return NextResponse.json({ 
        error: "missing_fields", 
        details: "Slug, titre FR et titre EN sont requis" 
      }, { status: 400 });
    }

    // Vérifier que le slug n'existe pas déjà
    const existing = await (prisma as any).experience.findUnique({ where: { slug } }).catch(() => null);
    if (existing) {
      return NextResponse.json({ 
        error: "slug_unique", 
        details: `Le slug "${slug}" existe déjà` 
      }, { status: 409 });
    }

    try {
      const created = await (prisma as any).experience.create({
        data: { 
          slug, 
          titleFr, 
          titleEn, 
          descFr: descFr ?? "", 
          descEn: descEn ?? "", 
          timeFr: timeFr ?? null, 
          timeEn: timeEn ?? null, 
          imageUrl: imageUrl ?? null,
          photoUrls: photoUrls,
          fixedDepartureTime: fixedDepartureTime || null,
          fixedReturnTime: fixedReturnTime || null,
          hasFixedTimes: hasFixedTimes ?? false,
        },
      });
      
      console.log('Experience created successfully:', { id: created.id, slug: created.slug, titleFr: created.titleFr });
      // Si formulaire -> redirection vers la liste
      if(ctype.includes('multipart/form-data') || ctype.includes('application/x-www-form-urlencoded')){
        const redirectUrl = createRedirectUrl(`/admin/experiences/${created.id}?created=1`, req);
        return NextResponse.redirect(redirectUrl, 303);
      }
      return NextResponse.json({ ok: true, id: created.id, experience: created });
    } catch (createError: any) {
      console.error('Error creating experience:', createError);
      if (createError?.code === "P2002") {
        return NextResponse.json({ 
          error: "slug_unique", 
          details: `Le slug "${slug}" existe déjà` 
        }, { status: 409 });
      }
      return NextResponse.json({ 
        error: "server_error", 
        details: createError?.message || "Erreur lors de la création de l'expérience" 
      }, { status: 500 });
    }
  } catch (e: any) {
    console.error('Error in POST /api/admin/experiences:', e);
    if (e?.code === "P2002") return NextResponse.json({ error: "slug_unique" }, { status: 409 });
    return NextResponse.json({ 
      error: "server_error", 
      details: e?.message || "Erreur serveur inconnue" 
    }, { status: 500 });
  }
}
