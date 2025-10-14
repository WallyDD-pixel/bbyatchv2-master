"use client";
import { useEffect } from 'react';

// Force le thème clair (désactive toute préférence dark sauvegardée)
export function ForceLight() {
  useEffect(() => {
    try {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme','light');
    } catch {}
  }, []);
  return null;
}
