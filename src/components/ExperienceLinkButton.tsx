"use client";
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Props {
  href: string;
  locale: 'fr' | 'en';
  className?: string;
}

export default function ExperienceLinkButton({ href, locale, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  // Réinitialiser le chargement quand la route change
  useEffect(() => {
    if (isLoading && pathname === href) {
      setIsLoading(false);
    }
  }, [pathname, href, isLoading]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    router.push(href);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 h-9 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[11px] sm:text-xs font-semibold shadow-sm hover:shadow transition-colors ${isLoading ? 'opacity-70 cursor-wait' : ''} ${className || ''}`}
      style={{ backgroundColor: isLoading ? '#60a5fa' : '#2563eb' }}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{locale === 'fr' ? 'Chargement...' : 'Loading...'}</span>
        </>
      ) : (
        <>
          {locale === 'fr' ? 'Voir expérience' : 'View experience'} <span className="translate-y-[1px]">→</span>
        </>
      )}
    </a>
  );
}

