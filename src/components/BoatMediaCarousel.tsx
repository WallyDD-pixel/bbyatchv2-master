"use client";
import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';

type MediaItem = {
  type: 'image' | 'video';
  url: string;
  embedUrl?: string; // Pour YouTube/Vimeo
};

// Fonction pour détecter le type de média et extraire l'URL d'embed si nécessaire
function parseMediaUrl(url: string): MediaItem {
  // YouTube
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return {
      type: 'video',
      url,
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`
    };
  }

  // Vimeo
  const vimeoRegex = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return {
      type: 'video',
      url,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`
    };
  }

  // Fichier vidéo direct (.mp4, .webm, etc.)
  // Vérifier l'extension dans l'URL (même avec paramètres de requête)
  const videoExtensions = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;
  if (videoExtensions.test(url)) {
    return { type: 'video', url };
  }
  
  // Vérifier aussi si l'URL contient des chemins de vidéos Supabase
  if (url.includes('/videos/') || url.includes('/boats/videos/')) {
    return { type: 'video', url };
  }
  
  // Vérifier le type MIME si présent dans l'URL
  if (url.includes('video/mp4') || url.includes('video/webm') || url.includes('video/ogg')) {
    return { type: 'video', url };
  }

  // Sinon, c'est une image
  return { type: 'image', url };
}

interface Props {
  images: string[];
  videos?: string[];
}

export default function BoatMediaCarousel({ images, videos = [] }: Props) {
  // Logs de débogage
  console.log('🎬 BoatMediaCarousel - Images reçues:', images.length);
  console.log('🎬 BoatMediaCarousel - Vidéos reçues:', videos.length, videos);
  
  // Parser tous les médias
  const allMedia: MediaItem[] = [
    ...images.map(url => ({ type: 'image' as const, url })),
    ...videos.map(url => {
      const parsed = parseMediaUrl(url);
      console.log('🎬 Parsing vidéo:', { url, parsed });
      return parsed;
    })
  ].filter(m => m.url);
  
  console.log('🎬 Médias finaux:', allMedia.length, allMedia.map(m => ({ type: m.type, url: m.url.substring(0, 50) + '...' })));

  const [index, setIndex] = useState(0);
  const autoRef = useRef<NodeJS.Timeout | null>(null);

  const go = useCallback((dir: number) => {
    setIndex(i => ((i + dir + allMedia.length) % allMedia.length));
  }, [allMedia.length]);

  useEffect(() => {
    if (allMedia.length <= 1) return;
    autoRef.current && clearInterval(autoRef.current);
    autoRef.current = setInterval(() => {
      setIndex(i => ((i + 1) % allMedia.length));
    }, 6000);
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
  }, [allMedia.length]);

  if (allMedia.length === 0) {
    return (
      <div className="relative aspect-[16/9] w-full rounded-2xl bg-black/5 flex items-center justify-center text-sm text-black/40">
        Aucun média
      </div>
    );
  }

  const currentMedia = allMedia[index];

  return (
    <div className="relative w-full">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-black/5">
        {allMedia.map((media, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {media.type === 'image' ? (
              <Image
                src={media.url}
                alt={`Média ${i + 1}`}
                fill
                className="object-cover"
                priority={i === 0}
                loading={i === 0 ? "eager" : "lazy"}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                unoptimized={media.url.startsWith('/uploads/')}
                onError={(e) => {
                  // Fallback si l'image ne charge pas
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : media.embedUrl ? (
              // Vidéo YouTube/Vimeo embed
              <div className="w-full h-full flex flex-col">
                <iframe
                  src={media.embedUrl}
                  className="w-full flex-1 min-h-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`Vidéo ${i + 1}`}
                />
                <a
                  href={media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/80 hover:text-white bg-black/30 px-2 py-1 text-center"
                >
                  Si la vidéo ne s&apos;affiche pas, ouvrir sur YouTube/Vimeo →
                </a>
              </div>
            ) : (
              // Vidéo fichier direct
              <video
                key={media.url} // Force re-render si l'URL change
                src={media.url}
                className="w-full h-full object-cover"
                controls
                playsInline
                preload="auto"
                crossOrigin="anonymous"
                onError={(e) => {
                  const target = e.target as HTMLVideoElement;
                  const error = target.error;
                  console.error('❌ Erreur de chargement vidéo:', {
                    url: media.url,
                    errorCode: error?.code,
                    errorMessage: error?.message,
                    networkState: target.networkState,
                    readyState: target.readyState
                  });
                  // Afficher un message d'erreur au lieu de cacher
                  target.style.backgroundColor = '#000';
                }}
                onLoadStart={() => {
                  console.log('✅ Début du chargement vidéo:', media.url);
                }}
                onLoadedMetadata={(e) => {
                  const target = e.target as HTMLVideoElement;
                  console.log('✅ Métadonnées vidéo chargées:', {
                    url: media.url,
                    duration: target.duration,
                    videoWidth: target.videoWidth,
                    videoHeight: target.videoHeight
                  });
                }}
                onCanPlay={() => {
                  console.log('✅ Vidéo prête à être lue:', media.url);
                }}
                onStalled={() => {
                  console.warn('⚠️ Chargement vidéo bloqué:', media.url);
                }}
                onSuspend={() => {
                  console.warn('⚠️ Chargement vidéo suspendu:', media.url);
                }}
              />
            )}
          </div>
        ))}
        {allMedia.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center text-lg hover:bg-black/55 transition-colors z-10"
              aria-label="Précédent"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center text-lg hover:bg-black/55 transition-colors z-10"
              aria-label="Suivant"
            >
              ›
            </button>
          </>
        )}
        {allMedia.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {allMedia.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-2.5 w-2.5 rounded-full border border-white/70 transition ${
                  i === index
                    ? 'bg-white'
                    : 'bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Aller au média ${i + 1}`}
              />
            ))}
          </div>
        )}
        {/* Badge pour indiquer le type de média */}
        {currentMedia.type === 'video' && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/40 backdrop-blur text-white text-[10px] font-semibold flex items-center gap-1 z-10">
            <span>▶</span>
            <span>Vidéo</span>
          </div>
        )}
      </div>
      {/* Miniatures en dessous */}
      {allMedia.length > 1 && (
        <div className="mt-4 grid grid-cols-6 sm:grid-cols-8 gap-2">
          {allMedia.map((media, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                i === index
                  ? 'border-[color:var(--primary)] scale-105'
                  : 'border-transparent hover:border-black/20'
              }`}
            >
              {media.type === 'image' ? (
                <Image
                  src={media.url}
                  alt={`Miniature ${i + 1}`}
                  fill
                  className="object-cover"
                  unoptimized={media.url.startsWith('/uploads/')}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-black/10 flex items-center justify-center">
                  <span className="text-2xl">▶</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

