"use client";
import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function InfoCardNewForm({ locale }: { locale: "fr" | "en" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const removeBtnRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      const titleFr = formData.get('titleFr')?.toString().trim() || '';
      const titleEn = formData.get('titleEn')?.toString().trim() || '';
      
      if (!titleFr || !titleEn) {
        setError(locale === 'fr' 
          ? 'Veuillez remplir les titres en français et en anglais.' 
          : 'Please fill in the titles in French and English.');
        setSubmitting(false);
        return;
      }

      const response = await fetch('/api/admin/info-cards', {
        method: 'POST',
        body: formData,
      });

      if (response.ok || response.redirected) {
        // Redirection en cas de succès
        const langParam = searchParams.get('lang');
        const redirectUrl = `/admin/info-cards${langParam ? `?lang=${langParam}` : ''}`;
        router.push(redirectUrl);
        router.refresh();
      } else {
        const data = await response.json().catch(() => ({}));
        let errorMessage = locale === 'fr' 
          ? 'Une erreur est survenue lors de la création de la carte.' 
          : 'An error occurred while creating the card.';
        
        if (data.error === 'missing_fields') {
          errorMessage = locale === 'fr'
            ? 'Veuillez remplir tous les champs obligatoires (titres FR et EN).'
            : 'Please fill in all required fields (FR and EN titles).';
        } else if (data.error === 'unauthorized') {
          errorMessage = locale === 'fr'
            ? 'Vous n\'êtes pas autorisé à effectuer cette action.'
            : 'You are not authorized to perform this action.';
        } else if (data.details) {
          errorMessage = `${errorMessage} ${data.details}`;
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      setError(locale === 'fr'
        ? 'Une erreur réseau est survenue. Veuillez réessayer.'
        : 'A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const clearImage = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (previewImgRef.current) {
      previewImgRef.current.src = '';
      previewImgRef.current.classList.add('hidden');
    }
    if (removeBtnRef.current) removeBtnRef.current.classList.add('hidden');
    if (dropZoneRef.current) dropZoneRef.current.classList.remove('has-image');
  };

  return (
    <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      {error && (
        <div className='mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm'>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className='grid gap-4'>
        <label className='grid gap-1 text-sm'>
          <span>{locale==='fr'? 'Titre (FR)':'Title (FR)'} *</span>
          <input required name='titleFr' className='h-11 rounded-lg border border-black/15 px-3' />
        </label>
        <label className='grid gap-1 text-sm'>
          <span>{locale==='fr'? 'Titre (EN)':'Title (EN)'} *</span>
          <input required name='titleEn' className='h-11 rounded-lg border border-black/15 px-3' />
        </label>
        <label className='grid gap-1 text-sm'>
          <span>{locale==='fr'? 'Description (FR)':'Description (FR)'}</span>
          <textarea name='descFr' rows={4} className='rounded-lg border border-black/15 px-3 py-2' />
        </label>
        <label className='grid gap-1 text-sm'>
          <span>{locale==='fr'? 'Description (EN)':'Description (EN)'}</span>
          <textarea name='descEn' rows={4} className='rounded-lg border border-black/15 px-3 py-2' />
        </label>
        <div className='border-t border-black/10 pt-4 mt-2'>
          <h3 className='text-sm font-semibold mb-3'>{locale==='fr'? 'Contenu détaillé (page dédiée)':'Detailed content (dedicated page)'}</h3>
          <label className='grid gap-1 text-sm'>
            <span>{locale==='fr'? 'Texte détaillé (FR)':'Detailed text (FR)'}</span>
            <textarea name='contentFr' rows={6} className='rounded-lg border border-black/15 px-3 py-2' placeholder={locale==='fr'? 'Texte complet affiché sur la page dédiée...':'Full text displayed on dedicated page...'} />
          </label>
          <label className='grid gap-1 text-sm mt-3'>
            <span>{locale==='fr'? 'Texte détaillé (EN)':'Detailed text (EN)'}</span>
            <textarea name='contentEn' rows={6} className='rounded-lg border border-black/15 px-3 py-2' placeholder={locale==='fr'? 'Full text displayed on dedicated page...':'Full text displayed on dedicated page...'} />
          </label>
        </div>
        <div className='border-t border-black/10 pt-4 mt-2'>
          <h3 className='text-sm font-semibold mb-3'>{locale==='fr'? 'Bouton CTA (optionnel)':'CTA Button (optional)'}</h3>
          <label className='grid gap-1 text-sm'>
            <span>{locale==='fr'? 'URL du lien':'Link URL'}</span>
            <input name='ctaUrl' type='url' className='h-11 rounded-lg border border-black/15 px-3' placeholder='https://...' />
          </label>
          <label className='grid gap-1 text-sm mt-3'>
            <span>{locale==='fr'? 'Label du bouton (FR)':'Button label (FR)'}</span>
            <input name='ctaLabelFr' className='h-11 rounded-lg border border-black/15 px-3' placeholder={locale==='fr'? 'En savoir plus':'Learn more'} />
          </label>
          <label className='grid gap-1 text-sm mt-3'>
            <span>{locale==='fr'? 'Label du bouton (EN)':'Button label (EN)'}</span>
            <input name='ctaLabelEn' className='h-11 rounded-lg border border-black/15 px-3' placeholder='Learn more' />
          </label>
        </div>
        <div className='grid gap-2 text-sm'>
          <span>{locale==='fr'? 'Image':'Image'}</span>
          <input type='hidden' name='imageUrl' value='' />
          <div 
            ref={dropZoneRef}
            className='relative h-40 rounded-lg border border-dashed border-black/25 flex flex-col items-center justify-center text-xs text-black/60 cursor-pointer bg-black/[0.02] hover:bg-black/[0.04] transition'
            onDragOver={(e) => {
              e.preventDefault();
              if (dropZoneRef.current) dropZoneRef.current.classList.add('ring', 'ring-[color:var(--primary)]');
            }}
            onDragLeave={(e) => {
              if (dropZoneRef.current) dropZoneRef.current.classList.remove('ring', 'ring-[color:var(--primary)]');
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dropZoneRef.current) dropZoneRef.current.classList.remove('ring', 'ring-[color:var(--primary)]');
              const files = e.dataTransfer.files;
              if (files && files[0] && fileInputRef.current) {
                fileInputRef.current.files = files;
                const ev = new Event('change', { bubbles: true });
                fileInputRef.current.dispatchEvent(ev);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              ref={fileInputRef}
              id='fileInput' 
              name='imageFile' 
              type='file' 
              accept='image/*' 
              className='hidden' 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && previewImgRef.current && removeBtnRef.current && dropZoneRef.current) {
                  const url = URL.createObjectURL(file);
                  previewImgRef.current.src = url;
                  previewImgRef.current.classList.remove('hidden');
                  removeBtnRef.current.classList.remove('hidden');
                  dropZoneRef.current.classList.add('has-image');
                } else {
                  clearImage();
                }
              }}
            />
            <div className='pointer-events-none flex flex-col items-center px-4 text-center'>
              <svg width='28' height='28' viewBox='0 0 24 24' className='mb-2 text-black/40'>
                <path fill='currentColor' d='M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7M14 3v2h3.59l-9.83 9.83l1.41 1.41L19 6.41V10h2V3h-7Z'/>
              </svg>
              <span>{locale==='fr'? 'Glisser-déposer ou cliquer pour choisir':'Drag & drop or click to choose'}</span>
              <span className='mt-1 text-[11px] text-black/40'>{locale==='fr'? 'PNG/JPG, max ~5MB':'PNG/JPG, max ~5MB'}</span>
            </div>
            <img 
              ref={previewImgRef}
              alt='' 
              className='hidden absolute inset-0 w-full h-full object-cover rounded-lg' 
            />
            <div 
              ref={removeBtnRef}
              className='hidden absolute top-2 right-2 bg-white/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-medium shadow border border-black/10 cursor-pointer z-10'
              onClick={(e) => {
                e.stopPropagation();
                clearImage();
              }}
            >
              ×
            </div>
          </div>
        </div>
        <label className='grid gap-1 text-sm'>
          <span>Ordre (sort)</span>
          <input type='number' name='sort' defaultValue={0} className='h-11 rounded-lg border border-black/15 px-3' />
        </label>
        <div className='flex justify-end gap-2'>
          <a href='/admin/info-cards' className='rounded-full h-10 px-4 border border-black/15 bg-white hover:bg-black/5'>{locale==='fr'? 'Annuler':'Cancel'}</a>
          <button 
            type='submit' 
            disabled={submitting}
            className='rounded-full h-10 px-6 bg-[color:var(--primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {submitting ? (locale==='fr'? 'Création...':'Creating...') : (locale==='fr'? 'Créer':'Create')}
          </button>
        </div>
      </form>
    </div>
  );
}

