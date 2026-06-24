export type ThankYouType = 'contact' | 'deposit';

export function thankYouPath(type: ThankYouType, locale?: string): string {
  const params = new URLSearchParams({ type });
  if (locale === 'en') params.set('lang', 'en');
  return `/merci?${params.toString()}`;
}
