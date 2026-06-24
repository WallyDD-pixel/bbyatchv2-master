import type { Metadata } from 'next';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import CheckoutSuccessSessionSync from '@/app/checkout/success/CheckoutSuccessSessionSync';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Merci | BB YACHTS',
  robots: { index: false, follow: false },
};

type ThankYouType = 'contact' | 'deposit';

function resolveType(raw?: string): ThankYouType {
  return raw === 'deposit' ? 'deposit' : 'contact';
}

export default async function MerciPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string; type?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const type = resolveType(sp?.type);
  const t = messages[locale];

  const title = type === 'deposit' ? t.thank_you_deposit_title : t.thank_you_contact_title;
  const subtitle = type === 'deposit' ? t.thank_you_deposit_subtitle : t.thank_you_contact_subtitle;

  const langQs = locale === 'en' ? '?lang=en' : '';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-[#f3f6f9]">
      {type === 'deposit' && <CheckoutSuccessSessionSync />}
      <HeaderBar initialLocale={locale} />
      <main
        className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-10 py-14"
        data-conversion-type={type}
      >
        <div className="text-center mb-10">
          <div className="mx-auto mb-6 h-16 w-16 rounded-full flex items-center justify-center shadow-md border bg-emerald-50 border-emerald-200">
            <svg
              className="h-8 w-8 text-emerald-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">{title}</h1>
          <p className="text-sm sm:text-base text-black/60 max-w-xl mx-auto">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6 sm:p-8 shadow-sm text-center">
          <p className="text-sm text-black/60 mb-6">{t.thank_you_next_steps}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={locale === 'en' ? '/?lang=en' : '/'}
              className="inline-flex items-center h-11 px-6 rounded-full border border-black/15 bg-white text-sm font-medium hover:bg-black/5"
            >
              {t.thank_you_back_home}
            </Link>
            {type === 'deposit' && (
              <Link
                href="/dashboard"
                className="inline-flex items-center h-11 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              >
                {t.checkout_success_go_dashboard}
              </Link>
            )}
            {type === 'contact' && (
              <Link
                href={`/contact${langQs}`}
                className="inline-flex items-center h-11 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              >
                {t.nav_contact}
              </Link>
            )}
          </div>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
