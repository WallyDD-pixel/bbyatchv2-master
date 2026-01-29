"use client";
import { useEffect, useRef } from 'react';

interface FormSubmitHandlerProps {
  newImageFiles: File[];
}

export default function FormSubmitHandler({ newImageFiles }: FormSubmitHandlerProps) {
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const form = document.querySelector('form[action="/api/admin/used-boats/update"]') as HTMLFormElement;
    if (!form) return;

    formRef.current = form;

    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      e.stopPropagation();

      const form = e.target as HTMLFormElement;
      
      // Forcer la mise à jour des champs cachés avant de créer FormData
      // Les champs cachés sont mis à jour par React, mais on doit s'assurer qu'ils sont à jour
      const keepPhotosInput = form.querySelector('input[name="keepPhotos"]') as HTMLInputElement;
      const mainImageInput = form.querySelector('input[name="mainImageChoice"]') as HTMLInputElement;
      
      if (keepPhotosInput) {
        console.log('📤 keepPhotos avant soumission:', keepPhotosInput.value);
      }
      if (mainImageInput) {
        console.log('📤 mainImageChoice avant soumission:', mainImageInput.value || '(vide)');
      }
      
      const formData = new FormData(form);

      // S'assurer que les champs cachés sont bien inclus même s'ils sont vides
      if (keepPhotosInput) {
        formData.set('keepPhotos', keepPhotosInput.value);
      }
      if (mainImageInput) {
        formData.set('mainImageChoice', mainImageInput.value);
      }

      // Ajouter les nouveaux fichiers d'images
      newImageFiles.forEach((file) => {
        formData.append('images', file);
      });
      
      // Vérifier ce qui est dans FormData
      console.log('📤 FormData keepPhotos:', formData.get('keepPhotos'));
      console.log('📤 FormData mainImageChoice:', formData.get('mainImageChoice') || '(vide)');

      try {
        const response = await fetch('/api/admin/used-boats/update', {
          method: 'POST',
          body: formData,
          redirect: 'follow', // Suivre les redirections automatiquement
        });

        // Vérifier si la réponse est une redirection (status 303 ou 307)
        if (response.status === 303 || response.status === 307 || response.redirected) {
          // Redirection gérée par le serveur
          const redirectUrl = response.url || response.headers.get('Location') || window.location.href;
          window.location.href = redirectUrl;
        } else if (response.ok) {
          // Si pas de redirection mais OK, rediriger manuellement
          const url = new URL(window.location.href);
          url.searchParams.set('updated', '1');
          window.location.href = url.toString();
        } else {
          // Erreur - essayer de lire le JSON d'erreur
          const error = await response.json().catch(() => ({ error: 'unknown', details: `Status: ${response.status}` }));
          console.error('Erreur API:', error);
          alert(`Erreur lors de l'enregistrement: ${error.error || error.details || 'Erreur inconnue'}`);
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
  }, [newImageFiles]);

  return null;
}
