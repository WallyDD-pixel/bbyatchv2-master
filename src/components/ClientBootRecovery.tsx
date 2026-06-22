'use client';

import { useEffect } from 'react';

const CHUNK_RELOAD_KEY = '__bb_chunk_reload__';
const BUILD_ID_KEY = '__bb_build_id__';
const GATEWAY_RETRY_KEY = '__bb_gateway_retry__';

function isChunkLoadFailure(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes('chunkloaderror') ||
    m.includes('loading chunk') ||
    m.includes('failed to fetch dynamically imported module') ||
    m.includes('failed to load') ||
    m.includes('importing a module script failed')
  );
}

function isNextStaticAsset(url: string) {
  return url.includes('/_next/static/');
}

function hardReloadWithCacheBust() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_bb', String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

function reloadOnceForStaleAssets() {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    hardReloadWithCacheBust();
  } catch {
    window.location.reload();
  }
}

async function verifyAppAlive() {
  try {
    const res = await fetch('/api/health', {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!res.ok) {
      reloadOnceForStaleAssets();
    }
  } catch {
    reloadOnceForStaleAssets();
  }
}

/**
 * Récupération automatique : cache obsolète, chunks manquants, 502 en cache, bfcache.
 */
export function ClientBootRecovery() {
  useEffect(() => {
    // Nouveau déploiement détecté via meta build-id
    try {
      const meta = document.querySelector('meta[name="bb-build-id"]');
      const buildId = meta?.getAttribute('content') || '';
      if (buildId) {
        const prev = sessionStorage.getItem(BUILD_ID_KEY);
        if (prev && prev !== buildId) {
          sessionStorage.removeItem(CHUNK_RELOAD_KEY);
          sessionStorage.removeItem(GATEWAY_RETRY_KEY);
          sessionStorage.setItem(BUILD_ID_KEY, buildId);
          hardReloadWithCacheBust();
          return;
        }
        sessionStorage.setItem(BUILD_ID_KEY, buildId);
      }
    } catch {
      /* ignore */
    }

    const onError = (event: ErrorEvent) => {
      if (event.message && isChunkLoadFailure(event.message)) {
        event.preventDefault();
        reloadOnceForStaleAssets();
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target instanceof HTMLScriptElement) {
        const src = target.src || '';
        if (isNextStaticAsset(src)) {
          event.preventDefault();
          reloadOnceForStaleAssets();
        }
      }
      if (target instanceof HTMLLinkElement && target.rel === 'stylesheet') {
        const href = target.href || '';
        if (isNextStaticAsset(href)) {
          event.preventDefault();
          reloadOnceForStaleAssets();
        }
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

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void verifyAppAlive();
      }
    };

    const onOnline = () => {
      void verifyAppAlive();
    };

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', onOnline);

    // Si la page actuelle est une erreur gateway nginx en cache
    if (document.title.toLowerCase().includes('502') || document.title.toLowerCase().includes('bad gateway')) {
      reloadOnceForStaleAssets();
    }

    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return null;
}
