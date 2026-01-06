"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SEOTrackingForm({ settings, locale }: { settings: any; locale: 'fr' | 'en' }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    facebookPixelId: settings?.facebookPixelId || '',
    googleAnalyticsId: settings?.googleAnalyticsId || '',
    googleTagManagerId: settings?.googleTagManagerId || '',
    metaTitle: settings?.metaTitle || '',
    metaDescription: settings?.metaDescription || '',
    metaKeywords: settings?.metaKeywords || '',
    ogImage: settings?.ogImage || '',
    siteUrl: settings?.siteUrl || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value || '');
      });

      const res = await fetch('/api/admin/seo-tracking', {
        method: 'POST',
        body: formDataToSend,
      });

      if (res.ok) {
        alert(locale === 'fr' ? 'Paramètres sauvegardés !' : 'Settings saved!');
        router.refresh();
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert(locale === 'fr' ? 'Erreur lors de la sauvegarde' : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Section Tracking */}
      <div className='rounded-2xl border border-black/10 bg-white p-6 shadow-sm'>
        <h2 className='text-lg font-semibold mb-4 flex items-center gap-2'>
          <span>📊</span>
          Outils de suivi (Tracking)
        </h2>
        <p className='text-sm text-black/60 mb-6'>
          Configurez les outils de suivi pour analyser le trafic et les conversions sur votre site.
        </p>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Facebook Pixel */}
          <div>
            <label className='block text-sm font-medium mb-2'>
              Facebook Pixel ID (Meta Pixel)
            </label>
            <input
              type='text'
              value={formData.facebookPixelId}
              onChange={(e) => setFormData({ ...formData, facebookPixelId: e.target.value })}
              placeholder='Ex: 123456789012345'
              className='w-full h-11 rounded-lg border border-black/15 px-3'
            />
            <p className='text-xs text-black/50 mt-1'>
              Trouvez votre ID dans le Gestionnaire d'événements Facebook (business.facebook.com)
            </p>
          </div>

          {/* Google Analytics */}
          <div>
            <label className='block text-sm font-medium mb-2'>
              Google Analytics ID (GA4)
            </label>
            <input
              type='text'
              value={formData.googleAnalyticsId}
              onChange={(e) => setFormData({ ...formData, googleAnalyticsId: e.target.value })}
              placeholder='Ex: G-XXXXXXXXXX'
              className='w-full h-11 rounded-lg border border-black/15 px-3'
            />
            <p className='text-xs text-black/50 mt-1'>
              Format: G-XXXXXXXXXX (trouvé dans Google Analytics 4)
            </p>
          </div>

          {/* Google Tag Manager */}
          <div>
            <label className='block text-sm font-medium mb-2'>
              Google Tag Manager ID
            </label>
            <input
              type='text'
              value={formData.googleTagManagerId}
              onChange={(e) => setFormData({ ...formData, googleTagManagerId: e.target.value })}
              placeholder='Ex: GTM-XXXXXXX'
              className='w-full h-11 rounded-lg border border-black/15 px-3'
            />
            <p className='text-xs text-black/50 mt-1'>
              Format: GTM-XXXXXXX (optionnel)
            </p>
          </div>

          {/* Section SEO */}
          <div className='pt-6 border-t border-black/10 mt-6'>
            <h2 className='text-lg font-semibold mb-4 flex items-center gap-2'>
              <span>🔍</span>
              Paramètres SEO
            </h2>

            {/* Meta Title */}
            <div className='mb-4'>
              <label className='block text-sm font-medium mb-2'>
                Titre par défaut (Meta Title)
              </label>
              <input
                type='text'
                value={formData.metaTitle}
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                placeholder='BB SERVICES CHARTER - Location de yachts sur la Côte d\'Azur'
                className='w-full h-11 rounded-lg border border-black/15 px-3'
              />
              <p className='text-xs text-black/50 mt-1'>
                {formData.metaTitle.length}/60 caractères recommandés
              </p>
            </div>

            {/* Meta Description */}
            <div className='mb-4'>
              <label className='block text-sm font-medium mb-2'>
                Description par défaut (Meta Description)
              </label>
              <textarea
                value={formData.metaDescription}
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                placeholder='Réservez votre yacht de luxe pour une expérience inoubliable sur la Côte d\'Azur...'
                rows={3}
                className='w-full rounded-lg border border-black/15 px-3 py-2'
              />
              <p className='text-xs text-black/50 mt-1'>
                {formData.metaDescription.length}/160 caractères recommandés
              </p>
            </div>

            {/* Meta Keywords */}
            <div className='mb-4'>
              <label className='block text-sm font-medium mb-2'>
                Mots-clés (Meta Keywords)
              </label>
              <input
                type='text'
                value={formData.metaKeywords}
                onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
                placeholder='location yacht, location bateau, côte d\'azur, riviera italienne'
                className='w-full h-11 rounded-lg border border-black/15 px-3'
              />
              <p className='text-xs text-black/50 mt-1'>
                Séparez les mots-clés par des virgules
              </p>
            </div>

            {/* OG Image */}
            <div className='mb-4'>
              <label className='block text-sm font-medium mb-2'>
                Image Open Graph (OG Image)
              </label>
              <input
                type='url'
                value={formData.ogImage}
                onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                placeholder='https://votresite.com/og-image.jpg'
                className='w-full h-11 rounded-lg border border-black/15 px-3'
              />
              <p className='text-xs text-black/50 mt-1'>
                URL de l'image partagée sur les réseaux sociaux (1200x630px recommandé)
              </p>
            </div>

            {/* Site URL */}
            <div>
              <label className='block text-sm font-medium mb-2'>
                URL du site
              </label>
              <input
                type='url'
                value={formData.siteUrl}
                onChange={(e) => setFormData({ ...formData, siteUrl: e.target.value })}
                placeholder='https://bbservicescharter.com'
                className='w-full h-11 rounded-lg border border-black/15 px-3'
              />
              <p className='text-xs text-black/50 mt-1'>
                URL de base de votre site (sans slash final)
              </p>
            </div>
          </div>

          <div className='flex justify-end gap-2 pt-4'>
            <button
              type='submit'
              disabled={saving}
              className='rounded-full h-10 px-6 bg-[color:var(--primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50'
            >
              {saving ? (locale === 'fr' ? 'Enregistrement...' : 'Saving...') : (locale === 'fr' ? 'Enregistrer' : 'Save')}
            </button>
          </div>
        </form>
      </div>

      {/* Guide d'aide */}
      <div className='rounded-2xl border border-blue-200 bg-blue-50 p-6'>
        <h3 className='font-semibold text-blue-900 mb-3'>💡 Comment obtenir vos IDs ?</h3>
        <div className='space-y-3 text-sm text-blue-800'>
          <div>
            <strong>Facebook Pixel :</strong>
            <ol className='list-decimal list-inside ml-2 mt-1 space-y-1'>
              <li>Allez sur business.facebook.com</li>
              <li>Créez ou sélectionnez votre compte publicitaire</li>
              <li>Allez dans "Gestionnaire d'événements" → "Sources de données"</li>
              <li>Créez un nouveau Pixel et copiez l'ID (format: 15 chiffres)</li>
            </ol>
          </div>
          <div>
            <strong>Google Analytics :</strong>
            <ol className='list-decimal list-inside ml-2 mt-1 space-y-1'>
              <li>Allez sur analytics.google.com</li>
              <li>Créez ou sélectionnez une propriété GA4</li>
              <li>Allez dans "Administration" → "Flux de données"</li>
              <li>Copiez l'ID de mesure (format: G-XXXXXXXXXX)</li>
            </ol>
          </div>
          <div>
            <strong>Google Tag Manager :</strong>
            <ol className='list-decimal list-inside ml-2 mt-1 space-y-1'>
              <li>Allez sur tagmanager.google.com</li>
              <li>Créez ou sélectionnez un conteneur</li>
              <li>Copiez l'ID du conteneur (format: GTM-XXXXXXX)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

