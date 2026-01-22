'use client';
export default function ActionButtons({ id, status, locale }: { id:string; status:string; locale:'fr'|'en' }){
  const disabled = (s:string)=> status===s;
  const askReject = (e:React.FormEvent)=>{ if(status!=='rejected' && !confirm(locale==='fr'? 'Refuser cette demande ?':'Reject this request?')) e.preventDefault(); };
  return (
    <div className='flex items-center gap-1.5 sm:gap-2 flex-wrap'>
      <form action={`/api/admin/agency-requests/${id}`} method='post'>
        <input type='hidden' name='_method' value='PATCH' />
        <input type='hidden' name='status' value='approved' />
        <button type='submit' disabled={disabled('approved')} className='text-[10px] sm:text-xs rounded-full px-2.5 sm:px-3 h-7 sm:h-8 inline-flex items-center justify-center border border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap min-w-[70px] sm:min-w-[80px]'>
          {locale==='fr'? 'Accepter':'Approve'}
        </button>
      </form>
      <form action={`/api/admin/agency-requests/${id}`} method='post' onSubmit={askReject}>
        <input type='hidden' name='_method' value='PATCH' />
        <input type='hidden' name='status' value='rejected' />
        <button type='submit' disabled={disabled('rejected')} className='text-[10px] sm:text-xs rounded-full px-2.5 sm:px-3 h-7 sm:h-8 inline-flex items-center justify-center border border-red-600/30 text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap min-w-[70px] sm:min-w-[80px]'>
          {locale==='fr'? 'Refuser':'Reject'}
        </button>
      </form>
      <form action={`/api/admin/agency-requests/${id}`} method='post'>
        <input type='hidden' name='_method' value='PATCH' />
        <input type='hidden' name='status' value='converted' />
        <button type='submit' disabled={disabled('converted')} className='text-[10px] sm:text-xs rounded-full px-2.5 sm:px-3 h-7 sm:h-8 inline-flex items-center justify-center border border-indigo-600/30 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap min-w-[70px] sm:min-w-[80px]'>
          {locale==='fr'? 'Convertir':'Convert'}
        </button>
      </form>
    </div>
  );
}
