import { Metadata } from 'next';

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  locale?: 'fr' | 'en';
}

export function generateMetadata({
  title = 'BB SERVICES CHARTER - Location de yachts sur la Côte d\'Azur',
  description = 'Réservez votre yacht de luxe pour une expérience inoubliable sur la Côte d\'Azur et la Riviera italienne. Location de bateaux avec skipper professionnel.',
  image,
  url,
  locale = 'fr',
}: MetaTagsProps): Metadata {
  const siteUrl = url || (process.env.NEXT_PUBLIC_SITE_URL || 'https://bbservicescharter.com');
  const ogImage = image || `${siteUrl}/og-image.jpg`;
  const fullTitle = title.includes('BB SERVICES') ? title : `${title} | BB SERVICES CHARTER`;

  return {
    title: fullTitle,
    description,
    keywords: locale === 'fr' 
      ? 'location yacht, location bateau, côte d\'azur, riviera italienne, skipper professionnel, croisière, charter yacht'
      : 'yacht rental, boat rental, french riviera, italian riviera, professional skipper, cruise, yacht charter',
    authors: [{ name: 'BB SERVICES CHARTER' }],
    creator: 'BB SERVICES CHARTER',
    publisher: 'BB SERVICES CHARTER',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: url || '/',
      languages: {
        'fr-FR': '/',
        'en-US': '/?lang=en',
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url: url || siteUrl,
      siteName: 'BB SERVICES CHARTER',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      // Ajoutez vos codes de vérification ici si nécessaire
      // google: 'votre-code-google',
      // yandex: 'votre-code-yandex',
      // yahoo: 'votre-code-yahoo',
    },
  };
}




