"use client";
import { useState } from 'react';

export default function NewUserForm({ locale }: { locale: 'fr' | 'en' }){
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);
  const t = (fr:string,en:string)=> locale==='fr'? fr:en;
  async function submit(e:React.FormEvent){
    e.preventDefault();
    setLoading(true); setDone(false);
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const res = await fetch('/api/admin/users', { method:'POST', body: fd });
    if(res.ok && form){ form.reset(); setDone(true); }
    setLoading(false);
  }
  return (
    <form onSubmit={submit} className='space-y-4'>
      <div className='space-y-1'>
        <label className='text-xs font-medium text-black/60'>{t('Email','Email')} *</label>
        <input name='email' type='email' required className='w-full border border-black/15 rounded-md h-9 px-3 text-sm'/>
      </div>
      <div className='flex gap-2'>
        <div className='flex-1 space-y-1'>
          <label className='text-xs font-medium text-black/60'>{t('Prénom','First name')}</label>
          <input name='firstName' type='text' className='w-full border border-black/15 rounded-md h-9 px-3 text-sm'/>
        </div>
        <div className='flex-1 space-y-1'>
          <label className='text-xs font-medium text-black/60'>{t('Nom','Last name')}</label>
          <input name='lastName' type='text' className='w-full border border-black/15 rounded-md h-9 px-3 text-sm'/>
        </div>
      </div>
      <div className='space-y-1'>
        <label className='text-xs font-medium text-black/60'>{t('Mot de passe (optionnel)','Password (optional)')}</label>
        <input name='password' type='text' className='w-full border border-black/15 rounded-md h-9 px-3 text-sm' placeholder={t('(laisser vide)','(leave blank)')}/>
        <p className='text-[10px] text-black/50'>{t("Si vide l'utilisateur devra définir un mot de passe plus tard.",'If empty user must set password later.')}</p>
      </div>
      <div className='space-y-1'>
        <label className='text-xs font-medium text-black/60'>{t('Rôle','Role')}</label>
        <select name='role' className='w-full border border-black/15 rounded-md h-9 px-3 text-sm bg-white'>
          <option value='user'>{t('Utilisateur','User')}</option>
          <option value='agency'>{t('Agence','Agency')}</option>
          <option value='admin'>Admin</option>
        </select>
      </div>
      <button disabled={loading} className='w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow' style={{ backgroundColor: loading ? '#60a5fa' : '#2563eb' }}>{loading? t('Création...','Creating...'): t('Créer','Create')}</button>
      {done && <div className='text-xs text-emerald-600'>{t('Utilisateur créé','User created')}</div>}
    </form>
  );
}
