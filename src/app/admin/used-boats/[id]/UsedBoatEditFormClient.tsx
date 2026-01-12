"use client";
import { useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import ImageGalleryManager, { ImageGalleryManagerHandle } from './ImageGalleryManager';
import UsedBoatEditClient from './UsedBoatEditClient';
import Link from 'next/link';

interface UsedBoatEditFormClientProps {
  boatId: number;
  boat: any;
  initialMainImage?: string;
  initialPhotos: string[];
  locale: 'fr' | 'en';
}

export default function UsedBoatEditFormClient({
  boatId,
  boat,
  initialMainImage,
  initialPhotos,
  locale
}: UsedBoatEditFormClientProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const imageGalleryRef = useRef<ImageGalleryManagerHandle>(null);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;

    const form = formRef.current;
    const formData = new FormData(form);

    // Récupérer les fichiers depuis ImageGalleryManager
    if (imageGalleryRef.current) {
      const newFiles = imageGalleryRef.current.getNewFiles();
      const keepPhotos = imageGalleryRef.current.getKeepPhotos();
      const mainImageChoice = imageGalleryRef.current.getMainImageChoice();

      console.log('📤 Soumission du formulaire:');
      console.log('  - Nouveaux fichiers:', newFiles.length);
      console.log('  - Photos à conserver:', keepPhotos.length);
      console.log('  - Image principale choisie:', mainImageChoice);

      // Si l'image principale est une nouvelle image (Data URL), on ne la passe pas dans mainImageChoice
      // car l'API route la gère automatiquement en mettant la première nouvelle image comme principale
      const isMainImageNew = mainImageChoice.startsWith('data:');
      
      // Ajouter les nouveaux fichiers au FormData
      // Si l'image principale est une nouvelle image, elle doit être en premier
      newFiles.forEach(file => {
        formData.append('images', file);
        console.log('  ✅ Fichier ajouté:', file.name, file.size, 'bytes');
      });

      // Mettre à jour les champs cachés
      formData.set('keepPhotos', JSON.stringify(keepPhotos));
      // Ne passer mainImageChoice que si c'est une URL existante (pas une Data URL)
      if (!isMainImageNew && mainImageChoice) {
        formData.set('mainImageChoice', mainImageChoice);
      }
    }

    // Soumettre le formulaire
    try {
      const response = await fetch('/api/admin/used-boats/update', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // Rediriger vers la liste des bateaux d'occasion
        router.push('/admin/used-boats');
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(locale === 'fr' 
          ? `Erreur: ${error.error || 'Une erreur est survenue'}` 
          : `Error: ${error.error || 'An error occurred'}`);
      }
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      alert(locale === 'fr' 
        ? 'Erreur lors de la soumission du formulaire' 
        : 'Error submitting form');
    }
  };

  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit}
      className='mt-6 grid gap-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm'
      encType='multipart/form-data'
    >
      <input type='hidden' name='id' value={boatId} />
      {/* Ligne Nom + Slug */}
      <div className='grid md:grid-cols-2 gap-5'>
        <label className='grid gap-1 text-sm'>
          <span>Nom *</span>
          <input name='titleFr' defaultValue={boat.titleFr} required className='h-11 rounded-lg border border-black/15 px-3' />
        </label>
        <label className='grid gap-1 text-sm'>
          <span>Slug</span>
          <input name='slug' defaultValue={boat.slug} readOnly className='h-11 rounded-lg border border-black/15 px-3 bg-black/5 text-black/60' />
        </label>
      </div>
      <input type='hidden' name='titleEn' value='' />

      {/* Specs */}
      <div className='grid md:grid-cols-3 gap-5'>
        <label className='grid gap-1 text-sm'><span>Année *</span><input required name='year' type='number' defaultValue={boat.year} className='h-11 rounded-lg border border-black/15 px-3' /></label>
        <label className='grid gap-1 text-sm'><span>Longueur (m) *</span><input required step='0.01' name='lengthM' type='number' defaultValue={boat.lengthM} className='h-11 rounded-lg border border-black/15 px-3' /></label>
        <label className='grid gap-1 text-sm'><span>Prix EUR *</span><input required name='priceEur' type='number' defaultValue={boat.priceEur} className='h-11 rounded-lg border border-black/15 px-3' /></label>
        <label className='grid gap-1 text-sm'><span>Moteurs</span><input name='engines' defaultValue={boat.engines||''} className='h-11 rounded-lg border border-black/15 px-3' placeholder='2x Volvo IPS...' /></label>
        <label className='grid gap-1 text-sm'><span>Heures moteur</span><input name='engineHours' type='number' defaultValue={boat.engineHours??''} className='h-11 rounded-lg border border-black/15 px-3' /></label>
        <label className='grid gap-1 text-sm'><span>Carburant</span><input name='fuelType' defaultValue={boat.fuelType||''} className='h-11 rounded-lg border border-black/15 px-3' placeholder='diesel' /></label>
      </div>

      {/* Gestion images drag & drop */}
      <ImageGalleryManager 
        ref={imageGalleryRef}
        initialMainImage={initialMainImage}
        initialPhotos={initialPhotos}
        locale={locale}
      />

      {/* Vidéos */}
      <UsedBoatEditClient boat={boat} locale={locale} />

      {/* Résumé & Description */}
      <label className='grid gap-1 text-sm'><span>Résumé</span><input name='summaryFr' defaultValue={boat.summaryFr||''} className='h-11 rounded-lg border border-black/15 px-3' /></label>
      <input type='hidden' name='summaryEn' value='' />
      <label className='grid gap-1 text-sm'><span>Description</span><textarea name='descriptionFr' rows={6} className='rounded-lg border border-black/15 px-3 py-2 resize-y' defaultValue={boat.descriptionFr||''} /></label>
      <input type='hidden' name='descriptionEn' value='' />

      {/* Status & Sort */}
      <div className='grid md:grid-cols-2 gap-5'>
        <label className='grid gap-1 text-sm'><span>Status</span><select name='status' defaultValue={boat.status} className='h-11 rounded-lg border border-black/15 px-3 bg-white'><option value='listed'>listed</option><option value='sold'>sold</option><option value='draft'>draft</option></select></label>
        <label className='grid gap-1 text-sm'><span>Ordre (sort)</span><input name='sort' type='number' defaultValue={boat.sort??0} className='h-11 rounded-lg border border-black/15 px-3' /></label>
      </div>

      <div className='flex justify-end gap-3 pt-2'>
        <Link href='/admin/used-boats' className='h-11 px-6 rounded-full border border-black/15 text-sm inline-flex items-center hover:bg-black/5'>Annuler</Link>
        <button type='submit' className='h-11 px-6 rounded-full bg-[color:var(--primary)] text-white text-sm font-semibold hover:brightness-110'>Enregistrer</button>
      </div>
    </form>
  );
}

