"use client";
import { useEffect } from 'react';

// Force le thème clair (désactive toute préférence dark sauvegardée)
export function ForceLight() {
  useEffect(() => {
    try {
      const root = document.documentElement;
      root.classList.remove('dark');
      root.style.colorScheme = 'light only';
      localStorage.setItem('theme', 'light');
    } catch {}
  }, []);
  return null;
}
