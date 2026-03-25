"use client";
import { useEffect, useRef, type RefObject } from 'react';

interface FormSubmitHandlerProps {
  /** Ref toujours à jour (évite les fichiers manquants si l’état React n’a pas encore rejoué). */
  newImageFilesRef: RefObject<File[]>;
}

export default function FormSubmitHandler({ newImageFilesRef }: FormSubmitHandlerProps) {
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const form = document.querySelector('form[action="/api/admin/used-boats/update"]') as HTMLFormElement;
    if (!form) return;

    formRef.current = form;

    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      e.stopPropagation();

      const form = e.target as HTMLFormElement;
      
      // Laisser React flusher les mises à jour d'état (ex: après suppression d'image)
      await new Promise(resolve => setTimeout(resolve, 0));
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      const keepPhotosInput = form.querySelector('input[name="keepPhotos"]') as HTMLInputElement;
      const mainImageInput = form.querySelector('input[name="mainImageChoice"]') as HTMLInputElement;
      const mainNewIdxInput = form.querySelector('input[name="mainNewUploadIndex"]') as HTMLInputElement;
      
      if (keepPhotosInput) {
        console.log('📤 keepPhotos avant soumission:', keepPhotosInput.value?.substring(0, 80) + (keepPhotosInput.value && keepPhotosInput.value.length > 80 ? '...' : ''));
      }
      if (mainImageInput) {
        console.log('📤 mainImageChoice avant soumission:', mainImageInput.value || '(vide)');
      }
      
      const formData = new FormData(form);
      const pendingImageFiles = newImageFilesRef.current || [];

      // S'assurer que les champs cachés sont bien inclus même s'ils sont vides
      // Utiliser les valeurs directement depuis les inputs pour garantir qu'elles sont à jour
      if (keepPhotosInput) {
        const keepPhotosValue = keepPhotosInput.value || '[]';
        formData.set('keepPhotos', keepPhotosValue);
        console.log('📤 keepPhotos forcé dans FormData:', keepPhotosValue);
      }
      if (mainImageInput) {
        let mainImageValue = mainImageInput.value || '';
        // Ne pas envoyer un data: énorme : la principale parmi les nouveaux fichiers vient de mainNewUploadIndex
        if (
          pendingImageFiles.length > 0 &&
          (mainImageValue.startsWith('data:') || mainImageValue.startsWith('blob:'))
        ) {
          mainImageValue = '';
        }
        formData.set('mainImageChoice', mainImageValue);
        console.log(
          '📤 mainImageChoice dans FormData:',
          mainImageValue ? `(${mainImageValue.length} car.)` : '(vide)'
        );
      }
      if (mainNewIdxInput) {
        formData.set('mainNewUploadIndex', mainNewIdxInput.value || '');
      }

      // Ajouter les nouveaux fichiers d'images (depuis la ref = dernier état connu)
      pendingImageFiles.forEach((file) => {
        formData.append('images', file);
      });
      
      // Vérifier ce qui est dans FormData
      console.log('📤 FormData keepPhotos:', formData.get('keepPhotos'));
      console.log('📤 FormData mainImageChoice:', formData.get('mainImageChoice') || '(vide)');

      try {
        // manual : ne pas suivre la 303 en fetch (évite CORS si Location pointait vers un autre domaine)
        const response = await fetch('/api/admin/used-boats/update', {
          method: 'POST',
          body: formData,
          redirect: 'manual',
        });

        const loc = response.headers.get('Location');
        if (
          (response.status === 303 || response.status === 302 || response.status === 307) &&
          loc
        ) {
          const target = loc.startsWith('http')
            ? loc
            : `${window.location.origin}${loc.startsWith('/') ? '' : '/'}${loc}`;
          window.location.assign(target);
          return;
        }

        // Certains navigateurs renvoient 0 + opaqueredirect pour une 302/303 en mode manual
        if (response.type === 'opaqueredirect' || response.status === 0) {
          window.location.reload();
          return;
        }

        if (response.ok) {
          const url = new URL(window.location.href);
          url.searchParams.set('updated', '1');
          window.location.href = url.toString();
        } else {
          const error = await response.json().catch(() => ({
            error: 'unknown',
            details: `Status: ${response.status}`,
          }));
          console.error('Erreur API:', error);
          alert(
            `Erreur lors de l'enregistrement: ${error.error || error.details || 'Erreur inconnue'}`
          );
        }
      } catch (error) {
        console.error('Erreur lors de la soumission:', error);
        alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
      }
    };

    form.addEventListener('submit', handleSubmit);

    return () => {
      form.removeEventListener('submit', handleSubmit);
    };
  }, [newImageFilesRef]);

  return null;
}
