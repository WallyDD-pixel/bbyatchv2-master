import Footer from './Footer';
import { type Locale } from '@/i18n/messages';

export default async function FooterWrapper({ locale, t }: { locale: Locale; t: Record<string, string> }) {
  return <Footer locale={locale} t={t} />;
}

