"use client";
export default function DeleteInfoCardButton({ id, locale }: { id:number; locale:'fr'|'en' }){
  return (
    <form action={`/api/admin/info-cards/${id}`} method='post' onSubmit={(e)=>{ if(!confirm(locale==='fr'? 'Supprimer cette carte ?':'Delete this card?')) e.preventDefault(); }}>
      <input type='hidden' name='_method' value='DELETE' />
      <button className='text-[11px] rounded-full border border-red-600/30 text-red-700 px-3 h-7 inline-flex items-center hover:bg-red-50'>
        {locale==='fr'? 'Suppr.':'Delete'}
      </button>
    </form>
  );
}
