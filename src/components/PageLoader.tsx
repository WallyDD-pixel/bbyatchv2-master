"use client";

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function PageLoader() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Démarrer le chargement lors du changement de route
    setLoading(true);

    // Arrêter le chargement après un court délai (pour éviter les flashs trop rapides)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [pathname, searchParams]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white/90 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-[var(--primary)]/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-[var(--primary)] rounded-full animate-spin"></div>
        </div>
        <p className="text-sm text-black/70 font-medium animate-pulse">Chargement...</p>
      </div>
    </div>
  );
}
