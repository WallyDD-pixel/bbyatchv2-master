"use client";
import { useRouter } from 'next/navigation';

export default function DeleteUsedBoatButton({ id, locale }: { id: number; locale: 'fr' | 'en' }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(locale === 'fr' ? 'Supprimer ce bateau d\'occasion ?' : 'Delete this used boat?')) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('id', String(id));

      const response = await fetch('/api/admin/used-boats/delete', {
        method: 'POST',
        body: formData,
      });

      if (response.ok || response.redirected) {
        window.location.href = '/admin/used-boats?deleted=1';
      } else {
        const error = await response.json().catch(() => ({ error: 'unknown' }));
        alert(locale === 'fr' ? `Erreur lors de la suppression: ${error.error || 'Erreur inconnue'}` : `Error deleting boat: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(locale === 'fr' ? 'Erreur lors de la suppression' : 'Error deleting boat');
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="text-[11px] rounded-full border border-red-600/30 text-red-700 px-3 h-7 inline-flex items-center hover:bg-red-50 ml-2"
    >
      {locale === 'fr' ? 'Supprimer' : 'Delete'}
    </button>
  );
}

