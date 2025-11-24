"use client";
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { messages, type Locale } from '@/i18n/messages';

export default function ContactForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale: Locale = (searchParams.get('lang') as Locale) || 'fr';
  const sent = searchParams.get('sent') === '1';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(sent);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sent) {
      setSubmitted(true);
    }
  }, [sent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('message', message);
      if (phone) formData.append('phone', phone);
      formData.append('locale', locale);

      const response = await fetch('/api/contact-message', {
        method: 'POST',
        body: formData,
      });

      if (response.ok || response.redirected) {
        setSubmitted(true);
        setName('');
        setEmail('');
        setPhone('');
        setMessage('');
        // Si redirection, la page se rechargera avec ?sent=1
        if (response.redirected) {
          router.push(`/contact?sent=1${locale === 'en' ? '&lang=en' : ''}`);
        }
      } else {
        const data = await response.json();
        setError(data.error === 'missing_fields' 
          ? (locale === 'fr' ? 'Veuillez remplir tous les champs obligatoires.' : 'Please fill in all required fields.')
          : (locale === 'fr' ? 'Une erreur est survenue. Veuillez réessayer.' : 'An error occurred. Please try again.')
        );
      }
    } catch (err) {
      setError(locale === 'fr' ? 'Une erreur est survenue. Veuillez réessayer.' : 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='bg-white rounded-2xl border border-black/10 p-6 sm:p-8 shadow-sm'>
      <h2 className='text-xl font-semibold mb-6'>
        {locale === 'fr' ? 'Envoyez-nous un message' : 'Send us a message'}
      </h2>

      {submitted && (
        <div className='mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm'>
          {locale === 'fr' 
            ? '✅ Votre message a été envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.'
            : '✅ Your message has been sent successfully! We will get back to you as soon as possible.'}
        </div>
      )}

      {error && (
        <div className='mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm'>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='block text-sm font-medium mb-1 text-black/70'>
            {locale === 'fr' ? 'Nom complet *' : 'Full name *'}
          </label>
          <input
            type='text'
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='w-full h-11 px-4 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30'
            placeholder={locale === 'fr' ? 'Votre nom' : 'Your name'}
          />
        </div>

        <div>
          <label className='block text-sm font-medium mb-1 text-black/70'>
            Email *
          </label>
          <input
            type='email'
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='w-full h-11 px-4 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30'
            placeholder='email@example.com'
          />
        </div>

        <div>
          <label className='block text-sm font-medium mb-1 text-black/70'>
            {locale === 'fr' ? 'Téléphone (optionnel)' : 'Phone (optional)'}
          </label>
          <input
            type='tel'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className='w-full h-11 px-4 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30'
            placeholder={locale === 'fr' ? '+33 6 12 34 56 78' : '+1 234 567 8900'}
          />
        </div>

        <div>
          <label className='block text-sm font-medium mb-1 text-black/70'>
            {locale === 'fr' ? 'Message *' : 'Message *'}
          </label>
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className='w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30'
            placeholder={locale === 'fr' ? 'Votre message...' : 'Your message...'}
          />
        </div>

        <button
          type='submit'
          disabled={submitting}
          className='w-full h-12 rounded-full bg-[var(--primary)] text-white font-semibold hover:brightness-110 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {submitting 
            ? (locale === 'fr' ? 'Envoi en cours...' : 'Sending...')
            : (locale === 'fr' ? 'Envoyer le message' : 'Send message')}
        </button>
      </form>
    </div>
  );
}

