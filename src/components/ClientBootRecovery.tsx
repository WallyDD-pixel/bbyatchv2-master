'use client';

import { useEffect } from 'react';

const CHUNK_RELOAD_KEY = '__bb_chunk_reload__';

function isChunkLoadFailure(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes('chunkloaderror') ||
    m.includes('loading chunk') ||
    m.includes('failed to fetch dynamically imported module')
  );
}

function reloadOnceForStaleAssets() {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    window.location.reload();
  } catch {
    window.location.reload();
  }
}

/**
 * Récupération automatique quand le cache navigateur sert une ancienne version
 * (évite de demander à l'utilisateur de vider le cache manuellement).
 */
export function ClientBootRecovery() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (event.message && isChunkLoadFailure(event.message)) {
        event.preventDefault();
        reloadOnceForStaleAssets();
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === 'string'
          ? reason
          : reason?.message
            ? String(reason.message)
            : '';
      if (message && isChunkLoadFailure(message)) {
        event.preventDefault();
        reloadOnceForStaleAssets();
      }
    };

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
