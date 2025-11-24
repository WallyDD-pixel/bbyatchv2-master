"use client";

export default function DeleteLegalPageButton({ id, locale }: { id: number; locale: 'fr' | 'en' }) {
  return (
    <form 
      action={`/api/admin/legal-pages/${id}`} 
      method="post"
      onSubmit={(e) => {
        if (!confirm(locale === 'fr' ? 'Supprimer cette page ?' : 'Delete this page?')) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="_method" value="DELETE" />
      <button
        type="submit"
        className="rounded-full h-10 px-4 bg-red-600 text-white hover:brightness-110"
      >
        {locale === 'fr' ? 'Supprimer' : 'Delete'}
      </button>
    </form>
  );
}

