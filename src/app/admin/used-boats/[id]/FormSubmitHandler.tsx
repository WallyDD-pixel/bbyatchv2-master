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
      const formData = new FormData(form);

      // Ajouter les nouveaux fichiers d'images
      newImageFiles.forEach((file) => {
        formData.append('images', file);
      });

      try {
        const response = await fetch('/api/admin/used-boats/update', {
          method: 'POST',
          body: formData,
        });

        if (response.ok || response.redirected) {
          // Redirection gérée par le serveur
          if (response.redirected) {
            window.location.href = response.url;
          } else {
            const url = new URL(window.location.href);
            url.searchParams.set('updated', '1');
            window.location.href = url.toString();
          }
        } else {
          const error = await response.json().catch(() => ({ error: 'unknown' }));
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
