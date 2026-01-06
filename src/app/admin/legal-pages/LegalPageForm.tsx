"use client";

import { useMemo } from 'react';

type FieldConfig = {
  showIntro: boolean;
  showContent: boolean;
  showCancellation: boolean;
  showPayment: boolean;
  showFuelDeposit: boolean;
};

function getFieldsForSlug(slug: string): FieldConfig {
  switch (slug) {
    case 'legal':
      return {
        showIntro: true,
        showContent: true,
        showCancellation: false,
        showPayment: false,
        showFuelDeposit: false,
      };
    case 'conditions-paiement':
      return {
        showIntro: true,
        showContent: true,
        showCancellation: false,
        showPayment: true,
        showFuelDeposit: true,
      };
    case 'cgu-mentions':
      return {
        showIntro: true,
        showContent: true,
        showCancellation: false,
        showPayment: false,
        showFuelDeposit: false,
      };
    case 'confidentialite':
      return {
        showIntro: true,
        showContent: true,
        showCancellation: false,
        showPayment: false,
        showFuelDeposit: false,
      };
    case 'reservations':
      return {
        showIntro: true,
        showContent: true,
        showCancellation: false,
        showPayment: false,
        showFuelDeposit: false,
      };
    case 'politique-annulation':
      return {
        showIntro: true,
        showContent: true,
        showCancellation: true,
        showPayment: false,
        showFuelDeposit: false,
      };
    case 'modalites-paiement':
      return {
        showIntro: true,
        showContent: true,
        showCancellation: false,
        showPayment: true,
        showFuelDeposit: false,
      };
    case 'carburant-depot':
      return {
        showIntro: true,
        showContent: true,
        showCancellation: false,
        showPayment: false,
        showFuelDeposit: true,
      };
    default:
      return {
        showIntro: true,
        showContent: true,
        showCancellation: true,
        showPayment: true,
        showFuelDeposit: true,
      };
  }
}

export default function LegalPageForm({ 
  slug, 
  locale,
  defaultValues,
  formAction,
  method = 'POST'
}: { 
  slug: string;
  locale: 'fr' | 'en';
  defaultValues?: any;
  formAction: string;
  method?: 'POST' | 'PUT';
}) {
  const fields = useMemo(() => getFieldsForSlug(slug), [slug]);

  return (
    <form id='legal-form' action={formAction} method='post' className='grid gap-4'>
      {method === 'PUT' && <input type='hidden' name='_method' value='PUT' />}
      
      <label className='grid gap-1 text-sm'>
        <span>Slug *</span>
        <input 
          name='slug' 
          required 
          defaultValue={defaultValues?.slug || slug} 
          className='h-11 rounded-lg border border-black/15 px-3' 
        />
      </label>
      
      <label className='grid gap-1 text-sm'>
        <span>Titre (FR) *</span>
        <input 
          name='titleFr' 
          required 
          defaultValue={defaultValues?.titleFr || ''} 
          className='h-11 rounded-lg border border-black/15 px-3' 
        />
      </label>
      
      <label className='grid gap-1 text-sm'>
        <span>Titre (EN) *</span>
        <input 
          name='titleEn' 
          required 
          defaultValue={defaultValues?.titleEn || ''} 
          className='h-11 rounded-lg border border-black/15 px-3' 
        />
      </label>

      {fields.showIntro && (
        <>
          <label className='grid gap-1 text-sm'>
            <span>Intro (FR)</span>
            <textarea 
              name='introFr' 
              rows={3} 
              defaultValue={defaultValues?.introFr || ''} 
              className='rounded-lg border border-black/15 px-3 py-2' 
            />
          </label>
          <label className='grid gap-1 text-sm'>
            <span>Intro (EN)</span>
            <textarea 
              name='introEn' 
              rows={3} 
              defaultValue={defaultValues?.introEn || ''} 
              className='rounded-lg border border-black/15 px-3 py-2' 
            />
          </label>
        </>
      )}

      {fields.showContent && (
        <>
          <label className='grid gap-1 text-sm'>
            <span>Infos générales (FR)</span>
            <textarea 
              name='contentFr' 
              rows={5} 
              defaultValue={defaultValues?.contentFr || ''} 
              className='rounded-lg border border-black/15 px-3 py-2' 
            />
          </label>
          <label className='grid gap-1 text-sm'>
            <span>Infos générales (EN)</span>
            <textarea 
              name='contentEn' 
              rows={5} 
              defaultValue={defaultValues?.contentEn || ''} 
              className='rounded-lg border border-black/15 px-3 py-2' 
            />
          </label>
        </>
      )}

      {fields.showCancellation && (
        <>
          <label className='grid gap-1 text-sm'>
            <span>Annulation (FR)</span>
            <textarea 
              name='cancellationFr' 
              rows={4} 
              defaultValue={defaultValues?.cancellationFr || ''} 
              className='rounded-lg border border-black/15 px-3 py-2' 
            />
          </label>
          <label className='grid gap-1 text-sm'>
            <span>Annulation (EN)</span>
            <textarea 
              name='cancellationEn' 
              rows={4} 
              defaultValue={defaultValues?.cancellationEn || ''} 
              className='rounded-lg border border-black/15 px-3 py-2' 
            />
          </label>
        </>
      )}

      {fields.showPayment && (
        <>
          <label className='grid gap-1 text-sm'>
            <span>Paiement (FR)</span>
            <textarea 
              name='paymentFr' 
              rows={4} 
              defaultValue={defaultValues?.paymentFr || ''} 
              className='rounded-lg border border-black/15 px-3 py-2' 
            />
          </label>
          <label className='grid gap-1 text-sm'>
            <span>Paiement (EN)</span>
            <textarea 
              name='paymentEn' 
              rows={4} 
              defaultValue={defaultValues?.paymentEn || ''} 
              className='rounded-lg border border-black/15 px-3 py-2' 
            />
          </label>
        </>
      )}

      {fields.showFuelDeposit && (
        <>
          <label className='grid gap-1 text-sm'>
            <span>Carburant & Dépôt (FR)</span>
            <textarea 
              name='fuelDepositFr' 
              rows={4} 
              defaultValue={defaultValues?.fuelDepositFr || ''} 
              className='rounded-lg border border-black/15 px-3 py-2' 
            />
          </label>
          <label className='grid gap-1 text-sm'>
            <span>Fuel & Deposit (EN)</span>
            <textarea 
              name='fuelDepositEn' 
              rows={4} 
              defaultValue={defaultValues?.fuelDepositEn || ''} 
              className='rounded-lg border border-black/15 px-3 py-2' 
            />
          </label>
        </>
      )}
    </form>
  );
}

