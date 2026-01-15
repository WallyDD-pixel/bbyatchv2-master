"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ExperienceEditClient({ 
  experience, 
  locale 
}: { 
  experience: any; 
  locale: "fr" | "en" 
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Parser photoUrls depuis JSON ou array
  const parsePhotoUrls = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };
  
  // Initialiser les photos : utiliser photoUrls si disponible, sinon utiliser imageUrl
  const parsedPhotoUrls = parsePhotoUrls(experience.photoUrls);
  const expImageUrl = experience.imageUrl?.trim();
  
  // Construire la liste initiale des photos
  let initialPhotos: string[] = [];
  
  // Si photoUrls existe, l'utiliser
  if (parsedPhotoUrls.length > 0) {
    initialPhotos = [...parsedPhotoUrls];
  }
  
  // Si imageUrl existe et n'est pas déjà dans la liste, l'ajouter
  if (expImageUrl && expImageUrl.length > 0) {
    if (!initialPhotos.includes(expImageUrl)) {
      // Ajouter imageUrl au début si c'est l'image principale
      initialPhotos = [expImageUrl, ...initialPhotos];
    }
  }
  
  // Si toujours aucune photo et qu'il y a une imageUrl, l'utiliser
  if (initialPhotos.length === 0 && expImageUrl && expImageUrl.length > 0) {
    initialPhotos = [expImageUrl];
  }
  
  // Log pour debug
  console.log('Experience data:', {
    id: experience.id,
    slug: experience.slug,
    imageUrl: experience.imageUrl,
    imageUrlTrimmed: expImageUrl,
    photoUrls: experience.photoUrls,
    parsedPhotoUrls,
    initialPhotos,
    initialPhotosLength: initialPhotos.length
  });
  
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [imageUrl, setImageUrl] = useState<string | null>(
    (expImageUrl && expImageUrl.length > 0) ? expImageUrl : (initialPhotos[0] || null)
  );
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    
    // Vérifier la taille des fichiers avant upload
    const maxFileSize = 10 * 1024 * 1024; // 10MB par fichier
    const maxTotalSize = 45 * 1024 * 1024; // 45MB total
    
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    let totalSize = 0;
    
    fileArray.forEach((file) => {
      if (file.size > maxFileSize) {
        invalidFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      } else {
        validFiles.push(file);
        totalSize += file.size;
      }
    });
    
    if (invalidFiles.length > 0) {
      alert(locale === 'fr' 
        ? `Certains fichiers sont trop volumineux (max 10MB par fichier): ${invalidFiles.join(', ')}`
        : `Some files are too large (max 10MB per file): ${invalidFiles.join(', ')}`
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    if (totalSize > maxTotalSize) {
      alert(locale === 'fr'
        ? `Taille totale trop importante: ${(totalSize / 1024 / 1024).toFixed(2)}MB (max: ${(maxTotalSize / 1024 / 1024).toFixed(2)}MB). Uploadez moins d'images à la fois.`
        : `Total size too large: ${(totalSize / 1024 / 1024).toFixed(2)}MB (max: ${(maxTotalSize / 1024 / 1024).toFixed(2)}MB). Upload fewer images at once.`
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      // Envoyer la liste actuelle des photos
      formData.append('photoUrls', JSON.stringify(photos));
      // Ajouter les champs du formulaire
      const form = e.currentTarget.closest('form');
      if (form) {
        formData.append('slug', (form.querySelector('[name="slug"]') as HTMLInputElement)?.value || '');
        formData.append('titleFr', (form.querySelector('[name="titleFr"]') as HTMLInputElement)?.value || '');
        formData.append('titleEn', (form.querySelector('[name="titleEn"]') as HTMLInputElement)?.value || '');
        formData.append('descFr', (form.querySelector('[name="descFr"]') as HTMLTextAreaElement)?.value || '');
        formData.append('descEn', (form.querySelector('[name="descEn"]') as HTMLTextAreaElement)?.value || '');
        formData.append('timeFr', (form.querySelector('[name="timeFr"]') as HTMLInputElement)?.value || '');
        formData.append('timeEn', (form.querySelector('[name="timeEn"]') as HTMLInputElement)?.value || '');
      }
      if (imageUrl) formData.append('imageUrl', imageUrl);
      
      // Ajouter uniquement les fichiers valides
      validFiles.forEach((f, i) => {
        console.log(`Adding file ${i + 1}:`, f.name, f.type, `${(f.size / 1024 / 1024).toFixed(2)}MB`);
        formData.append('imageFiles', f);
      });
      formData.append('_method', 'PUT');

      console.log('Uploading', files.length, 'file(s)...');
      console.log('FormData entries:', Array.from(formData.entries()).map(([k, v]) => [k, v instanceof File ? `${v.name} (${v.size} bytes)` : v]));
      
      let response: Response;
      try {
        response = await fetch(`/api/admin/experiences/${experience.id}`, {
          method: 'POST',
          body: formData,
        });
      } catch (networkError) {
        console.error('Network error:', networkError);
        alert(locale === 'fr' ? 'Erreur réseau lors de l\'upload' : 'Network error during upload');
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Vérifier d'abord si la réponse existe
      if (!response) {
        console.error('No response received');
        alert(locale === 'fr' ? 'Aucune réponse du serveur' : 'No response from server');
        return;
      }

      // Accéder directement aux propriétés de la réponse
      const status = 'status' in response ? response.status : undefined;
      const statusText = 'statusText' in response ? response.statusText : undefined;
      const ok = 'ok' in response ? response.ok : undefined;
      const headers = 'headers' in response ? response.headers : null;
      const contentType = headers?.get?.('content-type') || headers?.get?.('Content-Type') || 'unknown';
      
      console.log('Response check:', {
        hasStatus: 'status' in response,
        hasOk: 'ok' in response,
        hasHeaders: 'headers' in response,
        status,
        statusText,
        ok,
        contentType,
        responseType: typeof response,
        responseKeys: Object.keys(response || {})
      });

      // Si c'est une redirection, les fichiers n'ont peut-être pas été détectés
      if (status === 303 || status === 302 || status === 301 || (response as any)?.redirected) {
        console.warn('Received redirect instead of JSON - files may not have been detected');
        alert(locale === 'fr' ? 'Les fichiers n\'ont peut-être pas été détectés. Vérifiez la console du serveur.' : 'Files may not have been detected. Check server console.');
        router.refresh();
        return;
      }

      if (ok === false || (status !== undefined && status >= 400)) {
        console.error('Response not OK:', { status, statusText, contentType, ok });
        
        let error: any = { error: 'unknown_error', message: 'Erreur inconnue' };
        
        try {
          if (contentType && contentType.includes('application/json')) {
            error = await response.json();
          } else {
            const responseText = await response.text().catch(() => '');
            console.error('Non-JSON response text:', responseText);
            error = { 
              error: 'server_error', 
              message: responseText || statusText || `Erreur serveur (${status})` 
            };
          }
        } catch (e) {
          console.error('Failed to read response:', e);
          error = { 
            error: 'read_error', 
            message: `Impossible de lire la réponse (${status})` 
          };
        }
        
        const errorMessage = error.message || error.error || error.details || (locale === 'fr' ? 'Erreur lors de l\'upload' : 'Upload error');
        alert(`${errorMessage} (Status: ${status})`);
        console.error('Full error object:', error);
        console.error('Response details:', { status, statusText, contentType });
        return;
      }

      // Vérifier que la réponse est bien du JSON
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Expected JSON but got:', contentType);
        alert(locale === 'fr' ? 'Réponse inattendue du serveur' : 'Unexpected server response');
        return;
      }

      const data = await response.json().catch((e) => {
        console.error('Failed to parse response JSON:', e);
        return null;
      });

      if (!data) {
        alert(locale === 'fr' ? 'Impossible de lire la réponse du serveur' : 'Could not read server response');
        return;
      }

      console.log('Upload successful, received data:', data);

      if (Array.isArray(data.photoUrls)) {
        setPhotos(data.photoUrls);
        if (!imageUrl && data.photoUrls[0]) {
          setImageUrl(data.photoUrls[0]);
        }
      }
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
      }
    } catch (error) {
      console.error('Error:', error);
      alert(locale === 'fr' ? 'Erreur lors de l\'upload' : 'Upload error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Fonctions de réorganisation des images
  const movePhoto = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= photos.length) return;
    
    const newPhotos = [...photos];
    const [moved] = newPhotos.splice(index, 1);
    newPhotos.splice(newIndex, 0, moved);
    setPhotos(newPhotos);
  };

  // Handlers pour le drag & drop
  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (dragIndex === null || dragIndex === index) return;
    
    const newPhotos = [...photos];
    const [moved] = newPhotos.splice(dragIndex, 1);
    newPhotos.splice(index, 0, moved);
    setPhotos(newPhotos);
    setDragIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const removePhoto = (index: number) => {
    if (!confirm(locale === 'fr' ? 'Supprimer cette image ?' : 'Remove this image?')) return;
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    // Si l'image supprimée était l'image principale, définir la première comme principale
    if (imageUrl === photos[index] && newPhotos.length > 0) {
      setImageUrl(newPhotos[0]);
    } else if (newPhotos.length === 0) {
      setImageUrl(null);
    }
  };

  const setMainImage = (url: string) => {
    setImageUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      
      // Retirer les champs qui ne doivent pas être envoyés
      formData.delete('imageUrl');
      formData.delete('imageFile');
      formData.delete('imageFiles');
      
      // Ajouter photoUrls et imageUrl
      formData.append('photoUrls', JSON.stringify(photos));
      if (imageUrl) {
        formData.append('imageUrl', imageUrl);
      } else {
        formData.append('imageUrl', '');
      }
      
      // S'assurer que _method est bien défini
      formData.set('_method', 'PUT');

      const response = await fetch(`/api/admin/experiences/${experience.id}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      // Gérer les redirections (303, 302, 301)
      if (response.status === 303 || response.status === 302 || response.status === 301) {
        const redirectUrl = response.headers.get('location') || `/admin/experiences/${experience.id}?updated=1`;
        router.push(redirectUrl);
        router.refresh();
        return;
      }

      if (!response.ok) {
        let error: any;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            error = await response.json();
          } else {
            const text = await response.text();
            error = { error: 'server_error', message: text || `HTTP ${response.status}` };
          }
        } catch (e) {
          error = { error: 'unknown_error', message: `HTTP ${response.status}` };
        }
        alert(locale === 'fr' ? `Erreur lors de l'enregistrement: ${error.message || error.error}` : `Error saving: ${error.message || error.error}`);
        console.error('Error:', error);
        return;
      }

      // Si la réponse est du JSON
      try {
        const data = await response.json();
        if (data.ok) {
          // Mettre à jour les données locales si nécessaire
          if (data.photoUrls) {
            setPhotos(data.photoUrls);
          }
          if (data.imageUrl) {
            setImageUrl(data.imageUrl);
          }
          
          // Redirection après succès
          router.push(`/admin/experiences/${experience.id}?updated=1`);
          router.refresh();
        }
      } catch (e) {
        // Si ce n'est pas du JSON, supposer que c'est un succès
        router.push(`/admin/experiences/${experience.id}?updated=1`);
        router.refresh();
      }
    } catch (error) {
      console.error('Error:', error);
      alert(locale === 'fr' ? 'Erreur lors de l\'enregistrement' : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(locale === 'fr' ? 'Supprimer cette expérience ?' : 'Delete this experience?')) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('_method', 'DELETE');

      const response = await fetch(`/api/admin/experiences/${experience.id}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        router.push('/admin/experiences?deleted=1');
        router.refresh();
      } else {
        alert(locale === 'fr' ? 'Erreur lors de la suppression' : 'Error deleting');
      }
    } catch (error) {
      console.error('Error:', error);
      alert(locale === 'fr' ? 'Erreur lors de la suppression' : 'Error deleting');
    }
  };

  return (
    <form onSubmit={handleSubmit} className='mt-6 grid gap-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm'>
      <div className='grid sm:grid-cols-2 gap-4'>
        <label className='grid gap-1 text-sm'>
          <span>Slug</span>
          <input name='slug' defaultValue={experience.slug} className='h-11 rounded-lg border border-black/15 px-3' />
        </label>
        <label className='grid gap-1 text-sm'>
          <span>{locale === 'fr' ? 'Titre (FR)' : 'Title (FR)'}</span>
          <input required name='titleFr' defaultValue={experience.titleFr} className='h-11 rounded-lg border border-black/15 px-3' />
        </label>
        <label className='grid gap-1 text-sm'>
          <span>{locale === 'fr' ? 'Titre (EN)' : 'Title (EN)'}</span>
          <input required name='titleEn' defaultValue={experience.titleEn} className='h-11 rounded-lg border border-black/15 px-3' />
        </label>
      </div>
      <div className='grid sm:grid-cols-2 gap-4'>
        <label className='grid gap-1 text-sm'>
          <span>{locale === 'fr' ? 'Description (FR)' : 'Description (FR)'}</span>
          <textarea name='descFr' rows={4} defaultValue={experience.descFr || ''} className='rounded-lg border border-black/15 px-3 py-2' />
        </label>
        <label className='grid gap-1 text-sm'>
          <span>{locale === 'fr' ? 'Description (EN)' : 'Description (EN)'}</span>
          <textarea name='descEn' rows={4} defaultValue={experience.descEn || ''} className='rounded-lg border border-black/15 px-3 py-2' />
        </label>
      </div>
      <div className='border-t border-black/10 pt-4 mt-2'>
        <h3 className='text-sm font-semibold mb-3'>{locale === 'fr' ? 'Texte supplémentaire (affiché sur la page d\'expérience)' : 'Additional text (displayed on experience page)'}</h3>
        <div className='grid sm:grid-cols-2 gap-4'>
          <label className='grid gap-1 text-sm'>
            <span>{locale === 'fr' ? 'Texte supplémentaire (FR)' : 'Additional text (FR)'}</span>
            <textarea name='additionalTextFr' rows={6} defaultValue={(experience as any).additionalTextFr || ''} className='rounded-lg border border-black/15 px-3 py-2' placeholder={locale === 'fr' ? 'Texte affiché sous la description principale...' : 'Text displayed below main description...'} />
          </label>
          <label className='grid gap-1 text-sm'>
            <span>{locale === 'fr' ? 'Texte supplémentaire (EN)' : 'Additional text (EN)'}</span>
            <textarea name='additionalTextEn' rows={6} defaultValue={(experience as any).additionalTextEn || ''} className='rounded-lg border border-black/15 px-3 py-2' placeholder={locale === 'fr' ? 'Text displayed below main description...' : 'Text displayed below main description...'} />
          </label>
        </div>
      </div>
      <div className='grid sm:grid-cols-2 gap-4'>
        <label className='grid gap-1 text-sm'>
          <span>Heure (FR)</span>
          <input name='timeFr' defaultValue={experience.timeFr || ''} className='h-11 rounded-lg border border-black/15 px-3' />
        </label>
        <label className='grid gap-1 text-sm'>
          <span>Time (EN)</span>
          <input name='timeEn' defaultValue={experience.timeEn || ''} className='h-11 rounded-lg border border-black/15 px-3' />
        </label>
      </div>
      
      {/* Horaires fixes pour événements */}
      <div className='rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-4'>
        <div className='flex items-center gap-2'>
          <input 
            type='checkbox' 
            name='hasFixedTimes' 
            id='hasFixedTimes'
            defaultChecked={experience.hasFixedTimes || false}
            className='h-4 w-4 accent-[color:var(--primary)]'
          />
          <label htmlFor='hasFixedTimes' className='text-sm font-semibold text-blue-900 cursor-pointer'>
            {locale === 'fr' ? 'Horaires fixes (événements comme feux d\'artifice)' : 'Fixed times (events like fireworks)'}
          </label>
        </div>
        <p className='text-xs text-blue-700/80'>
          {locale === 'fr' 
            ? 'Si activé, les horaires de départ et retour seront fixes et non modifiables par le client. Exemple : Feu d\'artifice à 22h → départ à 20h30 maximum.'
            : 'If enabled, departure and return times will be fixed and non-editable by the client. Example: Fireworks at 10 PM → departure at 8:30 PM maximum.'}
        </p>
        <div className='grid sm:grid-cols-2 gap-4'>
          <label className='grid gap-1 text-sm'>
            <span>{locale === 'fr' ? 'Heure de départ fixe' : 'Fixed departure time'}</span>
            <input 
              type='time' 
              name='fixedDepartureTime' 
              defaultValue={experience.fixedDepartureTime || ''} 
              className='h-11 rounded-lg border border-black/15 px-3' 
              placeholder='20:30'
            />
            <p className='text-xs text-black/50'>{locale === 'fr' ? 'Format: HH:mm (ex: 20:30)' : 'Format: HH:mm (e.g. 20:30)'}</p>
          </label>
          <label className='grid gap-1 text-sm'>
            <span>{locale === 'fr' ? 'Heure de retour fixe' : 'Fixed return time'}</span>
            <input 
              type='time' 
              name='fixedReturnTime' 
              defaultValue={experience.fixedReturnTime || ''} 
              className='h-11 rounded-lg border border-black/15 px-3' 
              placeholder='23:00'
            />
            <p className='text-xs text-black/50'>{locale === 'fr' ? 'Format: HH:mm (ex: 23:00)' : 'Format: HH:mm (e.g. 23:00)'}</p>
          </label>
        </div>
      </div>
      
      {/* Gestion des images */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-semibold'>{locale === 'fr' ? 'Images' : 'Images'}</h2>
          <label className='text-sm inline-flex items-center gap-2 cursor-pointer'>
            <span className='rounded-full bg-blue-600 text-white px-4 h-9 inline-flex items-center font-medium'>
              {uploading ? (locale === 'fr' ? 'Téléversement…' : 'Uploading…') : (locale === 'fr' ? 'Ajouter des images' : 'Add images')}
            </span>
            <input 
              ref={fileInputRef}
              type='file' 
              multiple 
              accept='image/*' 
              disabled={uploading} 
              onChange={handleImageUpload} 
              className='hidden' 
            />
          </label>
        </div>
        
        {photos.length === 0 && (
          <div className='relative h-48 rounded-lg border border-dashed border-black/25 flex flex-col items-center justify-center text-xs text-black/60 bg-black/[0.02]'>
            <svg width='30' height='30' viewBox='0 0 24 24' className='mb-2 text-black/40'>
              <path fill='currentColor' d='M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7M14 3v2h3.59l-9.83 9.83l1.41 1.41L19 6.41V10h2V3h-7Z'/>
            </svg>
            <span>{locale === 'fr' ? 'Aucune image. Cliquez sur "Ajouter des images" pour commencer.' : 'No images. Click "Add images" to start.'}</span>
          </div>
        )}
        
        {photos.length > 0 && (
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
            {photos.map((url, i) => (
              <div
                key={`${url}-${i}`}
                draggable
                onDragStart={handleDragStart(i)}
                onDragOver={handleDragOver(i)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop(i)}
                onDragEnd={handleDragEnd}
                className={`group relative border border-black/10 rounded-lg overflow-hidden bg-gray-100 cursor-move transition ${
                  dragOverIndex === i ? 'ring-2 ring-[color:var(--primary)] scale-[1.02]' : ''
                } ${dragIndex === i ? 'opacity-50' : ''}`}
              >
                <div className='absolute top-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded cursor-grab select-none z-10'>
                  ≡
                </div>
                <img 
                  src={url} 
                  alt={`photo ${i + 1}`} 
                  className='w-full h-32 object-cover pointer-events-none'
                  onError={(e) => {
                    console.error('Image failed to load:', url);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', url);
                  }}
                />
                <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2'>
                  <button
                    type='button'
                    onClick={() => movePhoto(i, -1)}
                    disabled={i === 0}
                    className='text-xs px-2 py-1 bg-white/80 rounded disabled:opacity-30'
                    title={locale === 'fr' ? 'Monter' : 'Move up'}
                  >
                    ↑
                  </button>
                  <button
                    type='button'
                    onClick={() => movePhoto(i, 1)}
                    disabled={i === photos.length - 1}
                    className='text-xs px-2 py-1 bg-white/80 rounded disabled:opacity-30'
                    title={locale === 'fr' ? 'Descendre' : 'Move down'}
                  >
                    ↓
                  </button>
                  <button
                    type='button'
                    onClick={() => setMainImage(url)}
                    className={`text-xs px-2 py-1 rounded ${
                      imageUrl === url 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white/80 text-black'
                    }`}
                  >
                    {imageUrl === url 
                      ? (locale === 'fr' ? 'Principale' : 'Main')
                      : (locale === 'fr' ? 'Principale' : 'Main')
                    }
                  </button>
                  <button
                    type='button'
                    onClick={() => removePhoto(i)}
                    className='text-xs px-2 py-1 bg-red-600 text-white rounded'
                    title={locale === 'fr' ? 'Supprimer' : 'Remove'}
                  >
                    ×
                  </button>
                </div>
                {imageUrl === url && (
                  <div className='absolute top-1 left-8 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded z-10'>
                    {locale === 'fr' ? 'PRINCIPALE' : 'MAIN'}
                  </div>
                )}
                <div className='absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded'>
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {photos.length > 0 && (
          <p className='text-xs text-black/50 mt-2'>
            {locale === 'fr' 
              ? 'Glisser-déposer pour réordonner. Utilisez les boutons ↑↓ ou survolez pour plus d\'options.' 
              : 'Drag and drop to reorder. Use ↑↓ buttons or hover for more options.'}
          </p>
        )}
      </div>

      <div className='flex justify-between items-center pt-2 border-t border-black/10 mt-6'>
        <div className='flex gap-2 ml-auto'>
          <Link 
            href='/admin/experiences' 
            className='rounded-full h-11 px-6 border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium inline-flex items-center transition-colors duration-200'
          >
            {locale === 'fr' ? 'Annuler' : 'Cancel'}
          </Link>
          <button 
            type='submit' 
            disabled={saving}
            className='rounded-full h-11 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow'
            style={{ backgroundColor: saving ? '#60a5fa' : '#2563eb' }}
          >
            {saving ? (locale === 'fr' ? 'Enregistrement...' : 'Saving...') : (locale === 'fr' ? 'Enregistrer' : 'Save')}
          </button>
          <button 
            type='button'
            onClick={handleDelete}
            className='rounded-full h-11 px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold inline-flex items-center transition-all duration-200 shadow-sm hover:shadow'
          >
            {locale === 'fr' ? 'Supprimer' : 'Delete'}
          </button>
        </div>
      </div>
    </form>
  );
}
